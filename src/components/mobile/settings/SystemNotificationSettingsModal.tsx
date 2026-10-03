import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Bell, BellRing, Lock, ShieldCheck, Smartphone, 
  CheckCircle2, AlertTriangle, RefreshCw, Volume2, Sparkles, X, Info
} from 'lucide-react';
import { pushNotificationService } from '../../../services/push/pushNotificationService';
import { getApiUrl } from '../../../lib/apiUrl';
import { authFetch } from '../../../lib/authFetch';

// Detect Device Platform
export function getMobilePlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Handle the dual-step permission request:
 * 1. Calls native Notification.requestPermission()
 * 2. If 'granted', registers Web Push
 * 3. Returns the resulting permission status
 */
export async function requestNativeNotificationPermissionWithFlow(
  userId: string = 'me'
): Promise<{ status: 'granted' | 'denied' | 'default'; isPwa: boolean }> {
  const isPwa = isPwaStandalone();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { status: 'default', isPwa };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        await pushNotificationService.subscribeToPush();
      } catch (err) {
        console.warn('Web Push subscription after grant failed:', err);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bavel_native_notifications_enabled', 'true');
      }
    } else if (permission === 'denied') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bavel_native_notifications_enabled', 'false');
      }
    }
    return { status: permission, isPwa };
  } catch (error) {
    console.warn('Error during Notification.requestPermission():', error);
    return { status: Notification.permission || 'default', isPwa };
  }
}

/**
 * Tutorial modal displayed when notifications are blocked by the browser.
 */
export function NotificationBlockedTutorialModal({
  onClose,
  onRetry
}: {
  onClose: () => void;
  onRetry?: () => void;
}) {
  const platform = getMobilePlatform();
  const isPwa = isPwaStandalone();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[200] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-[17px] font-bold tracking-tight">
            Notifications bloquées
          </h3>
          <p className="text-[12.5px] text-white/90 mt-1 leading-snug">
            Votre navigateur bloque actuellement l'envoi d'alertes directes pour les Matchs et appels.
          </p>
        </div>

        {/* Tutorial Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-gray-800 text-[13.5px]">
          <p className="font-semibold text-gray-900">
            {platform === 'ios' 
              ? "Sur iPhone / iPad (Safari & iOS) :" 
              : "Sur Android (Google Chrome & navigateurs) :"}
          </p>

          {platform === 'ios' ? (
            <div className="space-y-3">
              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Ajouter à l'écran d'accueil</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Sur Safari, appuyez sur le bouton <strong>Partager (⎋ / ⬆️)</strong> puis <strong>« Sur l'écran d'accueil »</strong> pour activer les vraies alertes Apple natives.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Réglages iPhone</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Ouvrez l'application <strong>Réglages</strong> &gt; <strong>Safari</strong> (ou <strong>Bavel</strong>) &gt; <strong>Notifications</strong> et activez <strong>« Autoriser les notifications »</strong>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Cliquez sur le Cadenas 🔒</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Appuyez sur l'icône de <strong>cadenas (🔒)</strong> ou de réglages tout en haut à gauche dans la barre d'adresse de Chrome.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Paramètres du site &gt; Notifications</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Allez dans <strong>Autorisations</strong> ou <strong>Paramètres du site</strong> et basculez <strong>Notifications</strong> sur <strong>« Autoriser »</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Rechargez la page</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Actualisez l'application pour appliquer les autorisations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col space-y-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-3 bg-[#9c1f35] hover:bg-[#851a2d] text-white font-bold text-[14px] rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Vérifier à nouveau l'autorisation</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-[13.5px] rounded-xl transition-colors cursor-pointer"
          >
            J'ai compris
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Full-screen Native OS Notification Settings Interface
 */
export function SystemNotificationSettingsModal({
  onClose,
  userId = 'me'
}: {
  onClose: () => void;
  userId?: string;
}) {
  const platform = getMobilePlatform();
  const isPwa = isPwaStandalone();

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [isSystemEnabled, setIsSystemEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('bavel_native_notifications_enabled') !== 'false';
    }
    return true;
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [badgeEnabled, setBadgeEnabled] = useState(true);
  const [lockScreenEnabled, setLockScreenEnabled] = useState(true);
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [centerEnabled, setCenterEnabled] = useState(true);

  const [showTutorial, setShowTutorial] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleToggleMaster = async () => {
    if (!isSystemEnabled) {
      // Trying to enable
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'denied') {
          setShowTutorial(true);
          return;
        }
        const { status } = await requestNativeNotificationPermissionWithFlow(userId);
        setPermission(status as NotificationPermission);
        if (status === 'granted') {
          setIsSystemEnabled(true);
          showToast("✅ Notifications système activées pour Bavel");
        } else if (status === 'denied') {
          setIsSystemEnabled(false);
          setShowTutorial(true);
        }
      } else {
        setIsSystemEnabled(true);
      }
    } else {
      // Disable
      setIsSystemEnabled(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bavel_native_notifications_enabled', 'false');
      }
      showToast("Notifications système désactivées pour Bavel");
    }
  };

  const handleSendTestAlert = async () => {
    setTestingNotification(true);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
        const { status } = await requestNativeNotificationPermissionWithFlow(userId);
        setPermission(status as NotificationPermission);
        if (status !== 'granted') {
          setShowTutorial(true);
          setTestingNotification(false);
          return;
        }
      }

      // 1. Send via Service Worker or Backend
      const response = await authFetch(getApiUrl('/api/push/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const result = await response.json().catch(() => null);
      if (
        !response.ok ||
        typeof result?.acceptedByPushService !== 'number' ||
        result.acceptedByPushService < 1
      ) {
        throw new Error(result?.message || `HTTP ${response.status}`);
      }

      // 2. Play subtle haptic feedback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      showToast("🔔 Le service Push a accepté le test; la réception sur l’appareil n’est pas garantie.");
    } catch (err) {
      console.warn('Error sending test push:', err);
      showToast("Échec du test Push. Vérifiez qu’un appareil est abonné.");
    } finally {
      setTestingNotification(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f2f2f7] z-[160] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* iOS/Android Style Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-[#f2f2f7] border-b border-gray-300/80 shrink-0 relative">
        <button
          onClick={onClose}
          className="flex items-center text-[#007aff] text-[16px] font-medium hover:opacity-70 transition-opacity cursor-pointer z-10"
        >
          <ChevronLeft className="w-6 h-6 -ml-1 mr-0.5" strokeWidth={2.5} />
          <span>Réglages</span>
        </button>
        <h2 className="text-[17px] font-semibold text-black tracking-tight absolute left-1/2 -translate-x-1/2">
          Notifications
        </h2>
        <div className="w-16" />
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* App Identity Banner */}
        <div className="flex flex-col items-center justify-center space-y-2 py-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#9c1f35] to-[#c42745] flex items-center justify-center shadow-md shadow-rose-950/20">
            <span className="text-white font-black text-2xl tracking-tighter">B</span>
          </div>
          <div className="text-center">
            <h3 className="text-[18px] font-bold text-black tracking-tight">Bavel Côte d'Ivoire</h3>
            <p className="text-[12px] text-gray-500 font-medium">
              {isPwa ? 'Application Web PWA installée' : 'Application Web Mobile'} • {platform === 'ios' ? 'iOS (Apple APNs)' : 'Android (Google FCM)'}
            </p>
          </div>
        </div>

        {/* Master Switch Card */}
        <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-gray-200/60">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[16px] font-semibold text-black">
                Autoriser les notifications
              </span>
              <span className="text-[12px] text-gray-500">
                Matchs, messages, appels vidéo et alertes en direct
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleMaster}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                isSystemEnabled ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
              }`}
            >
              <div
                className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                  isSystemEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Permission Status Pill */}
        <div className="px-1 flex items-center justify-between text-[13px]">
          <span className="text-gray-500">Statut système :</span>
          {permission === 'granted' ? (
            <span className="inline-flex items-center space-x-1 font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Autorisé par l'appareil</span>
            </span>
          ) : permission === 'denied' ? (
            <button
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center space-x-1 font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Bloqué (Voir le guide 🔒)</span>
            </button>
          ) : (
            <button
              onClick={handleToggleMaster}
              className="inline-flex items-center space-x-1 font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Activer maintenant</span>
            </button>
          )}
        </div>

        {/* Alerts Visual Layout */}
        {isSystemEnabled ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-5"
          >
            {/* Visual alert destinations */}
            <div>
              <span className="text-[12px] font-normal text-gray-500 uppercase px-1 tracking-wider">
                ALERTES SYSTÈME
              </span>
              <div className="mt-2 bg-white rounded-xl p-4 shadow-xs border border-gray-200/60 grid grid-cols-3 gap-3 text-center">
                {/* Lockscreen */}
                <div 
                  onClick={() => setLockScreenEnabled(!lockScreenEnabled)}
                  className={`flex flex-col items-center space-y-2 p-2 rounded-lg cursor-pointer transition-all ${
                    lockScreenEnabled ? 'bg-rose-50/50 border border-rose-500/30' : 'bg-gray-50 border border-gray-200 opacity-60'
                  }`}
                >
                  <div className="w-9 h-14 rounded-md bg-gray-200 border border-gray-300 flex items-center justify-center relative shadow-xs">
                    <div className={`w-6 h-3 rounded-xs ${lockScreenEnabled ? 'bg-[#9c1f35]' : 'bg-gray-400'}`} />
                  </div>
                  <span className="text-[11px] font-semibold text-black">Écran verrouillé</span>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${lockScreenEnabled ? 'bg-[#007aff] text-white' : 'border border-gray-300'}`}>
                    {lockScreenEnabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Notification Center */}
                <div 
                  onClick={() => setCenterEnabled(!centerEnabled)}
                  className={`flex flex-col items-center space-y-2 p-2 rounded-lg cursor-pointer transition-all ${
                    centerEnabled ? 'bg-rose-50/50 border border-rose-500/30' : 'bg-gray-50 border border-gray-200 opacity-60'
                  }`}
                >
                  <div className="w-9 h-14 rounded-md bg-gray-200 border border-gray-300 flex items-center justify-center relative shadow-xs">
                    <div className={`w-6 h-5 rounded-xs ${centerEnabled ? 'bg-[#9c1f35]' : 'bg-gray-400'}`} />
                  </div>
                  <span className="text-[11px] font-semibold text-black">Centre de notifs</span>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${centerEnabled ? 'bg-[#007aff] text-white' : 'border border-gray-300'}`}>
                    {centerEnabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Banners */}
                <div 
                  onClick={() => setBannerEnabled(!bannerEnabled)}
                  className={`flex flex-col items-center space-y-2 p-2 rounded-lg cursor-pointer transition-all ${
                    bannerEnabled ? 'bg-rose-50/50 border border-rose-500/30' : 'bg-gray-50 border border-gray-200 opacity-60'
                  }`}
                >
                  <div className="w-9 h-14 rounded-md bg-gray-200 border border-gray-300 flex items-center justify-center relative shadow-xs">
                    <div className={`w-6 h-2 rounded-xs absolute top-1.5 ${bannerEnabled ? 'bg-[#9c1f35]' : 'bg-gray-400'}`} />
                  </div>
                  <span className="text-[11px] font-semibold text-black">Bannières</span>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${bannerEnabled ? 'bg-[#007aff] text-white' : 'border border-gray-300'}`}>
                    {bannerEnabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Sound & Badges */}
            <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-gray-200/60 divide-y divide-gray-100">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-[15px] font-normal text-black">Sons et sonneries d'appel</span>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    soundEnabled ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
                  }`}
                >
                  <div className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${soundEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-[15px] font-normal text-black">Pastilles d'icône (Badges)</span>
                <button
                  type="button"
                  onClick={() => setBadgeEnabled(!badgeEnabled)}
                  className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    badgeEnabled ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
                  }`}
                >
                  <div className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${badgeEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>
            </div>

            {/* Live Test Trigger Button */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200/60 space-y-3">
              <div>
                <h4 className="text-[14px] font-bold text-gray-900">
                  Rappel de relance (Inactivité 1-2 jours)
                </h4>
                <p className="text-[12.5px] text-gray-500 mt-0.5">
                  Notification automatique envoyée après 24h à 48h sans visite pour vous inviter à faire plus de rencontres.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  pushNotificationService.triggerRealInactivityPush();
                  showToast("🔥 Notification Web Push de relance (1-2 jours) envoyée !");
                }}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-[13px] rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tester la notification de relance (Temps réel)</span>
              </button>

              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-[13.5px] font-semibold text-gray-900">
                  Tester les vibrations et sons système
                </h4>
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  disabled={testingNotification}
                  className="w-full mt-2 py-2.5 bg-[#9c1f35] hover:bg-[#851a2d] active:scale-[0.98] text-white font-bold text-[13px] rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <BellRing className={`w-4 h-4 ${testingNotification ? 'animate-bounce' : ''}`} />
                  <span>{testingNotification ? 'Envoi en cours...' : 'Déclencher une alerte de test'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 text-center">
            <p className="text-[13px] text-amber-800 font-medium">
              Les notifications système sont suspendues. Activez l'interrupteur ci-dessus pour recevoir les alertes de Matchs et messages en temps réel même lorsque l'application est fermée.
            </p>
          </div>
        )}
      </div>

      {/* Tutorial Modal if blocked */}
      <AnimatePresence>
        {showTutorial && (
          <NotificationBlockedTutorialModal
            onClose={() => setShowTutorial(false)}
            onRetry={async () => {
              const { status } = await requestNativeNotificationPermissionWithFlow(userId);
              setPermission(status as NotificationPermission);
              if (status === 'granted') {
                setIsSystemEnabled(true);
                setShowTutorial(false);
                showToast("✅ Notifications activées !");
              } else {
                showToast("Toujours bloqué dans le navigateur");
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg z-[210] flex items-center space-x-2"
          >
            <span>{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
