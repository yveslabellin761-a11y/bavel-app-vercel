import * as tf from '@tensorflow/tfjs';
import { NSFWJS, type PredictionType } from 'nsfwjs/core';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BoundedSerialQueue, QueueCapacityError } from './boundedSerialQueue';

export type ImageModerationMode = 'profile' | 'chat';
export type ImageModelState = 'not-loaded' | 'loading' | 'ready' | 'error';

export interface LocalImageModerationResult {
  isSafe: boolean;
  blurRequired: boolean;
  isPrivateContent: boolean;
  categories: string[];
  scores: Record<string, number>;
  model: 'nsfwjs-mobilenet-v2';
  processedLocally: true;
  message: string;
}

export class ImageModerationError extends Error {
  constructor(message: string, readonly status: 400 | 413 | 415 | 503, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ImageModerationError';
  }
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_IMAGE_DIMENSION = 4096;
const EXPLICIT_BLOCK_THRESHOLD = 0.5;
const PROFILE_EXPLICIT_THRESHOLD = 0.35;
const PRIVATE_BLUR_THRESHOLD = 0.3;
const SUGGESTIVE_BLUR_THRESHOLD = 0.65;
const MODEL_RELATIVE_PATH = path.join('models', 'nsfwjs', 'mobilenet_v2');

let modelPromise: Promise<NSFWJS> | null = null;
let modelState: ImageModelState = 'not-loaded';
const inferenceQueue = new BoundedSerialQueue(5);
let backendPromise: Promise<void> | null = null;

export function getImageModelState(): ImageModelState {
  return modelState;
}

function modelDirectory(): string {
  const candidates = [
    path.join(process.cwd(), 'public', MODEL_RELATIVE_PATH),
    path.join(process.cwd(), 'dist', MODEL_RELATIVE_PATH),
  ];
  const directory = candidates.find((candidate) => existsSync(path.join(candidate, 'model.json')));
  if (!directory) {
    throw new ImageModerationError('Les fichiers du modèle local de modération sont introuvables.', 503);
  }
  return directory;
}

async function ensureCpuBackend(): Promise<void> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (tf.getBackend() !== 'cpu') {
        const selected = await tf.setBackend('cpu');
        if (!selected) throw new Error('Le backend CPU TensorFlow.js n’a pas pu être activé.');
      }
      await tf.ready();
    })().catch((error: unknown) => {
      backendPromise = null;
      throw error;
    });
  }
  return backendPromise;
}

async function loadModel(): Promise<NSFWJS> {
  if (!modelPromise) {
    modelState = 'loading';
    modelPromise = (async () => {
      await ensureCpuBackend();
      const directory = modelDirectory();
      const modelJson = JSON.parse(await readFile(path.join(directory, 'model.json'), 'utf8')) as tf.io.ModelJSON;
      if (!modelJson.modelTopology || !Array.isArray(modelJson.weightsManifest) || !modelJson.weightsManifest.length) {
        throw new Error('Le manifeste du modèle local est invalide.');
      }

      const weightSpecs = modelJson.weightsManifest.flatMap((group) => group.weights);
      const shardPaths = modelJson.weightsManifest.flatMap((group) => group.paths);
      if (
        shardPaths.length === 0 ||
        shardPaths.some((shardPath) => path.basename(shardPath) !== shardPath || !/^group\d+-shard\d+of\d+$/.test(shardPath))
      ) {
        throw new Error('Les références aux poids du modèle local sont invalides.');
      }
      const shards = await Promise.all(shardPaths.map((shardPath) => readFile(path.join(directory, shardPath))));
      const weightData = new Uint8Array(shards.reduce((size, shard) => size + shard.byteLength, 0));
      let offset = 0;
      for (const shard of shards) {
        weightData.set(shard, offset);
        offset += shard.byteLength;
      }

      const handler = tf.io.fromMemory({
        modelTopology: modelJson.modelTopology,
        weightSpecs,
        weightData: weightData.buffer,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy,
      });
      const model = new NSFWJS(handler, { size: 224, type: 'layers' });
      await model.load();
      modelState = 'ready';
      return model;
    })().catch((error: unknown) => {
      modelState = 'error';
      modelPromise = null;
      throw new ImageModerationError(
        'Le modèle local de modération des images n’a pas pu être chargé.',
        503,
        { cause: error }
      );
    });
  }
  return modelPromise;
}

function decodeImageDataUrl(dataUrl: unknown): { mimeType: string; buffer: Buffer } {
  if (typeof dataUrl !== 'string') {
    throw new ImageModerationError('Aucune image valide fournie.', 400);
  }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z\d+/]+={0,2})$/i.exec(dataUrl);
  if (!match) {
    throw new ImageModerationError('Format invalide : utilisez une image JPEG, PNG ou WebP.', 415);
  }

  const encoded = match[2];
  const estimatedBytes = Math.floor((encoded.length * 3) / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
  if (estimatedBytes <= 0) throw new ImageModerationError('Les données de l’image sont invalides.', 400);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    throw new ImageModerationError('L’image dépasse la taille maximale autorisée de 10 Mo.', 413);
  }

  const buffer = Buffer.from(encoded, 'base64');
  if (
    buffer.byteLength !== estimatedBytes ||
    buffer.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')
  ) {
    throw new ImageModerationError('Les données de l’image sont invalides.', 400);
  }
  return { mimeType: match[1].toLowerCase(), buffer };
}

function verifyImageFormat(mimeType: string, format: string | undefined): void {
  const formatMatchesMime =
    (mimeType === 'image/jpeg' && format === 'jpeg') ||
    (mimeType === 'image/png' && format === 'png') ||
    (mimeType === 'image/webp' && format === 'webp');
  if (!formatMatchesMime) {
    throw new ImageModerationError('Le type déclaré ne correspond pas au contenu de l’image.', 415);
  }
}

export async function normalizeImageForPrivateStorage(dataUrl: unknown): Promise<Buffer> {
  const { mimeType, buffer } = decodeImageDataUrl(dataUrl);
  const metadata = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
    .metadata()
    .catch((error: unknown) => {
      throw new ImageModerationError('Le fichier ne contient pas une image valide.', 400, { cause: error });
    });
  verifyImageFormat(mimeType, metadata.format);
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new ImageModerationError('Les dimensions de l’image dépassent les limites de sécurité.', 413);
  }

  const normalized = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')
    .webp({ quality: 82 })
    .toBuffer()
    .catch((error: unknown) => {
      throw new ImageModerationError('L’image n’a pas pu être préparée pour le stockage.', 400, { cause: error });
    });
  if (normalized.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageModerationError('L’image optimisée dépasse la taille de stockage autorisée.', 413);
  }
  return normalized;
}

export function evaluateImagePredictions(
  predictions: Pick<PredictionType, 'className' | 'probability'>[],
  mode: ImageModerationMode
): LocalImageModerationResult {
  const scores = Object.fromEntries(
    predictions.map(({ className, probability }) => [className, probability])
  );
  const pornScore = scores.Porn ?? 0;
  const hentaiScore = scores.Hentai ?? 0;
  const sexyScore = scores.Sexy ?? 0;
  const explicitScore = Math.max(pornScore, hentaiScore);
  const isSafe = explicitScore < (mode === 'profile' ? PROFILE_EXPLICIT_THRESHOLD : EXPLICIT_BLOCK_THRESHOLD);
  const blurRequired =
    mode === 'chat' && (explicitScore >= PRIVATE_BLUR_THRESHOLD || sexyScore >= SUGGESTIVE_BLUR_THRESHOLD);

  return {
    isSafe,
    blurRequired,
    isPrivateContent: blurRequired,
    categories: predictions
      .filter(({ className, probability }) =>
        (className === 'Porn' || className === 'Hentai') && probability >= PRIVATE_BLUR_THRESHOLD
          ? true
          : className === 'Sexy' && probability >= SUGGESTIVE_BLUR_THRESHOLD
      )
      .map(({ className }) => className),
    scores,
    model: 'nsfwjs-mobilenet-v2',
    processedLocally: true,
    message: isSafe
      ? blurRequired
        ? 'Image potentiellement sensible : elle sera masquée par précaution.'
        : 'Aucun contenu explicite détecté.'
      : 'Un contenu explicite a été détecté. Cette image ne peut pas être utilisée.',
  };
}

async function moderateImage(dataUrl: unknown, mode: ImageModerationMode): Promise<LocalImageModerationResult> {
  const { mimeType, buffer } = decodeImageDataUrl(dataUrl);
  const metadata = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
    .metadata()
    .catch((error: unknown) => {
      throw new ImageModerationError('Le fichier ne contient pas une image valide.', 400, { cause: error });
    });
  verifyImageFormat(mimeType, metadata.format);
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new ImageModerationError('Les dimensions de l’image dépassent les limites de sécurité.', 413);
  }

  const pixels = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .resize(224, 224, { fit: 'fill' })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch((error: unknown) => {
      throw new ImageModerationError('L’image n’a pas pu être décodée.', 400, { cause: error });
    });
  if (pixels.info.channels !== 3 || pixels.data.byteLength !== 224 * 224 * 3) {
    throw new ImageModerationError('L’image ne peut pas être préparée pour le contrôle.', 400);
  }

  const model = await loadModel();
  const input = tf.tensor3d(new Int32Array(pixels.data), [224, 224, 3], 'int32');
  try {
    const predictions = await model.classify(input);
    return evaluateImagePredictions(predictions, mode);
  } catch (error) {
    throw new ImageModerationError('Le contrôle local de l’image a échoué.', 503, { cause: error });
  } finally {
    input.dispose();
  }
}

export function moderateImageLocally(
  dataUrl: unknown,
  mode: ImageModerationMode
): Promise<LocalImageModerationResult> {
  try {
    return inferenceQueue.enqueue(() => moderateImage(dataUrl, mode));
  } catch (error) {
    if (error instanceof QueueCapacityError) {
      return Promise.reject(
        new ImageModerationError(
          'Le service de modération est momentanément saturé. Réessayez dans quelques instants.',
          503,
          { cause: error }
        )
      );
    }
    throw error;
  }
}
