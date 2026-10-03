import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ChevronLeft, LoaderCircle, Shield, X } from 'lucide-react';
import { authFetch } from '../../lib/authFetch';

type VerificationStatus = 'not_started' | 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';
type Challenge = {
  challengeId: string;
  nonce: string;
  challenge: 'blink' | 'turn_left' | 'turn_right';
  instruction: string;
  frameCount: number;
};

interface ProfilePhotoVerificationProps {
  onClose?: () => void;
  onVerified?: () => void;
}

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function responsePayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === 'object') return payload as Record<string, unknown>;
  return {};
}

export default function ProfilePhotoVerification({ onClose, onVerified }: ProfilePhotoVerificationProps) {
  const [status, setStatus] = useState<VerificationStatus>('not_started');
  const [consent, setConsent] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureAbortRef = useRef<AbortController | null>(null);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamReady(false);
  };

  useEffect(() => {
    let active = true;
    void authFetch('/api/security/profile-verification/status')
      .then(async (response) => {
        const payload = await responsePayload(response);
        if (!response.ok) throw new Error(String(payload.error || 'Statut de vérification indisponible.'));
        if (!active) return;
        setStatus(payload.verified === true ? 'approved' : (payload.status as VerificationStatus) || 'not_started');
        if (payload.verified === true) onVerifiedRef.current?.();
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Statut de vérification indisponible.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      captureAbortRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startVerification = async () => {
    if (!consent) {
      setError('Votre accord est nécessaire avant de transmettre les images au serveur Bavel.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'La caméra n’est pas accessible dans ce navigateur. Essayez depuis l’application ou un navigateur compatible.'
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStreamReady(true);

      const response = await authFetch('/api/security/profile-verification/challenge', { method: 'POST' });
      const payload = await responsePayload(response);
      if (!response.ok) {
        if (payload.verified === true) {
          setStatus('approved');
          onVerifiedRef.current?.();
          return;
        }
        throw new Error(String(payload.error || 'Impossible de démarrer la vérification.'));
      }
      setChallenge(payload as Challenge);
      setStatus('pending');
    } catch (startError) {
      stopCamera();
      setError(
        startError instanceof Error ? startError.message : 'La caméra ou le service de vérification est indisponible.'
      );
    } finally {
      setBusy(false);
    }
  };

  const captureAndSubmit = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!challenge || !video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('La caméra n’est pas encore prête. Réessayez dans un instant.');
      return;
    }
    const controller = new AbortController();
    captureAbortRef.current = controller;
    setError(null);
    setCapturing(true);
    setBusy(true);
    setProgress(0);
    const frames: string[] = [];

    try {
      const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('La capture de la caméra n’est pas disponible.');

      for (let index = 0; index < challenge.frameCount; index += 1) {
        if (controller.signal.aborted) throw new Error('La capture a été interrompue.');
        if (index > 0) await delay(700);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.68));
        setProgress(index + 1);
      }

      setStatus('processing');
      const response = await authFetch('/api/security/profile-verification/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          nonce: challenge.nonce,
          frames
        }),
        signal: controller.signal
      });
      const payload = await responsePayload(response);
      if (!response.ok) throw new Error(String(payload.error || 'La vérification a échoué.'));
      if (payload.verified === true && payload.status === 'approved') {
        setStatus('approved');
        setChallenge(null);
        onVerifiedRef.current?.();
      } else {
        setStatus('rejected');
        setChallenge(null);
        setError(
          String(payload.message || 'La vérification n’a pas abouti. Réessayez avec une photo de profil nette.')
        );
      }
      stopCamera();
    } catch (captureError) {
      setStatus('rejected');
      setChallenge(null);
      setError(captureError instanceof Error ? captureError.message : 'La vérification a échoué. Réessayez.');
      stopCamera();
    } finally {
      frames.fill('');
      captureAbortRef.current = null;
      setCapturing(false);
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto bg-white text-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100" aria-label="Retour">
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-9" />
        )}
        <h2 className="text-base font-bold">Vérification photo</h2>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-9" />
        )}
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 p-5">
        {status === 'approved' ? (
          <div className="my-auto flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-600" aria-hidden="true" />
            <h3 className="text-xl font-bold">Profil vérifié</h3>
            <p className="text-sm text-neutral-600">
              Le serveur a confirmé la vérification de votre selfie et de vos photos de profil.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
              <div>
                <h3 className="font-semibold">Un selfie, comparé à vos photos</h3>
                <p className="mt-1 text-sm leading-5 text-neutral-700">
                  Un défi aléatoire vous sera demandé. Le serveur Bavel analyse cinq images pour vérifier le geste,
                  détecter les tentatives simples de fraude et comparer votre visage à vos photos de profil.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm leading-5 text-neutral-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 accent-rose-700"
              />
              <span>
                J’accepte que ces images soient transmises et analysées temporairement par le serveur Bavel. Elles et
                les empreintes faciales ne sont pas conservées après l’analyse; seul le statut de vérification est
                enregistré.
              </span>
            </label>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
                aria-label="Aperçu caméra"
              />
              {!streamReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white">
                  <Camera className="h-10 w-10 text-white/80" aria-hidden="true" />
                  <p className="max-w-xs px-4 text-sm text-white/80">
                    Votre caméra s’activera lorsque vous démarrerez la vérification.
                  </p>
                </div>
              )}
              {capturing && (
                <div
                  className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-3 text-center text-sm font-medium text-white"
                  role="status"
                >
                  Capture en cours : {progress}/{challenge?.frameCount || 5}
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {challenge && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Votre défi aléatoire</p>
                <p className="mt-1 font-semibold text-neutral-900">{challenge.instruction}</p>
                <p className="mt-2 text-xs text-neutral-600">
                  Gardez votre visage visible et suivez la consigne pendant environ 3 secondes.
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            {status === 'rejected' && !error && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Le résultat n’a pas permis de vérifier votre profil. Vous pouvez recommencer.
              </p>
            )}

            {!challenge ? (
              <button
                type="button"
                disabled={busy || !consent}
                onClick={() => void startVerification()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                Démarrer la vérification
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || !streamReady}
                onClick={() => void captureAndSubmit()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {status === 'processing' ? 'Analyse serveur en cours…' : 'Prendre les images du défi'}
              </button>
            )}

            <p className="text-center text-xs leading-5 text-neutral-500">
              Cette vérification automatisée peut se tromper et ne constitue pas une vérification d’identité. Une
              capture d’écran ou une vidéo préparée peut contourner certains contrôles.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
