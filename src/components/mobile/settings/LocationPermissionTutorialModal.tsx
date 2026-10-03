import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Lock, Navigation, AlertTriangle, RefreshCw, X, 
  Smartphone, CheckCircle2, ChevronLeft, Compass, Crosshair
} from 'lucide-react';
import { getMobilePlatform, isPwaStandalone } from './SystemNotificationSettingsModal';
import { Coordinates } from '../../../services/geoService';

/**
 * Request Geolocation with Dual-step flow:
 * 1. Checks navigator.geolocation
 * 2. Requests position
 * 3. Returns status or triggers tutorial on PERMISSION_DENIED
 */
export async function requestLocationPermissionWithFlow(
  options?: PositionOptions
): Promise<{ success: boolean; coords?: Coordinates; denied?: boolean; error?: string }> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return { success: false, error: "La géolocalisation n'est pas supportée par votre navigateur." };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
        };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('bavel_user_coords', JSON.stringify(coords));
          localStorage.setItem('bavel_location_permission', 'granted');
        }
        resolve({ success: true, coords });
      },
      (error) => {
        const isDenied = error.code === error.PERMISSION_DENIED;
        if (typeof localStorage !== 'undefined' && isDenied) {
          localStorage.setItem('bavel_location_permission', 'denied');
        }
        resolve({ 
          success: false, 
          denied: isDenied, 
          error: isDenied ? "Accès GPS refusé." : error.message 
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options,
      }
    );
  });
}

/**
 * Tutorial modal displayed when Geolocation / GPS is blocked.
 */
export function LocationBlockedTutorialModal({
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
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[200] flex items-center justify-center p-4 select-none font-sans"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-rose-500 p-5 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-[17px] font-bold tracking-tight">
            📍 Accès GPS / Localisation bloqué
          </h3>
          <p className="text-[12.5px] text-white/90 mt-1 leading-snug">
            Pour trouver les célibataires autour de vous à Abidjan et en Côte d'Ivoire, l'application a besoin de votre position.
          </p>
        </div>

        {/* Tutorial Content */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-gray-800 text-[13.5px]">
          <p className="font-semibold text-gray-900">
            {platform === 'ios' 
              ? "Sur iPhone / Safari (iOS) :" 
              : "Sur Android (Chrome & autres navigateurs) :"}
          </p>

          {platform === 'ios' ? (
            <div className="space-y-3">
              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Bouton d'adresse « aA » ou Réglages</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Dans Safari, appuyez sur <strong>« aA »</strong> à gauche dans la barre d'adresse &gt; <strong>Réglages du site web</strong> &gt; <strong>Position</strong> : mettez sur <strong>« Demander »</strong> ou <strong>« Autoriser »</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Service de localisation iPhone</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Dans <strong>Réglages iOS</strong> &gt; <strong>Confidentialité et sécurité</strong> &gt; <strong>Service de localisation</strong>, vérifiez que le bouton principal est bien <strong>activé</strong>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Cliquez sur le Cadenas (🔒)</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Cliquez sur l'icône de <strong>cadenas (🔒)</strong> ou de réglages tout en haut à gauche dans la barre d'adresse du navigateur.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Activez la Localisation</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Activez l'option <strong>Localisation (ou Position)</strong> sur <strong>« Autoriser »</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">GPS rapide du téléphone</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    Si le GPS global de votre téléphone est éteint, ouvrez les <strong>Paramètres rapides</strong> (en glissant du haut vers le bas de votre écran) et activez l'icône <strong>"Position / GPS"</strong>.
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
              className="w-full py-3 bg-[#9c1f35] hover:bg-[#851a2d] active:scale-[0.98] text-white font-bold text-[14px] rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer la localisation</span>
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
 * Full Native OS Location Settings Modal
 */
export function SystemLocationSettingsModal({
  onClose,
  onLocationUpdated
}: {
  onClose: () => void;
  onLocationUpdated?: (coords: Coordinates) => void;
}) {
  const platform = getMobilePlatform();
  const isPwa = isPwaStandalone();

  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('bavel_privacy_show_location') !== 'false';
    }
    return true;
  });

  const [highAccuracy, setHighAccuracy] = useState(true);
  const [preciseLocation, setPreciseLocation] = useState(true);
  const [locating, setLocating] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('bavel_user_coords');
      if (saved) {
        try { return JSON.parse(saved); } catch (_) {}
      }
    }
    return null;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRefreshLocation = async () => {
    setLocating(true);
    const result = await requestLocationPermissionWithFlow({ enableHighAccuracy: highAccuracy });
    setLocating(false);

    if (result.success && result.coords) {
      setCurrentCoords(result.coords);
      onLocationUpdated?.(result.coords);
      showToast("📍 Position GPS actualisée avec succès !");
    } else if (result.denied) {
      setShowTutorial(true);
    } else {
      showToast(result.error || "Impossible d'obtenir la position.");
    }
  };

  const handleToggleMaster = async () => {
    if (!isLocationEnabled) {
      setIsLocationEnabled(true);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bavel_privacy_show_location', 'true');
      }
      await handleRefreshLocation();
    } else {
      setIsLocationEnabled(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bavel_privacy_show_location', 'false');
      }
      showToast("Localisation désactivée pour Bavel");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f2f2f7] z-[160] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-[#f2f2f7] border-b border-gray-300/80 shrink-0 relative">
        <button
          onClick={onClose}
          className="flex items-center text-[#007aff] text-[16px] font-medium hover:opacity-70 transition-opacity cursor-pointer z-10"
        >
          <ChevronLeft className="w-6 h-6 -ml-1 mr-0.5" strokeWidth={2.5} />
          <span>Réglages</span>
        </button>
        <h2 className="text-[17px] font-semibold text-black tracking-tight absolute left-1/2 -translate-x-1/2">
          Service de localisation
        </h2>
        <div className="w-16" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* App Banner */}
        <div className="flex flex-col items-center justify-center space-y-2 py-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-md shadow-amber-950/20">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-[18px] font-bold text-black tracking-tight">Position GPS & Rayon</h3>
            <p className="text-[12px] text-gray-500 font-medium">
              {isPwa ? 'Application Web PWA installée' : 'Application Web Mobile'} • {platform === 'ios' ? 'iOS Location Services' : 'Android Google Location'}
            </p>
          </div>
        </div>

        {/* Master Switch Card */}
        <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-gray-200/60">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex flex-col pr-3">
              <span className="text-[16px] font-semibold text-black">
                Autoriser l'accès à la position
              </span>
              <span className="text-[12px] text-gray-500">
                Trouver des profils compatibles à proximité et calculer la distance
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleMaster}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                isLocationEnabled ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
              }`}
            >
              <div
                className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                  isLocationEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>

        {isLocationEnabled && (
          <div className="space-y-5">
            {/* Position Status Card */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-gray-900 flex items-center space-x-1.5">
                  <Navigation className="w-4 h-4 text-[#9c1f35]" />
                  <span>Coordonnées actuelles</span>
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  {currentCoords ? 'Détectées' : 'En attente'}
                </span>
              </div>

              {currentCoords ? (
                <div className="p-3 bg-gray-50 rounded-lg text-[12.5px] text-gray-600 space-y-1 font-mono">
                  <div>Latitude : {currentCoords.latitude.toFixed(5)}° N</div>
                  <div>Longitude : {currentCoords.longitude.toFixed(5)}° O</div>
                  {currentCoords.accuracy && (
                    <div className="text-[11.5px] text-gray-500">Précision : ±{Math.round(currentCoords.accuracy)} mètres</div>
                  )}
                </div>
              ) : (
                <p className="text-[12.5px] text-gray-500">
                  Aucune position GPS enregistrée pour le moment. Cliquez ci-dessous pour actualiser votre position.
                </p>
              )}

              <button
                type="button"
                onClick={handleRefreshLocation}
                disabled={locating}
                className="w-full py-2.5 bg-[#9c1f35] hover:bg-[#851a2d] active:scale-[0.98] text-white font-bold text-[13.5px] rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
              >
                <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Géolocalisation en cours...' : 'Mettre à jour ma position GPS'}</span>
              </button>
            </div>

            {/* Precision Options */}
            <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-gray-200/60 divide-y divide-gray-100">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex flex-col pr-2">
                  <span className="text-[15px] font-normal text-black">Position exacte (Haute précision)</span>
                  <span className="text-[11.5px] text-gray-500">Utilise le GPS satellite pour un rayon précis</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreciseLocation(!preciseLocation)}
                  className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    preciseLocation ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
                  }`}
                >
                  <div className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${preciseLocation ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex flex-col pr-2">
                  <span className="text-[15px] font-normal text-black">Actualisation en arrière-plan</span>
                  <span className="text-[11.5px] text-gray-500">Met à jour la distance lors de vos déplacements</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHighAccuracy(!highAccuracy)}
                  className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    highAccuracy ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
                  }`}
                >
                  <div className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${highAccuracy ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>
            </div>

            {/* Info note */}
            <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5 flex items-start space-x-2.5">
              <Compass className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-blue-900 leading-snug">
                <strong>Confidentialité garantie</strong> : Bavel n'affiche jamais votre adresse précise aux autres utilisateurs. Seule une distance approximative (ex: « à 3 km ») ou votre ville est visible.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Blocked Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <LocationBlockedTutorialModal
            onClose={() => setShowTutorial(false)}
            onRetry={async () => {
              setShowTutorial(false);
              await handleRefreshLocation();
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg z-[210] flex items-center space-x-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
