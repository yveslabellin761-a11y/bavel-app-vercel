import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, Share, X } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_KEY = 'bavel-pwa-install-dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function wasInstallDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function isIosSafari() {
  const userAgent = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIos && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
}

export function PwaExperience() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const shouldReloadRef = useRef(false);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setShowInstall(!wasInstallDismissed());
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    if (isIosSafari() && !isStandalone() && !wasInstallDismissed()) {
      setShowInstall(true);
    }

    let mounted = true;
    const handleControllerChange = () => {
      if (shouldReloadRef.current) window.location.reload();
    };

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.register('/sw.js')
        .then((registered) => {
          if (!mounted) return;
          registrationRef.current = registered;
          if (registered.waiting) setUpdateReady(true);
          registered.addEventListener('updatefound', () => {
            const installing = registered.installing;
            installing?.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true);
              }
            });
          });
          void registered.update().catch((error) => {
            console.warn('Bavel PWA update check failed:', error);
          });
        })
        .catch((error) => {
          console.warn('Bavel service worker registration failed:', error);
        });
    }

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      registrationRef.current = null;
    };
  }, []);

  const dismissInstall = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch (error) {
      console.warn('Could not persist the PWA install preference:', error);
    }
    setShowInstall(false);
    setIosInstructions(false);
  };

  const installApp = async () => {
    if (!installPrompt) {
      setIosInstructions(true);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowInstall(false);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.warn('Bavel PWA install prompt failed:', error);
      setInstallPrompt(null);
    }
  };

  const updateApp = () => {
    const waitingWorker = registrationRef.current?.waiting;
    if (!waitingWorker) return;
    shouldReloadRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setUpdateReady(false);
  };

  return (
    <>
      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ y: -36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -36, opacity: 0 }}
            className="fixed inset-x-0 top-0 z-[300] bg-slate-950 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-xs font-semibold text-white"
            role="status"
          >
            Vous êtes hors ligne. Certaines fonctions ne sont pas disponibles.
          </motion.div>
        )}
        {updateReady && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[300] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-3.5 shadow-[0_16px_50px_rgba(15,23,42,0.22)] backdrop-blur-xl"
            role="status"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#9c1f35]">
              <RefreshCw className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">Mise à jour disponible</span>
              <span className="block text-xs text-slate-500">Rechargez Bavel pour profiter des nouveautés.</span>
            </span>
            <button
              type="button"
              onClick={updateApp}
              className="rounded-xl bg-[#9c1f35] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#7e172a]"
            >
              Actualiser
            </button>
          </motion.div>
        )}
        {showInstall && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[290] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-3.5 shadow-[0_16px_50px_rgba(15,23,42,0.22)] backdrop-blur-xl"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#9c1f35]">
              <Download className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">Emportez Bavel avec vous</span>
              <span className="block text-xs text-slate-500">
                {iosInstructions
                  ? <>Touchez <Share className="inline h-3 w-3" /> Partager, puis « Sur l’écran d’accueil ».</>
                  : 'Installez l’application pour y accéder comme à une app native.'}
              </span>
            </span>
            {!iosInstructions && (
              <button
                type="button"
                onClick={() => void installApp()}
                className="rounded-xl bg-[#9c1f35] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#7e172a]"
              >
                Installer
              </button>
            )}
            <button
              type="button"
              onClick={dismissInstall}
              aria-label="Fermer la suggestion d’installation"
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
