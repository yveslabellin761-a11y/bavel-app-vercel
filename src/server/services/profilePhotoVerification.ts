import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfilePhotoStoragePath, PROFILE_PHOTOS_BUCKET } from '../../lib/profilePhotoUrls';

export type ProfilePhotoChallenge = 'blink' | 'turn_left' | 'turn_right';
export type ProfilePhotoVerificationStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';

export interface VerificationFaceEvidence {
  faceCount: number;
  faceScore: number;
  realScore: number;
  liveScore: number;
  gestures: string[];
  embedding?: number[];
}

export interface ProfilePhotoVerificationResult {
  approved: boolean;
  reason: 'approved' | 'face_not_found' | 'face_quality' | 'liveness' | 'challenge' | 'profile_mismatch';
  similarity?: number;
}

export class ProfilePhotoVerificationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 410 | 413 | 429 | 503,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ProfilePhotoVerificationError';
  }
}

const MAX_FRAME_BYTES = 512 * 1024;
const MAX_REFERENCE_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 12_000_000;
const MAX_SOURCE_IMAGE_DIMENSION = 4096;
const MAX_ANALYSIS_DIMENSION = 1024;
const FRAME_COUNT = 5;
const MIN_FACE_SCORE = 0.6;
const MIN_REAL_SCORE = 0.6;
const MIN_LIVE_SCORE = 0.6;
const MIN_FACE_SIMILARITY = 0.5;
const MODEL_FILES = new Set([
  'antispoof.bin',
  'antispoof.json',
  'blazeface.bin',
  'blazeface.json',
  'facemesh.bin',
  'facemesh.json',
  'faceres.bin',
  'faceres.json',
  'liveness.bin',
  'liveness.json'
]);

interface HumanFace {
  faceScore: number;
  real?: number;
  live?: number;
  embedding?: number[];
  tensor?: { dispose(): void };
}

interface HumanRuntime {
  tf: {
    ready(): Promise<void>;
    tensor3d(data: Uint8Array, shape: [number, number, 3]): { dispose(): void };
    expandDims(tensor: { dispose(): void }, axis: number): { dispose(): void };
    cast(tensor: { dispose(): void }, dtype: 'float32'): { dispose(): void };
    dispose(tensors: Array<{ dispose(): void }>): void;
  };
  load(): Promise<unknown>;
  detect(input: { dispose(): void }): Promise<{
    face: Array<{
      faceScore: number;
      real?: number;
      live?: number;
      embedding?: number[];
      tensor?: { dispose(): void };
    }>;
    gesture: Array<{ gesture: string }>;
  }>;
  match: {
    find(
      descriptor: number[],
      descriptors: number[][],
      options: { order: number; multiplier: number; min: number; max: number }
    ): { similarity: number };
  };
}

interface ProfilePhotoHumanModule {
  Human: new (config: Record<string, unknown>) => HumanRuntime;
}

let humanPromise: Promise<HumanRuntime> | null = null;
let analysisQueue = Promise.resolve();
let queuedAnalyses = 0;

function decodeImageDataUrl(value: unknown): Buffer {
  if (typeof value !== 'string') {
    throw new ProfilePhotoVerificationError('Une image de vérification est manquante.', 400);
  }
  const match = /^data:image\/(jpeg|png|webp);base64,([a-z\d+/]+={0,2})$/i.exec(value);
  if (!match) {
    throw new ProfilePhotoVerificationError('Format d’image invalide. Utilisez une image JPEG, PNG ou WebP.', 400);
  }

  const encoded = match[2];
  const estimatedBytes =
    Math.floor((encoded.length * 3) / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
  if (estimatedBytes <= 0) {
    throw new ProfilePhotoVerificationError('Les données de l’image sont invalides.', 400);
  }
  if (estimatedBytes > MAX_FRAME_BYTES) {
    throw new ProfilePhotoVerificationError('Chaque image doit faire moins de 512 Ko.', 413);
  }

  const buffer = Buffer.from(encoded, 'base64');
  if (
    buffer.byteLength !== estimatedBytes ||
    buffer.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')
  ) {
    throw new ProfilePhotoVerificationError('Les données de l’image sont invalides.', 400);
  }
  return buffer;
}

function createModelFileServer(modelDirectory: string): Server {
  return createServer(async (request, response) => {
    const fileName = path.basename(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    if (request.method !== 'GET' || !MODEL_FILES.has(fileName)) {
      response.writeHead(404).end();
      return;
    }

    try {
      const data = await readFile(path.join(modelDirectory, fileName));
      response.writeHead(200, {
        'Content-Type': fileName.endsWith('.json') ? 'application/json' : 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      response.end(data);
    } catch (error) {
      console.error('Profile photo verification model file could not be read:', error);
      response.writeHead(503).end();
    }
  });
}

async function listenOnLoopback(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new ProfilePhotoVerificationError('Le moteur de vérification ne peut pas démarrer.', 503);
  }
  return address.port;
}

async function loadHuman(): Promise<HumanRuntime> {
  if (!humanPromise) {
    humanPromise = (async () => {
      const runtimeRequire = createRequire(path.join(process.cwd(), 'server.ts'));
      const humanEntry = runtimeRequire.resolve('@vladmandic/human');
      const humanDirectory = path.dirname(humanEntry);
      const modelDirectory = path.join(path.dirname(humanDirectory), 'models');
      const wasmDirectory = path.dirname(runtimeRequire.resolve('@tensorflow/tfjs-backend-wasm'));
      const modelServer = createModelFileServer(modelDirectory);

      try {
        const port = await listenOnLoopback(modelServer);
        const { Human } = runtimeRequire(path.join(humanDirectory, 'human.node-wasm.js')) as ProfilePhotoHumanModule;
        const human = new Human({
          backend: 'wasm',
          wasmPath: `${wasmDirectory}${path.sep}`,
          modelBasePath: `http://127.0.0.1:${port}/`,
          debug: false,
          async: false,
          face: {
            enabled: true,
            detector: { enabled: true, minConfidence: 0.7 },
            mesh: { enabled: true },
            description: { enabled: true },
            antispoof: { enabled: true },
            liveness: { enabled: true },
            iris: { enabled: false },
            emotion: { enabled: false }
          },
          gesture: { enabled: true },
          body: { enabled: false },
          hand: { enabled: false },
          object: { enabled: false }
        });
        await human.tf.ready();
        await human.load();
        return human;
      } finally {
        if (modelServer.listening) {
          await new Promise<void>((resolve) => modelServer.close(() => resolve()));
        }
      }
    })().catch((error: unknown) => {
      humanPromise = null;
      console.error('Profile photo verification models could not be initialized:', error);
      throw new ProfilePhotoVerificationError('Le moteur de vérification est temporairement indisponible.', 503, {
        cause: error
      });
    });
  }
  return humanPromise;
}

async function analyzeImage(human: HumanRuntime, buffer: Buffer): Promise<VerificationFaceEvidence> {
  let input: { dispose(): void } | null = null;
  let decodedPixels: Buffer | null = null;
  let faceTensors: Array<{ dispose(): void }> = [];
  let runtimeEmbeddings: number[][] = [];
  try {
    const metadata = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    if (
      !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_SOURCE_IMAGE_DIMENSION ||
      metadata.height > MAX_SOURCE_IMAGE_DIMENSION ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
      throw new ProfilePhotoVerificationError('Le fichier ne contient pas une image compatible.', 400);
    }
    const decoded = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
      .rotate()
      .toColourspace('srgb')
      .resize(MAX_ANALYSIS_DIMENSION, MAX_ANALYSIS_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    decodedPixels = decoded.data;
    if (
      !decoded.info.width ||
      !decoded.info.height ||
      decoded.info.width > MAX_ANALYSIS_DIMENSION ||
      decoded.info.height > MAX_ANALYSIS_DIMENSION ||
      decoded.info.channels !== 3
    ) {
      throw new ProfilePhotoVerificationError('Le fichier ne contient pas une image compatible.', 400);
    }

    const rgb = new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);
    const image = human.tf.tensor3d(rgb, [decoded.info.height, decoded.info.width, 3]);
    input = human.tf.cast(human.tf.expandDims(image, 0), 'float32');
    image.dispose();
    const result = await human.detect(input);
    faceTensors = result.face.flatMap((detectedFace) => (detectedFace.tensor ? [detectedFace.tensor] : []));
    runtimeEmbeddings = result.face.flatMap((detectedFace) => (detectedFace.embedding ? [detectedFace.embedding] : []));
    const face = result.face[0];
    return {
      faceCount: result.face.length,
      faceScore: face?.faceScore ?? 0,
      realScore: face?.real ?? 0,
      liveScore: face?.live ?? 0,
      gestures: result.gesture.map((gesture) => gesture.gesture),
      embedding: face?.embedding ? [...face.embedding] : undefined
    };
  } catch (error) {
    if (error instanceof ProfilePhotoVerificationError) throw error;
    throw new ProfilePhotoVerificationError('Une image n’a pas pu être analysée.', 400, { cause: error });
  } finally {
    if (faceTensors.length) human.tf.dispose(faceTensors);
    if (input) human.tf.dispose([input]);
    runtimeEmbeddings.forEach((embedding) => embedding.fill(0));
    decodedPixels?.fill(0);
    buffer.fill(0);
  }
}

export function evaluateProfilePhotoEvidence(
  challenge: ProfilePhotoChallenge,
  frames: VerificationFaceEvidence[],
  profileSimilarity: number
): ProfilePhotoVerificationResult {
  if (frames.length !== FRAME_COUNT || frames.some((frame) => frame.faceCount !== 1)) {
    return { approved: false, reason: 'face_not_found' };
  }
  if (
    frames.some(
      (frame) =>
        frame.faceScore < MIN_FACE_SCORE ||
        !Number.isFinite(frame.faceScore) ||
        !frame.embedding ||
        frame.embedding.length < 64 ||
        frame.embedding.some((value) => !Number.isFinite(value))
    )
  ) {
    return { approved: false, reason: 'face_quality' };
  }
  if (
    frames.some(
      (frame) =>
        frame.realScore < MIN_REAL_SCORE ||
        frame.liveScore < MIN_LIVE_SCORE ||
        !Number.isFinite(frame.realScore) ||
        !Number.isFinite(frame.liveScore)
    )
  ) {
    return { approved: false, reason: 'liveness' };
  }

  const gestures = frames.map((frame) => new Set(frame.gestures));
  const isBlink = (frameGestures: Set<string>) =>
    frameGestures.has('blink left eye') || frameGestures.has('blink right eye');
  const blinkIndex = gestures.findIndex(isBlink);
  const challengePassed =
    challenge === 'blink'
      ? blinkIndex > 0 &&
        blinkIndex < gestures.length - 1 &&
        !isBlink(gestures[blinkIndex - 1]) &&
        !isBlink(gestures[blinkIndex + 1])
      : gestures[0].has('facing center') &&
        gestures
          .slice(1, -1)
          .some((frameGestures) => frameGestures.has(challenge === 'turn_left' ? 'facing left' : 'facing right')) &&
        gestures[gestures.length - 1].has('facing center');
  if (!challengePassed) return { approved: false, reason: 'challenge' };
  if (!Number.isFinite(profileSimilarity) || profileSimilarity < MIN_FACE_SIMILARITY) {
    return { approved: false, reason: 'profile_mismatch', similarity: profileSimilarity };
  }
  return { approved: true, reason: 'approved', similarity: profileSimilarity };
}

async function withModel<T>(task: (human: HumanRuntime) => Promise<T>): Promise<T> {
  if (queuedAnalyses >= 4) {
    throw new ProfilePhotoVerificationError('Le service est occupé. Réessayez dans quelques instants.', 429);
  }
  queuedAnalyses += 1;
  const operation = analysisQueue.then(async () => task(await loadHuman()));
  analysisQueue = operation.then(
    () => undefined,
    () => undefined
  );
  try {
    return await operation;
  } finally {
    queuedAnalyses -= 1;
  }
}

export async function verifyProfilePhotos(
  db: SupabaseClient,
  userId: string,
  challenge: ProfilePhotoChallenge,
  imageDataUrls: unknown
): Promise<ProfilePhotoVerificationResult> {
  if (!Array.isArray(imageDataUrls) || imageDataUrls.length !== FRAME_COUNT) {
    throw new ProfilePhotoVerificationError(`La capture doit contenir exactement ${FRAME_COUNT} images.`, 400);
  }
  const frames = imageDataUrls.map(decodeImageDataUrl);

  return withModel(async (human) => {
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('photos,avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (profileError)
      throw new ProfilePhotoVerificationError('Impossible de charger le profil.', 503, { cause: profileError });
    if (!profile) throw new ProfilePhotoVerificationError('Profil introuvable.', 404);

    const references = [
      ...(Array.isArray(profile.photos) ? profile.photos : []),
      ...(typeof profile.avatar_url === 'string' ? [profile.avatar_url] : [])
    ].filter((reference): reference is string => typeof reference === 'string' && Boolean(reference));
    const photoPaths = [
      ...new Set(
        references
          .map(getProfilePhotoStoragePath)
          .filter((photoPath): photoPath is string => Boolean(photoPath) && photoPath.startsWith(`${userId}/`))
      )
    ].slice(0, 6);
    if (photoPaths.length === 0) {
      throw new ProfilePhotoVerificationError(
        'Ajoutez au moins une photo de profil enregistrée avant la vérification.',
        409
      );
    }

    const storage = db.storage.from(PROFILE_PHOTOS_BUCKET);
    const frameEvidence: VerificationFaceEvidence[] = [];
    const profileEmbeddings: number[][] = [];
    try {
      for (const frame of frames) frameEvidence.push(await analyzeImage(human, frame));
      const validEmbeddings = frameEvidence
        .filter((frame) => frame.faceCount === 1 && frame.embedding)
        .map((frame) => frame.embedding!);
      if (validEmbeddings.length === 0) {
        return evaluateProfilePhotoEvidence(challenge, frameEvidence, 0);
      }

      for (const photoPath of photoPaths) {
        const { data, error } = await storage.download(photoPath);
        if (error || !data) {
          throw new ProfilePhotoVerificationError(
            'Une photo de profil n’est pas accessible pour la comparaison.',
            503,
            { cause: error }
          );
        }
        if (data.size > MAX_REFERENCE_PHOTO_BYTES) continue;
        const storedPhoto = Buffer.from(await data.arrayBuffer());
        try {
          const reference = await analyzeImage(human, storedPhoto);
          if (reference.faceCount === 1 && reference.embedding?.length === validEmbeddings[0].length) {
            profileEmbeddings.push(reference.embedding);
          }
        } catch (error) {
          if (!(error instanceof ProfilePhotoVerificationError) || error.status !== 400) throw error;
          console.warn('A stored profile photo was skipped during face comparison:', error);
        }
      }
      const frameSimilarities = profileEmbeddings.length
        ? validEmbeddings.map((embedding) =>
            Math.max(
              ...profileEmbeddings.map(
                (profileEmbedding) =>
                  human.match.find(embedding, [profileEmbedding], {
                    order: 2,
                    multiplier: 25,
                    min: 0.2,
                    max: 0.8
                  }).similarity
              )
            )
          )
        : [];
      frameSimilarities.sort((first, second) => first - second);
      const similarity = frameSimilarities.length ? frameSimilarities[Math.floor(frameSimilarities.length / 2)] : 0;
      return evaluateProfilePhotoEvidence(challenge, frameEvidence, similarity);
    } finally {
      frameEvidence.forEach((frame) => frame.embedding?.fill(0));
      profileEmbeddings.forEach((embedding) => embedding.fill(0));
    }
  }).finally(() => frames.forEach((frame) => frame.fill(0)));
}

export function createVerificationNonceHash(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}
