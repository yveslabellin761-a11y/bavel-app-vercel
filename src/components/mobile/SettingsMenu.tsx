import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil, Smartphone, Download, Moon, Vibrate, AlertCircle, ShieldCheck, Ghost
} from 'lucide-react';
import { User } from '../../types';
import { updatePassword, syncProfileToSupabase, getSupabase, registerPasskey as registerSupabasePasskey, signOutFromSupabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { SafetyIllustrationRenderer } from '../shared/SafetyIllustrationRenderer';
import { SecurityDashboardModal } from '../modals/SecurityDashboardModal';
import { ExperienceControlModal } from '../modals/ExperienceControlModal';
import { AboutModal, RestorePurchasesModal } from '../modals/AboutModal';
import { getSavedBiometricUser, enableBiometricAuth, disableBiometricAuth } from '../../lib/biometricAuth';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { triggerHaptic } from '../../utils/audio';
import { searchLocations } from '../../data/worldCities';
import { InteractiveFAQ } from './InteractiveFAQ';
import { SystemNotificationSettingsModal, requestNativeNotificationPermissionWithFlow } from './settings/SystemNotificationSettingsModal';
import { SystemLocationSettingsModal, LocationBlockedTutorialModal, requestLocationPermissionWithFlow } from './settings/LocationPermissionTutorialModal';
import {
  fetchPrivacySettings,
  fetchPrivacySettingsWithEntitlements,
  updatePrivacySettings
} from '../../services/advancedService';
async function registerCurrentPasskey() {
  const { data, error } = await registerSupabasePasskey();
  if (error) throw new Error(error);
  return data;
}

export function InfosMenu({ 
  onClose, 
  userProfile, 
  setUserProfile 
}: { 
  onClose: () => void; 
  userProfile?: any; 
  setUserProfile?: React.Dispatch<React.SetStateAction<any>>; 
}) {
  const [editingField, setEditingField] = useState<'name' | 'gender' | 'city' | 'info_explanation' | null>(null);
  const [tempName, setTempName] = useState(userProfile?.name || '');
  const [tempGender, setTempGender] = useState(userProfile?.gender || '');
  const [tempCity, setTempCity] = useState(userProfile?.city || '');
  const [locationQuery, setLocationQuery] = useState('');
  const [savingField, setSavingField] = useState<'name' | 'gender' | 'city' | null>(null);
  const [saveError, setSaveError] = useState('');

  const handleSaveField = async (field: 'name' | 'gender' | 'city', value?: string) => {
    if (savingField) return;
    const nextValue = (value ?? (field === 'name' ? tempName : field === 'gender' ? tempGender : tempCity)).trim();
    if (!nextValue || (field === 'name' && nextValue.length > 50) || (field === 'city' && nextValue.length > 100)) {
      setSaveError(field === 'name' ? 'Saisissez un prénom de 1 à 50 caractères.' : 'Saisissez une ville valide.');
      return;
    }

    setSavingField(field);
    setSaveError('');
    const updated = { ...userProfile, [field]: nextValue };
    try {
      const savedProfile = await syncProfileToSupabase(updated);
      if (!savedProfile) throw new Error('La sauvegarde du profil a échoué. Vérifiez votre connexion puis réessayez.');
      setUserProfile?.((previous: any) => ({ ...previous, ...updated }));
      try {
        const savedUser = JSON.parse(localStorage.getItem('app_user') || '{}');
        localStorage.setItem('app_user', JSON.stringify({ ...savedUser, ...updated }));
      } catch (cacheError) {
        console.warn('Profile cache update failed:', cacheError);
      }
      setEditingField(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Impossible de sauvegarder les modifications.');
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[110] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between relative pt-8 pb-2.5 px-4 bg-white border-b border-gray-100 shrink-0">
        <button 
          onClick={onClose} 
          className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer"
          aria-label="Retour"
        >
          <ChevronLeft className="w-5 h-5 text-black" strokeWidth={2.5} />
        </button>
        <h2 className="text-[14px] font-bold text-black tracking-tight">Infos</h2>
        <div className="w-5" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-white pt-1">
        {/* Row List */}
        <div className="border-t border-b border-gray-100 divide-y divide-gray-100">
          
          {/* Prénom */}
          <button 
            onClick={() => {
              setTempName(userProfile?.name || '');
              setEditingField('name');
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-left cursor-pointer"
          >
            <span className="text-[13.5px] font-normal text-black">Prénom</span>
            <div className="flex items-center space-x-1 text-gray-400">
              <span className="text-[13px] text-gray-500">{userProfile?.name || 'Non renseigné'}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />
            </div>
          </button>

          {/* Né(e) le */}
          <div className="w-full flex items-center justify-between px-4 py-2.5 text-left">
            <span className="text-[13.5px] font-normal text-black">Né(e) le</span>
            <span className="text-[13px] text-gray-500">
              {userProfile?.birthday || userProfile?.birthdate || 'Non renseigné'}
            </span>
          </div>

          {/* Sexe */}
          <button 
            onClick={() => {
              setTempGender(userProfile?.gender || '');
              setEditingField('gender');
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-left cursor-pointer"
          >
            <span className="text-[13.5px] font-normal text-black">Sexe</span>
            <div className="flex items-center space-x-1 text-gray-400">
              <span className="text-[13px] text-gray-500 capitalize">
                {userProfile?.gender === 'femme' ? 'Femme' : userProfile?.gender === 'autre' ? 'Autre' : userProfile?.gender === 'homme' ? 'Homme' : 'Non renseigné'}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />
            </div>
          </button>

          {/* Emplacement */}
          <button 
            onClick={() => {
              setTempCity(userProfile?.city || '');
              setEditingField('city');
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-left cursor-pointer"
          >
            <span className="text-[13.5px] font-normal text-black">Emplacement</span>
            <div className="flex items-center space-x-1 text-gray-400">
              <span className="text-[13px] text-gray-500">{userProfile?.city || 'Non renseigné'}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />
            </div>
          </button>

        </div>

        {/* Footnote Explanation */}
        <div className="px-4 pt-3 text-left space-y-0.5">
          <p className="text-[11.5px] text-gray-500 leading-snug">
            Les autres pourront voir que tu n'utilises pas ta localisation actuelle:
          </p>
          <button 
            onClick={() => setEditingField('info_explanation')}
            className="text-[11.5px] font-normal text-black underline underline-offset-2 hover:opacity-75 transition-opacity text-left cursor-pointer block"
          >
            Comment est-ce que ça apparaît sur mon profil ?
          </button>
        </div>
      </div>

      {/* Editing Sub-sheets / Modals */}
      <AnimatePresence>
        {editingField === 'name' && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 bg-white z-[130] flex flex-col"
          >
            <div className="flex items-center justify-between pt-10 pb-3 px-4 border-b border-gray-100">
              <button onClick={() => setEditingField(null)} className="text-gray-500 font-medium text-[14px]">Annuler</button>
              <h3 className="font-bold text-[15px] text-black">Prénom</h3>
              <button
                onClick={() => void handleSaveField('name')}
                disabled={Boolean(savingField) || !tempName.trim()}
                className="text-[#e20030] font-bold text-[14px] disabled:opacity-50"
              >
                {savingField === 'name' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
            <div className="p-4">
              <label className="block text-[12px] font-bold text-gray-500 uppercase mb-2">Modifier votre prénom</label>
              <input 
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                maxLength={50}
                disabled={Boolean(savingField)}
                className="w-full border-b border-gray-200 py-2.5 text-[15px] text-black outline-none focus:border-black font-medium"
                placeholder="Votre prénom"
                autoFocus
              />
              {saveError && <p className="mt-3 text-sm text-red-600" role="alert">{saveError}</p>}
            </div>
          </motion.div>
        )}

        {editingField === 'gender' && (
          <div 
            className="fixed inset-0 bg-black/40 z-[200] flex items-end justify-center p-2.5 sm:p-4 select-none animate-in fade-in duration-200"
            onClick={() => setEditingField(null)}
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-sm sm:max-w-md flex flex-col space-y-2 mb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Options Card */}
              <div className="bg-white/95 backdrop-blur-md rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-2xl divide-y divide-gray-200/80">
                {saveError && <p className="p-3 text-sm text-red-600" role="alert">{saveError}</p>}
                <button
                  type="button"
                  disabled={Boolean(savingField)}
                  onClick={() => {
                    triggerHaptic('light');
                    setTempGender('homme');
                    void handleSaveField('gender', 'homme');
                  }}
                  className="w-full py-3.5 sm:py-4 text-center text-[#007AFF] text-[18px] sm:text-[19px] font-normal hover:bg-gray-100/60 active:bg-gray-200/60 transition-colors cursor-pointer block"
                >
                  Homme
                </button>

                <button
                  type="button"
                  disabled={Boolean(savingField)}
                  onClick={() => {
                    triggerHaptic('light');
                    setTempGender('femme');
                    void handleSaveField('gender', 'femme');
                  }}
                  className="w-full py-3.5 sm:py-4 text-center text-[#007AFF] text-[18px] sm:text-[19px] font-normal hover:bg-gray-100/60 active:bg-gray-200/60 transition-colors cursor-pointer block"
                >
                  Femme
                </button>

                <button
                  type="button"
                  disabled={Boolean(savingField)}
                  onClick={() => {
                    triggerHaptic('light');
                    setTempGender('autre');
                    void handleSaveField('gender', 'autre');
                  }}
                  className="w-full py-3.5 sm:py-4 text-center text-[#007AFF] text-[18px] sm:text-[19px] font-normal hover:bg-gray-100/60 active:bg-gray-200/60 transition-colors cursor-pointer block"
                >
                  Autres identités
                </button>
              </div>

              {/* Cancel Button Card */}
              <div className="bg-white/95 backdrop-blur-md rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setEditingField(null);
                  }}
                  className="w-full py-3.5 sm:py-4 text-center text-[#007AFF] text-[18px] sm:text-[19px] font-semibold hover:bg-gray-100/60 active:bg-gray-200/60 transition-colors cursor-pointer block"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingField === 'city' && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 bg-white z-[130] flex flex-col h-[100dvh] overflow-hidden select-none font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between relative pt-8 pb-2.5 px-4 bg-white border-b border-gray-100 shrink-0">
              <button 
                onClick={() => setEditingField(null)} 
                className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer"
                aria-label="Retour"
              >
                <ChevronLeft className="w-5 h-5 text-black" strokeWidth={2.5} />
              </button>
              <h2 className="text-[15px] font-semibold text-black tracking-tight">Votre emplacement</h2>
              <div className="w-5" />
            </div>

            {/* Search Input Bar */}
            <div className="px-3 py-2 bg-white border-b border-gray-100 flex items-center space-x-2 shrink-0">
              <div className="flex-1 bg-[#e3e3e8]/70 focus-within:bg-[#e3e3e8] rounded-xl px-3 py-1.5 flex items-center space-x-2 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input 
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Votre ville"
                  className="w-full bg-transparent text-[15px] text-black outline-none font-normal placeholder:text-gray-400"
                  autoFocus
                />
                {locationQuery.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setLocationQuery('')}
                    className="bg-gray-400 hover:bg-gray-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-3 h-3" strokeWidth={3} />
                  </button>
                )}
              </div>
              {locationQuery.length > 0 && (
                <button 
                  type="button"
                  onClick={() => setLocationQuery('')}
                  className="text-[#007AFF] text-[15px] font-normal pl-1 pr-1 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                >
                  Annuler
                </button>
              )}
            </div>
            {saveError && <p className="px-4 py-2 text-sm text-red-600 bg-white" role="alert">{saveError}</p>}

            {/* Location Results List */}
            <div className="flex-1 overflow-y-auto bg-[#f2f2f7]">
              {locationQuery.trim().length > 0 && (
                <div className="bg-white divide-y divide-gray-100 border-b border-gray-100">
                  {searchLocations(locationQuery).map((loc, idx) => (
                    <button
                      key={`${loc.fullName}-${idx}`}
                      type="button"
                      onClick={() => {
                        triggerHaptic('success');
                        const newCityName = loc.name || loc.fullName;
                        setTempCity(newCityName);
                        void handleSaveField('city', newCityName);
                      }}
                      disabled={Boolean(savingField)}
                      className="w-full px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 block border-b border-gray-100/80 last:border-b-0"
                    >
                      <span className="text-[14px] sm:text-[14.5px] font-normal text-black block truncate">
                        {loc.fullName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {editingField === 'info_explanation' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[140] flex items-end justify-center"
            onClick={() => setEditingField(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-white w-full rounded-t-[28px] p-6 pb-7 text-black select-none relative max-h-[92vh] overflow-y-auto scrollbar-hide"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={() => setEditingField(null)}
                className="absolute top-5 right-5 p-1 text-black hover:opacity-75 transition-opacity cursor-pointer z-10"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" strokeWidth={2} />
              </button>

              {/* Top Purple Icon Badge */}
              <div className="w-12 h-12 rounded-full bg-[#EFE5FA] flex items-center justify-center mb-5 mt-1">
                <MapPin className="w-6 h-6 text-black fill-black" strokeWidth={1} />
              </div>

              {/* Title */}
              <h3 className="text-[22px] font-extrabold text-black leading-[1.25] mb-3 tracking-tight text-left">
                Nous avons rendu les détails de localisation plus clairs
              </h3>

              {/* Subtitle */}
              <p className="text-[13.5px] text-gray-600 leading-snug mb-5 font-normal text-left">
                Voir sur les profils des autres s'ils utilisent leur emplacement actuel, par exemple:
              </p>

              {/* Cards Container */}
              <div className="space-y-0">
                {/* Card 1: Emplacement actuel */}
                <div className="bg-[#F5F5F7] rounded-[20px] p-4 text-left">
                  <div className="text-[12.5px] text-gray-500 font-normal mb-0.5">Position</div>
                  <div className="text-[18px] font-extrabold text-black mb-1">
                    {userProfile?.city || 'Votre ville'}
                  </div>
                  <div className="flex items-center space-x-1.5 text-[12px] text-gray-600 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-gray-600 shrink-0" strokeWidth={2} />
                    <span>Emplacement actuel</span>
                  </div>
                </div>

                {/* "ou" divider */}
                <div className="text-center text-[13px] text-gray-500 font-normal py-2.5">
                  ou
                </div>

                {/* Card 2: La localisation choisie */}
                <div className="bg-[#F5F5F7] rounded-[20px] p-4 text-left">
                  <div className="text-[12.5px] text-gray-500 font-normal mb-0.5">Position</div>
                  <div className="text-[18px] font-extrabold text-black mb-1">
                    {userProfile?.city || 'Votre ville'}
                  </div>
                  <div className="flex items-center space-x-1.5 text-[12px] text-gray-600 font-medium">
                    <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="18" height="12" rx="2" />
                      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>La localisation choisie</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2.5">
                <button 
                  onClick={() => setEditingField(null)}
                  className="w-full bg-[#121212] hover:bg-black text-white font-extrabold py-3.5 rounded-full text-[15px] shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                >
                  C'est compris
                </button>

                <button 
                  onClick={() => {
                    setEditingField(null);
                  }}
                  className="w-full bg-white border border-black text-black font-extrabold py-3.5 rounded-full text-[15px] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  Définir l'emplacement actuel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BlockedUsersMenu({ onClose }: { onClose: () => void }) {
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; name: string; photo?: string; verified?: boolean; dateBlocked?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/blocks')
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Liste indisponible');
        if (!cancelled) setBlockedUsers(payload?.blockedUsers || []);
      })
      .catch(error => {
        console.error('Chargement des blocages impossible:', error);
        if (!cancelled) showToast('Impossible de charger les utilisateurs bloqués');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleSelect = (id: string) => {
    if (!isEditing) return;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleUnblockSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const results = await Promise.all(selectedIds.map(id => authFetch(`/api/blocks/${encodeURIComponent(id)}`, { method: 'DELETE' })));
    if (results.some(response => !response.ok)) {
      showToast('Certains utilisateurs n’ont pas pu être débloqués');
      return;
    }
    setBlockedUsers(current => current.filter(u => !selectedIds.includes(u.id)));
    showToast(`${count} profil${count > 1 ? 's' : ''} débloqué${count > 1 ? 's' : ''} avec succès`);
    setSelectedIds([]);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-white z-[120] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[13px] font-semibold px-4 py-2 rounded-full z-[160] shadow-lg animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-100 shrink-0 relative">
        <button 
          type="button"
          onClick={isEditing ? () => { setIsEditing(false); setSelectedIds([]); } : onClose} 
          className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer z-10"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>

        <h2 className="text-[16px] sm:text-[17px] font-bold text-black tracking-tight absolute left-1/2 -translate-x-1/2">
          {isEditing ? 'Faites un choix' : 'Bloqués'}
        </h2>

        {blockedUsers.length > 0 && (
          <button 
            type="button"
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                setSelectedIds([]);
              } else {
                setIsEditing(true);
              }
            }} 
            className="text-[15px] sm:text-[16px] text-black font-normal hover:opacity-70 transition-opacity cursor-pointer z-10"
          >
            {isEditing ? 'Annuler' : 'Modifier'}
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh] text-sm text-gray-500">Chargement…</div>
        ) : blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3 text-emerald-600 shadow-xs">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-[16px] font-bold text-black mb-1">Aucun utilisateur bloqué</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[260px]">
              Votre liste d'utilisateurs bloqués est vide.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-7 max-w-md mx-auto">
            {blockedUsers.map((user, idx) => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <div 
                  key={`${user.id}-${idx}`} 
                  onClick={() => {
                    if (isEditing) {
                      toggleSelect(user.id);
                    }
                  }}
                  className={`flex flex-col items-center select-none ${isEditing ? 'cursor-pointer' : ''}`}
                >
                  {/* Avatar Circle */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden relative bg-gray-100 flex items-center justify-center shadow-xs">
                    {isEditing && isSelected ? (
                      <div className="w-full h-full bg-[#1c1c1e] flex items-center justify-center text-white">
                        <Check className="w-8 h-8 stroke-[2.5]" />
                      </div>
                    ) : (
                      user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> :
                        <UserIcon className="w-10 h-10 text-gray-400" />
                    )}
                  </div>

                  {/* Name + Verified Badge */}
                  <div className="flex items-center justify-center space-x-1 mt-2 text-center max-w-[100px]">
                    {user.verified && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1d9bf0] flex items-center justify-center shrink-0">
                        <Check className="w-2 h-2 text-white stroke-[3]" />
                      </div>
                    )}
                    <span className="text-[13px] sm:text-[14px] font-medium text-black tracking-tight truncate">
                      {user.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Button in Edit Mode */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white/95 backdrop-blur-md border-t border-gray-100 shrink-0 z-30 max-w-md mx-auto">
          <button 
            type="button"
            onClick={handleUnblockSelected}
            disabled={selectedIds.length === 0}
            className={`w-full py-3.5 rounded-full font-semibold text-[15px] sm:text-[16px] transition-all cursor-pointer flex items-center justify-center ${
              selectedIds.length > 0 
                ? 'bg-[#121212] hover:bg-black active:scale-[0.99] text-white shadow-xs' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {selectedIds.length > 0 
              ? `Je veux en débloquer ${selectedIds.length}` 
              : 'Sélectionnez des profils à débloquer'}
          </button>
        </div>
      )}
    </div>
  );
}

export function NotificationsSettingsMenu({ onClose }: { onClose: () => void }) {
  const NOTIFICATION_CATEGORIES = [
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'Recevez une notification quand vous avez reçu un message',
    },
    {
      id: 'matchs',
      title: 'Matchs',
      subtitle: 'Recevez une notification quand vous avez un nouveau Match',
    },
    {
      id: 'likes',
      title: 'Likes',
      subtitle: 'Recevez une notification quand vous avez un nouveau Like',
    },
    {
      id: 'visites',
      title: 'Visites sur votre profil',
      subtitle: "Recevez une notification quand quelqu'un consulte votre profil",
    },
    {
      id: 'favoris',
      title: 'Favoris',
      subtitle: "Recevez une notification quand quelqu'un met votre profil dans ses favoris",
    },
    {
      id: 'cadeaux',
      title: 'Cadeaux',
      subtitle: "Recevez une notification quand quelqu'un vous envoie un cadeau",
    },
    {
      id: 'promos',
      title: 'Conseils, promos et cadeaux',
      subtitle: 'Profitez de conseils et découvrez nos dernières promos',
    },
    {
      id: 'sondages',
      title: 'Enquêtes et sondages',
      subtitle: 'Recevez toutes les infos sur nos programmes de recherche rémunérés et non rémunérés, et aidez-nous à améliorer nos services',
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<{ id: string; title: string; subtitle: string } | null>(null);
  const [showNativeSystemSettingsModal, setShowNativeSystemSettingsModal] = useState(false);
  const [isSystemNotificationsEnabled, setIsSystemNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
    }
    return true;
  });

  const [categorySettings, setCategorySettings] = useState<Record<string, { inApp: boolean; push: boolean; email: boolean }>>(() => {
    const initial: Record<string, { inApp: boolean; push: boolean; email: boolean }> = {};
    NOTIFICATION_CATEGORIES.forEach(cat => {
      initial[cat.id] = { inApp: true, push: true, email: true };
    });
    return initial;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/notification-preferences')
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Préférences indisponibles');
        if (cancelled || !payload?.preferences) return;
        const preferences = payload.preferences;
        if (typeof preferences.system_enabled === 'boolean') {
          setIsSystemNotificationsEnabled(preferences.system_enabled);
        }
        if (preferences.categories && typeof preferences.categories === 'object') {
          setCategorySettings(current => ({ ...current, ...preferences.categories }));
        }
      })
      .catch(error => console.error('Chargement préférences notifications impossible:', error));
    return () => { cancelled = true; };
  }, []);

  const saveNotificationPreferences = async (updates: {
    system_enabled?: boolean;
    categories?: Record<string, { inApp: boolean; push: boolean; email: boolean }>;
  }) => {
    const response = await authFetch('/api/notification-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Sauvegarde impossible');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenNativeSystemNotificationSettings = async () => {
    // Request browser level notification permission if supported
    await requestNativeNotificationPermissionWithFlow();
    // Open the native system settings view
    setShowNativeSystemSettingsModal(true);
  };

  const handleToggleSystemNotifications = async () => {
    const nextState = !isSystemNotificationsEnabled;
    setIsSystemNotificationsEnabled(nextState);
    if (nextState && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    try {
      await saveNotificationPreferences({ system_enabled: nextState });
      showToast(nextState ? "Notifications système activées pour Bavel" : "Notifications système désactivées pour Bavel");
    } catch (error) {
      setIsSystemNotificationsEnabled(!nextState);
      showToast(error instanceof Error ? error.message : 'Impossible de sauvegarder les notifications');
    }
  };

  const toggleCategorySetting = async (catId: string, channel: 'inApp' | 'push' | 'email') => {
    const previous = categorySettings;
    const updated = {
      ...categorySettings,
      [catId]: {
        ...(categorySettings[catId] || { inApp: true, push: true, email: true }),
        [channel]: !(categorySettings[catId]?.[channel] ?? true)
      }
    };
    setCategorySettings(updated);
    try {
      await saveNotificationPreferences({ categories: updated });
    } catch (error) {
      setCategorySettings(previous);
      showToast(error instanceof Error ? error.message : 'Impossible de sauvegarder cette préférence');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f2f2f7] z-[120] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-200/80 shrink-0 relative">
        <button 
          onClick={() => {
            if (selectedCategory) {
              setSelectedCategory(null);
            } else {
              onClose();
            }
          }} 
          className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer z-10"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.2} />
        </button>
        <h2 className="text-[17px] font-bold text-black tracking-tight absolute left-1/2 -translate-x-1/2 truncate max-w-[65%] text-center">
          {selectedCategory ? selectedCategory.title : 'Notifications'}
        </h2>
        <div className="w-6" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#f2f2f7]">
        {!selectedCategory ? (
          /* Main Notifications List View (IMG_4409.PNG) */
          <div>
            {/* Top Promo Banner */}
            <div 
              onClick={handleOpenNativeSystemNotificationSettings}
              className="bg-[#f4f4f6] px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#ececee] transition-colors border-b border-gray-200/50"
            >
              <div className="flex items-center space-x-3.5 pr-2">
                <div className="w-8 h-8 rounded-full bg-[#ebe7ff] flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-[#1d1b20] fill-[#1d1b20]" strokeWidth={1} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[15px] font-bold text-black tracking-tight leading-tight">
                    Vous ne voulez rien manquer ?
                  </h3>
                  <p className="text-[13px] text-gray-500 font-normal leading-snug mt-0.5">
                    Recevez une notification en cas de Match ou message
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
            </div>

            {/* List of Notification Categories */}
            <div className="bg-white divide-y divide-gray-100">
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 pr-4">
                    <h4 className="text-[15px] font-bold text-black tracking-tight leading-tight">
                      {cat.title}
                    </h4>
                    <p className="text-[13px] text-gray-500 font-normal leading-snug mt-1">
                      {cat.subtitle}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Sub-category Detail Toggle View (IMG_4410.PNG) */
          <div>
            {/* Description Subtitle Bar */}
            <div className="bg-[#f2f2f7] px-4 py-3 border-b border-gray-200/60">
              <p className="text-[13px] text-gray-500 font-normal leading-relaxed">
                {selectedCategory.subtitle}
              </p>
            </div>

            {/* 3 Channels Toggles */}
            <div className="bg-white divide-y divide-gray-100 border-b border-gray-200/60">
              {/* Option 1: Notifications dans l'app */}
              <div className="px-4 py-3.5 flex items-center justify-between">
                <span className="text-[15px] font-medium text-black tracking-tight">
                  Notifications dans l'app
                </span>
                <button
                  type="button"
                  onClick={() => toggleCategorySetting(selectedCategory.id, 'inApp')}
                  className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    (categorySettings[selectedCategory.id]?.inApp ?? true) ? 'bg-[#30d158]' : 'bg-[#e9e9eb]'
                  }`}
                >
                  <div 
                    className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                      (categorySettings[selectedCategory.id]?.inApp ?? true) ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>

              {/* Option 2: Notifications push */}
              <div className="px-4 py-3.5 flex items-center justify-between">
                <span className="text-[15px] font-medium text-black tracking-tight">
                  Notifications push
                </span>
                <button
                  type="button"
                  onClick={() => toggleCategorySetting(selectedCategory.id, 'push')}
                  className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    (categorySettings[selectedCategory.id]?.push ?? true) ? 'bg-[#30d158]' : 'bg-[#e9e9eb]'
                  }`}
                >
                  <div 
                    className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                      (categorySettings[selectedCategory.id]?.push ?? true) ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>

              {/* Option 3: E-mails */}
              <div className="px-4 py-3.5 flex items-center justify-between">
                <span className="text-[15px] font-medium text-black tracking-tight">
                  E-mails
                </span>
                <button
                  type="button"
                  onClick={() => toggleCategorySetting(selectedCategory.id, 'email')}
                  className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    (categorySettings[selectedCategory.id]?.email ?? true) ? 'bg-[#30d158]' : 'bg-[#e9e9eb]'
                  }`}
                >
                  <div 
                    className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                      (categorySettings[selectedCategory.id]?.email ?? true) ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Native System Settings Notification Modal (Simulating Native OS Settings) */}
      <AnimatePresence>
        {showNativeSystemSettingsModal && (
          <SystemNotificationSettingsModal onClose={() => setShowNativeSystemSettingsModal(false)} />
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg z-[200]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AccountMenu({ onClose, userProfile, onLogout }: { onClose: () => void; userProfile?: any; onLogout?: () => void }) {
  const [hideAccount, setHideAccount] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bavel_account_hidden') === 'true';
    }
    return false;
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDeleteOption, setSelectedDeleteOption] = useState<string>('');
  const [showNewLogoutModal, setShowNewLogoutModal] = useState(false);
  const [showRegisterKeyModal, setShowRegisterKeyModal] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(() => {
    return getSavedBiometricUser() !== null;
  });

  // Edit contact state
  const [contactEmail, setContactEmail] = useState(userProfile?.email || '');
  const [contactPhone, setContactPhone] = useState(userProfile?.phone || '+225 07 00 00 00');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [contactSaving, setContactSaving] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPrivacySettings()
      .then(settings => {
        if (active && typeof settings?.profile_paused === 'boolean') {
          setHideAccount(settings.profile_paused);
        }
      })
      .catch(error => console.error('Privacy settings load failed:', error));
    return () => { active = false; };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const toggleHideAccount = async () => {
    const updated = !hideAccount;
    setHideAccount(updated);
    try {
      await updatePrivacySettings({ profile_paused: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem('bavel_account_hidden', String(updated));
      }
      showToast(updated ? 'Profil masqué de la découverte' : 'Profil désormais visible');
    } catch (error) {
      console.error('Profile pause update failed:', error);
      setHideAccount(!updated);
      showToast('Impossible de modifier la visibilité du profil');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    setPasswordError('');
    setPasswordMsg('');
    setPasswordLoading(true);

    const res = await updatePassword(newPassword);
    setPasswordLoading(false);

    if (res.error) {
      setPasswordError(res.error);
    } else {
      setPasswordMsg('Mot de passe mis à jour avec succès dans Supabase Auth.');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  const handleSaveContact = async () => {
    const email = contactEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      showToast('Adresse e-mail invalide');
      return;
    }
    setContactSaving(true);
    try {
      const client = getSupabase();
      const { error: authError } = await client.auth.updateUser({ email });
      if (authError) throw authError;
      const response = await authFetch('/api/user/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.id,
          profileData: { email }
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Profil non mis à jour');
      }
      setShowEditContactModal(false);
      showToast('Adresse e-mail mise à jour. Vérifiez le lien de confirmation.');
    } catch (error) {
      console.error('Contact update failed:', error);
      showToast('Impossible de mettre à jour cette adresse');
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await authFetch('/api/account', { method: 'DELETE' });
      if (!response.ok) throw new Error('Suppression impossible');
      onClose();
      onLogout?.();
    } catch (error) {
      console.error('Account deletion failed:', error);
      showToast('Suppression du compte impossible');
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      const response = await authFetch('/api/security/revoke-others', { method: 'POST' });
      if (!response.ok) throw new Error('Révocation impossible');
      showToast('Les autres sessions ont été fermées');
      setShowSessionsModal(false);
    } catch (error) {
      console.error('Session revocation failed:', error);
      showToast('Impossible de fermer les autres sessions');
    }
  };

  const handleDownloadArchive = async () => {
    try {
      const response = await authFetch('/api/account/export');
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Export impossible');
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bavel_account_export_${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('Export du compte téléchargé');
    } catch (error) {
      console.error('Account export failed:', error);
      showToast('Impossible de télécharger vos données');
    }
  };

  const handleLocalLogout = async () => {
    const result = await signOutFromSupabase();
    if (result.error) {
      showToast(result.error);
      return;
    }
    onClose();
    onLogout?.();
  };

  const handlePasskeyRegistration = async () => {
    setIsRegisteringPasskey(true);
    try {
      await registerCurrentPasskey();
      showToast('Clé d’accès créée avec succès');
      setShowRegisterKeyModal(false);
    } catch (error) {
      console.error('Passkey registration failed:', error);
      showToast(error instanceof Error ? error.message : 'Impossible de créer la clé d’accès');
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f2f2f7] z-[120] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-200/80 shrink-0 relative shadow-2xs">
        <button 
          type="button"
          onClick={onClose} 
          className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer z-10"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
        <h2 className="text-[16px] sm:text-[17px] font-bold text-black tracking-tight absolute left-1/2 -translate-x-1/2">
          Compte
        </h2>
        <div className="w-6" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-4 pb-10 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Card 1: Cacher le compte */}
          <div className="bg-white border-y border-gray-200/80 px-4 py-3.5 flex items-center justify-between">
            <span className="text-[15px] sm:text-[16px] font-normal text-black tracking-tight">
              Cacher le compte
            </span>
            <button 
              type="button"
              onClick={toggleHideAccount}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 shrink-0 cursor-pointer ${
                hideAccount ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
              }`}
            >
              <div className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                hideAccount ? 'translate-x-[22px]' : 'translate-x-[2px]'
              }`} />
            </button>
          </div>

          {/* Subtext under toggle */}
          <p className="text-[12.5px] sm:text-[13px] text-gray-500 font-normal text-center px-6 leading-snug">
            Si vous avez besoin de faire un break pendant quelque temps.
          </p>

          {/* Divider Line */}
          <div className="border-b border-gray-200/70 pt-2 mx-4" />

          {/* Section 2: Identifiants & Déconnexion */}
          <div className="pt-2 px-6 space-y-4 text-center">
            <p className="text-[13.5px] sm:text-[14px] text-gray-600 leading-snug font-normal max-w-[320px] mx-auto">
              Souvenez-vous de vos identifiants de connexion. Vous en aurez besoin pour vous connecter à nouveau.
            </p>

            <p className="text-[13.5px] sm:text-[14px] text-gray-700 font-medium tracking-tight">
              {contactEmail}
            </p>

            <div className="pt-2 max-w-[340px] mx-auto">
                <button 
                type="button"
                onClick={() => setShowNewLogoutModal(true)}
                className="w-full py-3.5 bg-[#121212] hover:bg-black active:scale-[0.99] text-white font-semibold text-[15px] rounded-full transition-all cursor-pointer shadow-xs flex items-center justify-center"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Link: Supprimer mon compte */}
        <div className="pt-16 pb-6 text-center">
          <button 
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[14px] sm:text-[14.5px] font-normal text-gray-500 hover:text-red-600 transition-colors cursor-pointer inline-block"
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Modal Modifier Contact */}
      {showEditContactModal && (
        <div className="fixed inset-0 bg-black/60 z-[140] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="font-bold text-[16px] text-black">Coordonnées de compte</h3>
              <button onClick={() => setShowEditContactModal(false)} className="p-1 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse e-mail</label>
                <input 
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Numéro de téléphone</label>
                <input 
                  type="tel"
                  value={contactPhone}
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 font-medium"
                />
                <p className="text-[11px] text-gray-500 mt-1">Le téléphone sera modifiable après activation de la vérification SMS.</p>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  onClick={() => setShowEditContactModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSaveContact}
                  disabled={contactSaving}
                  className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold"
                >
                  {contactSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mot de passe */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-[140] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-[16px] text-black">Mettre à jour le mot de passe</h3>
              </div>
              <button onClick={() => setShowChangePasswordModal(false)} className="p-1 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs font-medium space-y-3">
                <p>{passwordMsg}</p>
                <button 
                  onClick={() => setShowChangePasswordModal(false)}
                  className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black"
                  />
                </div>
                {passwordError && (
                  <div className="bg-rose-50 border border-rose-200 p-2 rounded-xl text-rose-700 text-xs font-medium">
                    {passwordError}
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowChangePasswordModal(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold"
                  >
                    {passwordLoading ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Sessions */}
      {showSessionsModal && (
        <div className="fixed inset-0 bg-black/60 z-[140] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <h3 className="font-bold text-[16px] text-black">Sessions connectées</h3>
              <button onClick={() => setShowSessionsModal(false)} className="p-1 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-black block">Cet appareil (Session actuelle)</span>
                  <span className="text-[11px] text-emerald-700">Session Supabase active sur ce navigateur</span>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full">Actif</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Supabase ne fournit pas la liste détaillée des appareils à cette interface. La révocation ferme réellement toutes les autres sessions.
              </p>
            </div>
            <button
              onClick={handleRevokeOtherSessions}
              className="w-full py-2.5 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100"
            >
              Déconnecter les autres appareils
            </button>
          </div>
        </div>
      )}

      {/* Modal de Suppression de Compte avec 6 options */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative z-10"
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="text-center space-y-4">
              <h3 className="text-[18px] font-bold text-black">Voulez-vous vraiment supprimer votre compte ?</h3>
              
              <p className="text-[14px] text-gray-700 leading-relaxed">
                Si vous souhaitez juste le masquer momentanément ou recommencer à zéro, vous pouvez :
              </p>

              {/* Radio Options */}
              <div className="space-y-3 text-left">
                {[
                  { id: 'likes_only', label: 'Faire en sorte que votre profil ne soit vu que par les personnes à qui vous donnez un Like' },
                  { id: 'hide_account', label: 'Masquer votre compte pour ne pas être visible' },
                  { id: 'erase_activity', label: 'Effacer toute activité' },
                  { id: 'disable_notifications', label: 'Désactiver les notifications' },
                  { id: 'logout', label: 'Vous déconnecter' },
                  { id: 'delete_account', label: 'Supprimer votre compte' }
                ].map((option) => (
                  <label key={option.id} className="flex items-start space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="delete_option"
                      value={option.id}
                      checked={selectedDeleteOption === option.id}
                      onChange={(e) => setSelectedDeleteOption(e.target.value)}
                      className="mt-1 w-4 h-4 text-black"
                    />
                    <span className="text-[14px] text-gray-700 leading-relaxed">{option.label}</span>
                  </label>
                ))}
              </div>

              {/* Continue Button */}
              <button 
                onClick={async () => {
                  if (!selectedDeleteOption) return;
                  
                  setShowDeleteConfirm(false);
                  
                  // Apply the selected action immediately
                  switch (selectedDeleteOption) {
                    case 'likes_only':
                      showToast('Cette option nécessite une configuration de confidentialité dédiée');
                      break;
                    case 'hide_account':
                      toggleHideAccount();
                      break;
                    case 'erase_activity':
                      showToast('Effacement d’activité indisponible sans confirmation serveur');
                      break;
                    case 'disable_notifications':
                      showToast('Gérez les notifications depuis le menu Notifications');
                      break;
                    case 'logout':
                      await handleLocalLogout();
                      break;
                    case 'delete_account':
                      showToast('Utilisez la confirmation de suppression du compte');
                      setShowDeleteConfirm(true);
                      break;
                  }
                  
                  setSelectedDeleteOption('');
                }}
                disabled={!selectedDeleteOption}
                className="w-full py-3 bg-black hover:bg-gray-900 text-white font-semibold text-[15px] rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Nouveau Modal de Déconnexion selon le design */}
      <AnimatePresence>
        {showNewLogoutModal && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0" onClick={() => setShowNewLogoutModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative z-10"
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setShowNewLogoutModal(false)}
                  className="p-1 text-gray-400 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="text-center space-y-4">
                <h3 className="text-[18px] font-bold text-black">Prêt(e) à vous déconnecter ?</h3>
                
                <div className="space-y-3 text-left">
                  <p className="text-[14px] text-gray-700 leading-relaxed">
                    Les autres personnes pourront toujours voir votre profil.
                  </p>
                  <p className="text-[14px] text-gray-700 leading-relaxed">
                    Une clé d’accès vous permettra de vous reconnecter rapidement et en toute sécurité. Vous pourrez toujours vous déconnecter sans en créer une.
                  </p>
                </div>

                {/* Buttons */}
                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => {
                      setShowNewLogoutModal(false);
                      setShowRegisterKeyModal(true);
                    }}
                    className="w-full py-3 bg-black hover:bg-gray-900 text-white font-semibold text-[15px] rounded-full transition-all cursor-pointer"
                  >
                    Créer une clé d'accès
                  </button>

                  <button 
                    onClick={async () => {
                      setShowNewLogoutModal(false);
                      await handleLocalLogout();
                    }}
                    className="w-full py-3 bg-white border border-black hover:bg-gray-50 text-black font-semibold text-[15px] rounded-full transition-all cursor-pointer"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal d’enregistrement d’une clé d’accès Supabase */}
      <AnimatePresence>
        {showRegisterKeyModal && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Fermer"
              className="absolute inset-0 cursor-default"
              onClick={() => setShowRegisterKeyModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold text-black">Enregistrer une clé d’accès</h3>
                <button
                  type="button"
                  onClick={() => setShowRegisterKeyModal(false)}
                  className="p-1 text-gray-400 hover:text-black cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[14px] text-gray-700 leading-relaxed mb-5">
                Enregistrez une clé d’accès pour {userProfile?.email || 'votre compte'}. Votre appareil vous proposera les options compatibles, y compris les clés synchronisées ou un autre appareil si disponible.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void handlePasskeyRegistration()}
                  disabled={isRegisteringPasskey}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[15px] rounded-full transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {isRegisteringPasskey ? 'Enregistrement…' : 'Ajouter une clé d’accès'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegisterKeyModal(false)}
                  disabled={isRegisteringPasskey}
                  className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-black font-semibold text-[15px] rounded-full transition-all cursor-pointer disabled:opacity-60"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg z-[200]"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TextSizeSettingsMenu({ 
  onClose, 
  textScale, 
  onChangeTextScale 
}: { 
  onClose: () => void; 
  textScale: number; 
  onChangeTextScale: (scale: number) => void; 
}) {
  const options = [
    { label: 'Petit', scale: 0.9, desc: 'A-', detail: 'Économise de l\'espace' },
    { label: 'Normal', scale: 1.0, desc: 'A', detail: 'Taille par défaut' },
    { label: 'Grand', scale: 1.15, desc: 'A+', detail: 'Recommandé pour mobile' },
    { label: 'Très grand', scale: 1.3, desc: 'A++', detail: 'Lisibilité maximale' }
  ];

  return (
    <div className="fixed inset-0 bg-[#f8f9fa] z-[120] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-100 shrink-0 relative">
        <button 
          onClick={onClose} 
          className="p-2 -ml-2 text-black hover:opacity-70 transition-opacity cursor-pointer"
          aria-label="Retour"
        >
          <ChevronLeft className="w-7 h-7 text-black" strokeWidth={2.5} />
        </button>

        <h2 className="text-[17px] font-bold text-black tracking-tight pt-2">
          Taille du texte
        </h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-[14px] text-gray-500 leading-relaxed px-2">
            Adaptez la taille des caractères pour une lecture confortable et parfaitement adaptée à votre écran mobile.
          </p>
        </div>

        {/* Live Preview Box */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Aperçu en direct</span>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-[14px]">💖</span>
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                <p className="text-[14px] text-black font-semibold">Aminata, 24 ans</p>
                <p className="text-[13px] text-gray-600 mt-1">
                  Bonjour ! Bienvenue sur Bavel. Trouvons ensemble l'amour à Abidjan ! ✨
                </p>
              </div>
            </div>

            <div className="flex items-start justify-end space-x-3">
              <div className="bg-[#e20030] text-white rounded-2xl rounded-tr-none p-3 max-w-[80%]">
                <p className="text-[13px] font-medium">
                  C'est parfait, les caractères s'adaptent instantanément ! 😍
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector List */}
        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = textScale === opt.scale;
            return (
              <button
                key={opt.scale}
                onClick={() => onChangeTextScale(opt.scale)}
                className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-[#e20030] bg-rose-50/50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-[18px] font-bold w-10 text-center ${isSelected ? 'text-[#e20030]' : 'text-gray-400'}`}>
                    {opt.desc}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-semibold text-black">{opt.label}</span>
                    <span className="text-[12px] text-gray-500">{opt.detail}</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-[#e20030] bg-[#e20030]' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Tactile Slider */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center text-[12px] text-gray-400 font-bold px-1">
            <span>A- (PETIT)</span>
            <span>STANDARD</span>
            <span>A++ (GRAND)</span>
          </div>
          <div className="relative flex items-center px-1">
            <input 
              type="range" 
              min="0.9" 
              max="1.3" 
              step="0.05" 
              value={textScale} 
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                let snapped = val;
                if (Math.abs(val - 0.9) < 0.04) snapped = 0.9;
                else if (Math.abs(val - 1.0) < 0.04) snapped = 1.0;
                else if (Math.abs(val - 1.15) < 0.04) snapped = 1.15;
                else if (Math.abs(val - 1.3) < 0.04) snapped = 1.3;
                onChangeTextScale(snapped);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#e20030]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsMenu({ 
  onClose, 
  userProfile, 
  setUserProfile, 
  onLogout,
  textScale,
  onChangeTextScale,
  onOpenAdmin
}: { 
  onClose: () => void; 
  userProfile?: any; 
  setUserProfile?: React.Dispatch<React.SetStateAction<any>>; 
  onLogout?: () => void;
  textScale: number;
  onChangeTextScale: (scale: number) => void;
  onOpenAdmin?: () => void;
}) {
  const [showInfos, setShowInfos] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showNotificationsSettings, setShowNotificationsSettings] = useState(false);
  const [showSystemNotificationModal, setShowSystemNotificationModal] = useState(false);
  const [showConfidentiality, setShowConfidentiality] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showInvisibleMode, setShowInvisibleMode] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showTextSizeSettings, setShowTextSizeSettings] = useState(false);
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  const [showExperienceControl, setShowExperienceControl] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showRestorePurchases, setShowRestorePurchases] = useState(false);
  const { userRole, isAdmin, user } = useAuth();
  const isUserAdmin = Boolean(
    isAdmin || 
    userRole === 'admin' || 
    user?.role === 'admin' || 
    user?.isAdmin === true || 
    isAdmin
  );

  useEffect(() => {
    const handleBavelNavigate = (e: any) => {
      if (e.detail === 'swipe' || e.detail === 'encounters' || e.detail === 'rencontres') {
        onClose();
      }
    };
    window.addEventListener('bavel_navigate', handleBavelNavigate);
    return () => window.removeEventListener('bavel_navigate', handleBavelNavigate);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-[#f2f2f2] z-[100] flex flex-col h-[100dvh] overflow-hidden">
      {showInfos && (
        <InfosMenu 
          onClose={() => setShowInfos(false)} 
          userProfile={userProfile} 
          setUserProfile={setUserProfile} 
        />
      )}
      {showTextSizeSettings && (
        <TextSizeSettingsMenu 
          onClose={() => setShowTextSizeSettings(false)} 
          textScale={textScale} 
          onChangeTextScale={onChangeTextScale} 
        />
      )}
      {showExperienceControl && (
        <ExperienceControlModal
          onClose={() => setShowExperienceControl(false)}
          userProfile={userProfile}
          onUpdateProfile={(updated) => {
            setUserProfile?.(updated);
            syncProfileToSupabase(updated);
          }}
        />
      )}
      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}
      {showRestorePurchases && (
        <RestorePurchasesModal onClose={() => setShowRestorePurchases(false)} />
      )}

      {showBlockedUsers && (
        <BlockedUsersMenu onClose={() => setShowBlockedUsers(false)} />
      )}

      {showNotificationsSettings && (
        <NotificationsSettingsMenu onClose={() => setShowNotificationsSettings(false)} />
      )}

      {showSystemNotificationModal && (
        <SystemNotificationSettingsModal onClose={() => setShowSystemNotificationModal(false)} />
      )}

      {showConfidentiality && (
        <ConfidentialityMenu 
          onClose={() => setShowConfidentiality(false)}
        />
      )}

      {showTerms && (
        <TermsOfServiceMenu onClose={() => setShowTerms(false)} />
      )}

      {showInvisibleMode && (
        <InvisibleModeMenu 
          onClose={() => setShowInvisibleMode(false)}
        />
      )}

      {showAccountMenu && (
        <AccountMenu 
          onClose={() => setShowAccountMenu(false)} 
          userProfile={userProfile}
          onLogout={() => {
            onClose();
            onLogout?.();
          }}
        />
      )}

      {showHelpCenter && (
        <HelpCenterMenu onClose={() => setShowHelpCenter(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-center relative pt-8 pb-3 px-4 bg-white border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="absolute left-4 p-1.5 -ml-1 top-7.5 cursor-pointer hover:opacity-70 transition-opacity">
          <ChevronLeft className="w-5 h-5 text-black" strokeWidth={2.5} />
        </button>
        <h2 className="text-[14.5px] font-bold text-black pt-1">Paramètres</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
        {/* Section 1: Notifications Promo */}
        <div 
          onClick={async () => {
            await requestNativeNotificationPermissionWithFlow();
            setShowSystemNotificationModal(true);
          }}
          className="bg-white px-4 py-3 mb-2.5 flex items-center justify-between mt-0 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start space-x-2.5 pr-3">
            <div className="w-8 h-8 bg-[#f3e5ff] rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-black fill-black" strokeWidth={1} />
            </div>
            <div className="flex flex-col">
              <span className="text-[13.5px] text-black font-semibold">Vous ne voulez rien manquer ?</span>
              <span className="text-[12px] text-gray-500 leading-snug">Recevez une notification en cas de Match ou message</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </div>

        {/* Section 2: Modifier infos */}
        <div className="bg-white mb-2.5">
          <button 
            onClick={() => setShowInfos(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors text-left"
          >
            <span className="text-[14px] text-black font-medium">Modifier les infos de base</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {/* Section 3: Facebook */}
        <div className="bg-white px-4 py-2.5 mb-2.5 flex flex-col items-start space-y-1.5">
          <span className="text-[14px] text-black font-medium">Suivez Bavel sur Facebook !</span>
          <a 
            href="https://www.facebook.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#1877f2] text-white font-medium text-[13px] px-2.5 py-1 rounded-[4px] flex items-center space-x-1.5 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.004 22H11v-9.5h-2.5v-3H11v-1.921C11 5.373 12.316 4 15.011 4H17v3h-1.558C14.73 7 14.545 7.42 14.545 8.163V9.5h2.812l-.464 3H14.545V22z"/>
            </svg>
            <span>J'aime</span>
          </a>
        </div>

        {/* Section 4: About & Legal */}
        <div className="bg-white mb-2.5">
          <button 
            onClick={() => setShowAboutModal(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">À propos</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => setShowTerms(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Conditions générales d'utilisation</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => setShowHelpCenter(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Obtenir de l'aide</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Section 5: Account Settings */}
        <div className="bg-white mb-2.5">
          <button 
            onClick={() => setShowExperienceControl(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Contrôlez votre expérience</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => setShowNotificationsSettings(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Notifications</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => setShowTextSizeSettings(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Taille du texte</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-[12.5px] text-gray-400">
                {textScale === 0.9 ? 'Petit (A-)' : textScale === 1.15 ? 'Grand (A+)' : textScale === 1.3 ? 'Très grand (A++)' : 'Normal (A)'}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>
          <button 
            onClick={() => setShowConfidentiality(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Confidentialité</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => setShowAccountMenu(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Compte</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-[12.5px] text-gray-400 max-w-[140px] truncate">
                {userProfile?.email || userProfile?.phone || 'Compte actif'}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </div>
          </button>
          <button 
            onClick={() => setShowInvisibleMode(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Mode Invisible</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => setShowBlockedUsers(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Utilisateurs bloqués</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Section 6: Restore Purchases */}
        <div className="bg-white mb-2.5">
          <button 
            onClick={() => setShowRestorePurchases(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <span className="text-[14px] text-black font-medium">Récupérer mes achats</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Section 7: Admin Panel (Accessible et visible UNIQUEMENT pour les administrateurs) */}
        {isUserAdmin && (
          <div className="bg-white mb-6">
            <button 
              onClick={() => {
                onClose();
                onOpenAdmin?.();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-purple-50/50 transition-colors cursor-pointer text-left border-b border-gray-100 group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                  ⚡
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] text-purple-700 font-bold group-hover:text-purple-800">
                    Panel Administrateur Back-Office
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Gestion membres, signalements et sécurité
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                Admin 👑
              </span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
// Helper data for quiz options
export const PROMPT_OPTIONS_MAP: Record<string, string[]> = {
  "Qu'est-ce que vous appréciez le plus chez un partenaire ?": [
    "Proche de sa famille",
    "Qui soutient mes projets et mes rêves",
    "Toujours partant(e) for l'aventure",
    "Une excellente communication",
    "Honnête, mais bienveillant(e)"
  ],
  "Comment votre meilleur(e) ami(e) vous décrirait-il/elle ?": [
    "L'âme de la fête",
    "Toujours en avance",
    "Hyper attentionné(e)",
    "Un vrai cordon bleu",
    "Un(e) spécialiste pour résoudre les problèmes"
  ],
  "Sur quoi devons-nous être sur la même longueur d'onde ?": [
    "La vision politique",
    "L'importance de la famille",
    "Ce que nous recherchons ici",
    "Le super-pouvoir idéal",
    "Les projets à 5 ans"
  ],
  "Qu'est-ce qui vous impressionne ?": [
    "Être suivi(e) en thérapie",
    "La régularité à la salle de sport",
    "Un vrai talent culinaire maison",
    "De super recommandations de bars",
    "La bienveillance au quotidien"
  ],
  "Quelle est votre qualité préférée chez vous ?": [
    "Mon excellent goût musical",
    "Ma capacité à te faire rire",
    "Ma loyauté sans faille",
    "Mon côté spirituel",
    "Mon attachement à mes proches"
  ],
  "Qu'essayez-vous encore de comprendre ?": [
    "Comment fonctionne la Bourse",
    "Le secret du bonheur durable",
    "Pourquoi je suis toujours en retard",
    "Le sens de la vie, de l'univers et du reste",
    "Comment cuisiner le risotto parfait"
  ],
  "Si vous deviez choisir une seule fête, ce serait laquelle ?": [
    "Noël, pour l'esprit de famille",
    "Halloween, pour les costumes",
    "Le Nouvel An, pour la fête",
    "La Fête de la Musique",
    "Mon propre anniversaire"
  ],
  "Qu'est-ce que vous gardez toujours dans votre voiture ?": [
    "Un kit de survie (snack et eau)",
    "Une playlist incroyable",
    "Trop de tickets de parking",
    "Des lunettes de soleil de rechange",
    "Un parapluie que j'oublie d'utiliser"
  ],
  "Que doit-on savoir sur vous avant de sortir ensemble ?": [
    "Je suis accro au café",
    "Je ne suis pas du matin",
    "J'adore les animaux",
    "Je suis très famille",
    "Je suis passionné(e) par mon travail"
  ],
  "Le meilleur endroit pour un rendez-vous cinéma ?": [
    "Un vieux cinéma de quartier",
    "Un drive-in sous les étoiles",
    "Une salle IMAX avec un son énorme",
    "Mon canapé avec Netflix",
    "Un festival de court-métrages"
  ],
  "Que recherchez-vous ?": [
    "Le grand amour, tout simplement",
    "Quelqu'un pour explorer la ville",
    "Une relation sans prise de tête",
    "Ma moitié pour construire un foyer",
    "Une complicité unique et sincère"
  ],
  "Quel est votre plus grand critère rédhibitoire ?": [
    "Le manque de politesse",
    "Le fait de ne pas aimer les animaux",
    "L'absence d'humour",
    "Être trop scotché à son téléphone",
    "Ne jamais vouloir sortir de chez soi"
  ],
  "Quel est le métier de vos rêves ?": [
    "Testeur(se) d'hôtels de luxe",
    "Protecteur(se) de la faune sauvage",
    "Astronaute pour voir la Terre de haut",
    "Artiste reconnu(e)",
    "J'exerce déjà le métier de mes rêves"
  ],
  "À quoi ressemble l'amour selon vous ?": [
    "Partager les tâches ménagères sans râler",
    "Se soutenir dans les moments difficiles",
    "Rire ensemble tous les jours",
    "Se laisser de l'espace",
    "Construire un projet commun"
  ],
  "Comment aimez-vous passer vos week-ends ?": [
    "En pleine nature",
    "Sous la couette avec un bon film",
    "En terrasse avec des amis",
    "À cuisiner de bons petits plats",
    "À découvrir de nouveaux endroits"
  ],
  "Qu'est-ce qui vous fait rire ?": [
    "L'humour noir et décalé",
    "Les jeux de mots foireux",
    "Les vidéos de chats maladroits",
    "Les imitations ratées",
    "Mon propre sens de l'autodérision"
  ],
  "À quoi ressemble la vie de vos rêves ?": [
    "Voyager sans fin autour du monde",
    "Une petite maison calme à la campagne",
    "Une carrière brillante en ville",
    "Être entouré(e) de ma grande famille",
    "Avoir du temps libre pour mes passions"
  ],
  "Quelle est la chose incontournable sur votre liste de souhaits ?": [
    "Voir les aurores boréales",
    "Sauter en parachute",
    "Apprendre une troisième langue",
    "Écrire un livre",
    "Faire un road-trip aux USA"
  ],
  "Quelle est la cause qui vous tient particulièrement à cœur ?": [
    "La protection de l'environnement",
    "Le bien-être animal",
    "L'éducation pour tous",
    "La santé mentale",
    "L'égalité des chances"
  ],
  "Quel est votre genre de musique préféré ?": [
    "Le Rock sous toutes ses formes",
    "Le Hip-hop et le R&B",
    "La musique électronique",
    "Le Jazz et le Blues",
    "La Variété française et internationale"
  ],
  "Quel est votre premier rendez-vous idéal ?": [
    "Un café en terrasse",
    "Une balade dans un parc",
    "Un dîner aux chandelles",
    "Une activité insolite (escape game, mini-golf)",
    "Un verre dans un bar caché"
  ],
  "Que pensez-vous de l'astrologie ?": [
    "J'y crois dur comme fer",
    "C'est sympa pour s'amuser",
    "Uniquement si mon horoscope est bon",
    "C'est du grand n'importe quoi",
    "Je ne connais même pas mon signe"
  ],
  "Qu'est-ce que les gens devraient savoir sur vous ?": [
    "Je suis plus drôle en vrai",
    "Je suis un(e) grand(e) sensible",
    "Je suis très indépendant(e)",
    "Je suis un(e) vrai(e) passionné(e)",
    "Je suis plus calme qu'il n'y paraît"
  ],
  "De quoi êtes-vous le/la plus fier(e) ?": [
    "Mon parcours professionnel",
    "Mes amitiés solides",
    "Mon courage face aux épreuves",
    "Ma créativité sans limite",
    "Ma capacité à rester positif(ve)"
  ],
  "Qu'essayez-vous d'apprendre en ce moment ?": [
    "Une nouvelle langue",
    "Le code informatique",
    "À jouer d'un instrument",
    "À mieux cuisiner",
    "À lâcher prise"
  ],
  "Quel est votre objectif amoureux cette année ?": [
    "Trouver mon âme sœur",
    "Faire de belles rencontres",
    "Apprendre à mieux communiquer",
    "Prendre mon temps",
    "Vivre une passion intense"
  ],
  "Comment prenez-vous soin de vous ?": [
    "Sport et alimentation saine",
    "Méditation et lecture",
    "Soirées entre amis",
    "Week-ends en solo",
    "Gommages et bains moussants"
  ],
  "À quoi ressembliez-vous au lycée ?": [
    "Le/la premier(e) de la classe",
    "L'artiste un peu rebelle",
    "Le/la sportif(ve) populaire",
    "Celui/celle qui dormait au fond",
    "Le/la rigolo(te) de service"
  ],
  "Quel est votre avis sur la monogamie ?": [
    "C'est ma vision de l'amour",
    "Chacun fait ce qu'il veut",
    "C'est un engagement sacré",
    "C'est parfois difficile mais beau",
    "Je préfère les relations libres"
  ],
  "Au cinéma, que regardez-vous ?": [
    "Des films d'action qui bougent",
    "Des comédies romantiques",
    "Des thrillers psychologiques",
    "Des documentaires passionnants",
    "Des films d'auteur pointus"
  ],
  "Quelle est votre façon préférée de passer un week-end ?": [
    "Partir en escapade imprévue",
    "Recevoir du monde à dîner",
    "Faire une grasse matinée royale",
    "Pratiquer mon sport favori",
    "Aller à des expos ou concerts"
  ],
  "Quel est votre sport préféré à regarder ?": [
    "Le Football",
    "Le Tennis",
    "Le Basketball",
    "Le Rugby",
    "Le Patinage artistique"
  ]
};

export function HelpCenterMenu({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'aide' | 'notifications'>('aide');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<{ title: string; content: string[] } | null>(null);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Bonjour ! Je suis l\'assistant support Bavel. Comment puis-je vous aider aujourd\'hui ?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [articleFeedback, setArticleFeedback] = useState<boolean | null>(null);

  const articlesData: Record<string, { title: string; content: string[] }> = {
    'Utiliser Bavel': {
      title: 'Guide d\'utilisation de Bavel',
      content: [
        'Bienvenue sur Bavel ! Bavel est l\'application de rencontre n°1 en Côte d\'Ivoire.',
        '1. **Découvrir des profils** : Allez dans l\'onglet Découvrir et balayez les profils ou utilisez les filtres par critères (âge, localisation, intention).',
        '2. **Liker & Matcher** : Cliquez sur le cœur ou le bouton Like. Si la personne vous like en retour, c\'est un Match !',
        '3. **Messagerie instantanée** : Discutez en temps réel, envoyez des messages vocaux, des photos ou passez un appel audio/vidéo.',
        '4. **Moods & Intention** : Définissez votre humeur du jour et ce que vous recherchez (Relation sérieuse, Discuter, etc.).'
      ]
    },
    'Votre profil': {
      title: 'Optimiser votre profil Bavel',
      content: [
        'Un profil complet attire jusqu\'à 5x plus de matchs !',
        '• Ajoutez au moins 3 photos récentes et souriantes.',
        '• Remplissez votre biographie avec des détails authentiques.',
        '• Renseignez votre profession, ville et passions.',
        '• Faites vérifier vos photos pour obtenir le badge Bleu vérifié de sécurité !'
      ]
    },
    'Confidentialité et sécurité': {
      title: 'Conseils de sécurité & Confidentialité',
      content: [
        'Votre sécurité est notre priorité absolue :',
        '• Ne partagez jamais vos coordonnées bancaires ou mots de passe.',
        '• Utilisez la messagerie Bavel avant de partager votre numéro de téléphone personnel.',
        '• Bloquez et signalez tout comportement suspect ou inapproprié.',
        '• Pour vos premières rencontres en réel, choisissez toujours un lieu public (café, restaurant, centre commercial) et prévenez un ami.'
      ]
    },
    'Rencontrer un match en personne': {
      title: 'Préparer un premier rendez-vous en sécurité',
      content: [
        'Voici les règles d\'or pour votre premier rendez-vous :',
        '1. Rendez-vous dans un endroit public très fréquenté.',
        '2. Assurez votre propre moyen de transport pour aller et revenir.',
        '3. Partagez votre position en direct avec une personne de confiance.',
        '4. Écoutez votre instinct. Si vous ne vous sentez pas à l\'aise, n\'hésitez pas à écourter le rendez-vous.'
      ]
    },
    'Signaler une personne': {
      title: 'Comment signaler un profil ou un message ?',
      content: [
        'Si un utilisateur enfreint nos règles de communauté :',
        '1. Allez sur son profil ou dans votre conversation.',
        '2. Cliquez sur les 3 petits points (...) ou sur l\'icône Bouclier.',
        '3. Sélectionnez "Signaler un abus" et choisissez le motif.',
        '4. Notre équipe de modération 24/7 examinera immédiatement votre signalement et prendra les mesures nécessaires.'
      ]
    },
    'Vérifier vos photos': {
      title: 'Obtenir le badge vérifié',
      content: [
        'La vérification de photo confirme que vous êtes bien la personne sur vos photos.',
        '1. Allez dans Profil > Éditer > Vérification.',
        '2. Prenez un selfie en reproduisant la pose affichée à l\'écran.',
        '3. Notre système vérifie la correspondance biométrique en quelques secondes.',
        '4. Le badge bleu de vérification apparaîtra sur votre profil !'
      ]
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    setTimeout(() => {
      let reply = "Merci pour votre message. Un agent de support Bavel a bien reçu votre demande et vous répondra très rapidement.";
      const lower = userText.toLowerCase();
      if (lower.includes('match') || lower.includes('like')) {
        reply = "Pour optimiser vos matchs et likes, assurez-vous d'avoir au moins 3 belles photos et d'activer la géolocalisation !";
      } else if (lower.includes('compte') || lower.includes('mot de passe')) {
        reply = "Vous pouvez modifier votre mot de passe et gérer les options de votre compte dans Paramètres > Compte.";
      } else if (lower.includes('paiement') || lower.includes('abonnement') || lower.includes('crédit')) {
        reply = "Pour vos achats de crédits ou d'abonnements, les transactions sont sécurisées par Orange Money, Wave et carte bancaire.";
      }
      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-white z-[120] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header matching IMG_4491 / IMG_4492 */}
      <div className="flex flex-col pt-9 shrink-0 bg-white relative">
        <div className="flex items-center justify-between px-4 pt-2 pb-3 relative">
          <div className="w-6" /> {/* Left spacer for visual balance */}
          <h2 className="text-[17px] font-bold text-black tracking-tight text-center">Centre d'aide</h2>
          <button 
            onClick={onClose} 
            className="p-1 -mr-1 text-black hover:opacity-70 transition-opacity cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-6 h-6 text-black" strokeWidth={2.2} />
          </button>
        </div>

        {/* Tabs: Obtenir de l'aide / Notifications */}
        <div className="flex border-b border-gray-200 bg-white">
          <button 
            onClick={() => setTab('aide')}
            className={`flex-1 py-3 text-[15px] font-bold transition-all cursor-pointer text-center relative ${
              tab === 'aide' ? 'text-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            Obtenir de l'aide
            {tab === 'aide' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
            )}
          </button>
          
          <button 
            onClick={() => setTab('notifications')}
            className={`flex-1 py-3 text-[15px] font-bold transition-all cursor-pointer text-center relative ${
              tab === 'notifications' ? 'text-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            Notifications
            {tab === 'notifications' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-white">
        {tab === 'aide' ? (
          <div className="p-4 space-y-5 pb-12 max-w-lg mx-auto">
            {/* Search Header */}
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight mb-2.5">
                Que pouvons-nous faire pour vous aider ?
              </h3>
              <div className="bg-[#f4f4f6] rounded-full h-[46px] flex items-center px-4">
                <Search className="w-5 h-5 text-gray-800 mr-2.5 shrink-0" strokeWidth={2} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher"
                  className="bg-transparent border-none outline-none w-full text-[15px] text-black placeholder-gray-400 font-normal"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 text-gray-400 hover:text-black">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Section 1: Parcourir par sujet */}
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight mb-3">
                Parcourir par sujet
              </h3>
              <div className="flex flex-col space-y-3">
                {[
                  { 
                    key: 'Utiliser Bavel', 
                    title: 'Utiliser Bavel', 
                    desc: 'Votre guide pour matcher, discuter et faire des rencontres.' 
                  },
                  { 
                    key: 'Votre profil', 
                    title: 'Votre profil', 
                    desc: 'Pour vous aider à vous montrer sous votre meilleur jour.' 
                  },
                  { 
                    key: 'Confidentialité et sécurité', 
                    title: 'Confidentialité et sécurité', 
                    desc: 'Articles d\'aide pour assurer votre sécurité et celle de notre communauté.' 
                  }
                ]
                .filter(item => !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <button 
                    key={item.key}
                    onClick={() => {
                      setArticleFeedback(null);
                      setSelectedArticle(articlesData[item.key] || { title: item.title, content: [item.desc] });
                    }}
                    className="bg-white border border-gray-200/90 rounded-[20px] p-4 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors cursor-pointer active:scale-[0.99]"
                  >
                    <div className="pr-3">
                      <h4 className="text-[16px] font-bold text-black">{item.title}</h4>
                      <p className="text-[13.5px] text-gray-500 leading-snug mt-1">
                        {item.desc}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black shrink-0" strokeWidth={2.2} />
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Sujets fréquents */}
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight mb-3">
                Sujets fréquents
              </h3>
              <div className="bg-white border border-gray-200/90 rounded-[20px] overflow-hidden divide-y divide-gray-100">
                {[
                  'Rencontrer un match en personne',
                  'Signaler une personne',
                  'Vérifier vos photos'
                ]
                .filter(title => !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((title) => (
                  <button 
                    key={title}
                    onClick={() => {
                      setArticleFeedback(null);
                      setSelectedArticle(articlesData[title] || { title, content: ['Informations détaillées concernant ' + title] });
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-black shrink-0" strokeWidth={1.8} />
                      <span className="text-[15px] font-bold text-black tracking-tight">
                        {title}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Card: Vous avez encore une question ? */}
            <div className="bg-white border border-gray-200/90 rounded-[22px] p-4 flex items-center justify-between mt-6 mb-6">
              <div className="pr-3">
                <h4 className="text-[15.5px] font-bold text-black">
                  Vous avez encore une question ?
                </h4>
                <p className="text-[13px] text-gray-500 leading-snug mt-0.5">
                  Discutez avec le service d'aide par chat
                </p>
              </div>
              <button 
                onClick={() => setShowLiveChat(true)}
                className="bg-[#111111] hover:bg-black text-white px-4 py-2 rounded-full font-bold text-[13.5px] shrink-0 transition-all cursor-pointer active:scale-95"
              >
                Discuter
              </button>
            </div>
          </div>
        ) : (
          /* Tab 2: Notifications (IMG_4492.PNG) */
          <div className="flex flex-col items-center justify-center min-h-[55vh] px-6 text-center">
            <h3 className="text-[17px] font-bold text-black tracking-tight mb-2">
              L'évolution de nos échanges est ici
            </h3>
            <p className="text-[13.5px] sm:text-[14px] text-gray-500 leading-relaxed max-w-[340px]">
              L'état d'avancement ou le récapitulatif de vos signalements ou de vos échanges avec le service d'aide est disponible ici.
            </p>
          </div>
        )}
      </div>

      {/* Modal Article d'aide */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/60 z-[140] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <h3 className="font-bold text-[15px] text-black pr-2 line-clamp-1">{selectedArticle.title}</h3>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs text-gray-700 leading-relaxed">
              {selectedArticle.content.map((paragraph, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-gray-700">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 mt-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500 font-medium">Cet article vous a aidé ?</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setArticleFeedback(true)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      articleFeedback === true ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Oui
                  </button>
                  <button 
                    onClick={() => setArticleFeedback(false)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      articleFeedback === false ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Live Chat */}
      {showLiveChat && (
        <div className="fixed inset-0 bg-black/60 z-[140] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm h-[75vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-[#111111] flex items-center justify-center text-white text-xs font-bold">
                  B
                </div>
                <div>
                  <h3 className="font-bold text-[13.5px] text-black">Support Bavel</h3>
                  <span className="text-[10.5px] text-emerald-500 font-semibold block">● En ligne</span>
                </div>
              </div>
              <button onClick={() => setShowLiveChat(false)} className="p-1 text-gray-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f9fafb]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-snug ${
                    msg.sender === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-white border border-gray-200/80 text-black rounded-bl-none shadow-2xs'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-gray-100 flex items-center space-x-2 shrink-0">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12.5px] text-black outline-none focus:ring-1 focus:ring-black"
              />
              <button 
                type="submit"
                className="p-2 bg-[#111111] hover:bg-black text-white rounded-xl cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function LookingForMenu({ 
  onClose,
  selected: propSelected = 'serieuse',
  onSelect
}: { 
  onClose: () => void;
  selected?: 'serieuse' | 'discuter' | 'rencontres';
  onSelect?: (val: 'serieuse' | 'discuter' | 'rencontres') => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<'serieuse' | 'discuter' | 'rencontres'>(propSelected);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSelect?.(selected);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Impossible d’enregistrer votre préférence.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-white rounded-t-[24px] flex flex-col max-h-[90vh]"
      >
        <div className="flex flex-col px-4 pt-5 pb-4">
          <div className="text-center mb-4">
            <h2 className="text-[18px] font-black text-black mb-1">Que recherchez-vous ?</h2>
            <p className="text-[13px] text-gray-500 leading-snug px-3">
              Les belles rencontres riment avec honnêteté. Vous pourrez modifier votre envie à tout moment.
            </p>
          </div>

          <div className="flex flex-col space-y-2 mb-5">
            <button 
              onClick={() => setSelected('rencontres')}
              className={`flex items-center justify-between p-3.5 rounded-[16px] transition-colors ${selected === 'rencontres' ? 'bg-[#f4ebff]' : 'bg-[#f9fafb]'}`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Coffee className="w-5 h-5 text-black fill-black" strokeWidth={1} />
                <div className="flex flex-col text-left pr-2 min-w-0">
                  <span className="text-[14px] font-bold text-black mb-0.5">Des rencontres</span>
                  <span className="text-[12px] text-gray-600 leading-tight">J'ai envie d'avoir des dates et de passer de bons moments.</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[2px] shrink-0 flex items-center justify-center ${selected === 'rencontres' ? 'border-black' : 'border-gray-300'}`}>
                {selected === 'rencontres' && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
              </div>
            </button>

            <button 
              onClick={() => setSelected('discuter')}
              className={`flex items-center justify-between p-3.5 rounded-[16px] transition-colors ${selected === 'discuter' ? 'bg-[#f4ebff]' : 'bg-[#f9fafb]'}`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <MessageCircle className="w-5 h-5 text-black fill-black" strokeWidth={1} />
                <div className="flex flex-col text-left pr-2 min-w-0">
                  <span className="text-[14px] font-bold text-black mb-0.5">Discuter</span>
                  <span className="text-[12px] text-gray-600 leading-tight">J'ai envie de faire de nouvelles connaissances, on verra bien.</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[2px] shrink-0 flex items-center justify-center ${selected === 'discuter' ? 'border-black' : 'border-gray-300'}`}>
                {selected === 'discuter' && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
              </div>
            </button>

            <button 
              onClick={() => setSelected('serieuse')}
              className={`flex items-center justify-between p-3.5 rounded-[16px] transition-colors ${selected === 'serieuse' ? 'bg-[#f4ebff]' : 'bg-[#f9fafb]'}`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Heart className="w-5 h-5 text-black fill-black" strokeWidth={1} />
                <div className="flex flex-col text-left pr-2 min-w-0">
                  <span className="text-[14px] font-bold text-black mb-0.5">Une histoire sérieuse</span>
                  <span className="text-[12px] text-gray-600 leading-tight">J'ai envie d'une relation à long terme.</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[2px] shrink-0 flex items-center justify-center ${selected === 'serieuse' ? 'border-black' : 'border-gray-300'}`}>
                {selected === 'serieuse' && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
              </div>
            </button>
          </div>

          {saveError && <p role="alert" className="mb-3 text-sm text-red-600">{saveError}</p>}
          <button 
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full bg-[#1a1a1a] text-white rounded-full py-3 text-[14.5px] font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Ajouter à mon profil'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
export { ActivityModal as ActivityMenu } from './profils/ActivityModal';

export function InvisibleModeMenu({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<{
    incognito_mode: boolean;
    show_online_status: boolean;
  } | null>(null);
  const [incognitoAvailable, setIncognitoAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    fetchPrivacySettingsWithEntitlements()
      .then(result => {
        if (!active) return;
        setSettings(result.settings);
        setIncognitoAvailable(result.incognitoAvailable);
      })
      .catch(error => {
        if (active) setFeedback(error instanceof Error ? error.message : 'Confidentialité indisponible.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveSetting = async (key: 'incognito_mode' | 'show_online_status', value: boolean) => {
    if (!settings || saving) return;
    const previous = settings;
    setSettings({ ...previous, [key]: value });
    setSaving(true);
    setFeedback('');
    try {
      const updated = await updatePrivacySettings({ [key]: value });
      setSettings({ ...previous, ...updated });
    } catch (error) {
      setSettings(previous);
      setFeedback(error instanceof Error ? error.message : 'Impossible de sauvegarder ce réglage.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 font-sans">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-black hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>

        <div className="p-6 flex flex-col mt-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#f4e6ff] rounded-full flex items-center justify-center">
              <EyeOff className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <h2 className="text-[22px] font-bold text-black tracking-tight">
            Activer le mode Invisible
            </h2>
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Les visites anonymes et le masquage du statut en ligne sont deux réglages distincts.
          </p>

          {loading ? <p role="status" className="py-4 text-sm text-gray-500">Chargement des réglages…</p> : (
            <>
              <label className="flex items-start justify-between gap-4 py-4 border-t border-gray-100">
                <span>
                  <span className="block font-semibold text-sm">Visites anonymes</span>
                  <span className="block text-xs text-gray-500 mt-1">Vos visites n’apparaissent pas dans la liste des visiteurs. Réservé aux offres Extra et Premium.</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.incognito_mode)}
                  disabled={saving || (!incognitoAvailable && !settings?.incognito_mode)}
                  onChange={event => void saveSetting('incognito_mode', event.target.checked)}
                  aria-label="Activer les visites anonymes"
                />
              </label>
              <label className="flex items-start justify-between gap-4 py-4 border-t border-gray-100">
                <span>
                  <span className="block font-semibold text-sm">Masquer mon statut en ligne</span>
                  <span className="block text-xs text-gray-500 mt-1">Votre profil peut rester visible dans la découverte.</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings?.show_online_status === false}
                  disabled={saving}
                  onChange={event => void saveSetting('show_online_status', !event.target.checked)}
                  aria-label="Masquer mon statut en ligne"
                />
              </label>
            </>
          )}
          {feedback && <p role="alert" className="text-sm text-red-600 mt-3">{feedback}</p>}
          <button onClick={onClose} className="w-full mt-5 bg-[#111111] hover:bg-black text-white font-bold py-3 rounded-full">
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function TermsOfServiceMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-white z-[120] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-100 shrink-0 relative">
        <button 
          onClick={onClose} 
          className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer z-10"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
        <h2 className="text-[16px] font-bold text-black tracking-tight absolute left-1/2 -translate-x-1/2 max-w-[220px] truncate">
          Conditions d'utilisation
        </h2>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-black text-[13.5px] leading-relaxed scrollbar-hide pb-12">
        <div>
          <h1 className="text-[20px] font-black text-black mb-1">Conditions d'utilisation de Bavel</h1>
          <p className="text-[12px] text-gray-500 font-medium">
            Si vous habitez en dehors des États-Unis, les présentes Conditions d'utilisation s'appliquent à vous. Si vous habitez aux États-Unis, les conditions générales de Bavel s'appliquent à vous.
          </p>
        </div>

        {/* Résumé */}
        <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 space-y-2.5">
          <h2 className="text-[15px] font-black text-black">Résumé</h2>
          <p className="text-[12.5px] text-gray-700">
            Merci de bien vouloir lire attentivement l'intégralité des présentes Conditions générales d'utilisation car elles s'appliquent lors de chaque connexion au site Bavel et dès que vous y utilisez l'une de ses fonctionnalités. Voici un résumé des points essentiels abordés :
          </p>
          <ul className="space-y-2 text-[12px] text-gray-700 list-disc pl-4">
            <li>L'accès à Bavel est interdit aux personnes physiques de moins de 18 ans car c'est un réseau social réservé aux adultes.</li>
            <li>La société Bavel ne peut être tenue pour responsable de l'ensemble des publications ou déclarations faites sur le site. Nous ne surveillons pas le contenu publié sur le site. Toutefois, si nous remarquons ou si un utilisateur nous signale du contenu que nous jugeons inapproprié, nous nous réservons le droit de le supprimer.</li>
            <li>Si vous publiez du contenu ne vous appartenant pas, sans l'aval de son propriétaire et que ce dernier s'y oppose (ou fait appel à un avocat), notre responsabilité ne saurait être engagée. Vous devez assumer l'entière responsabilité de ce que vous publiez.</li>
            <li>Veuillez également consulter notre charte de la communauté et nos conseils sur la sécurité pour de plus amples informations sur la protection de votre vie privée.</li>
            <li>Pour savoir comment Bavel utilise vos données personnelles, veuillez consulter notre Politique de confidentialité. Vous y trouverez des informations sur la manière dont nous traitons vos données personnelles et protégeons votre confidentialité lorsque vous utilisez Bavel.</li>
          </ul>
        </div>

        {/* Mentions légales complètes */}
        <div className="space-y-5 pt-2">
          <h2 className="text-[17px] font-black text-black border-b border-gray-100 pb-2">Mentions légales complètes</h2>
          
          <p className="text-gray-700">
            Le site et l'application Bavel sont un réseau social conçu comme un forum où vous pouvez rencontrer de nouvelles personnes, discuter et partager des photos, des nouvelles et des informations. Il est destiné à être un endroit sympathique à visiter et il est important pour nous (et pour vous) qu'il reste un environnement sûr et convivial.
          </p>

          <p className="text-gray-700">
            Les Conditions constituent un accord juridique contraignant entre vous en tant qu'utilisateur (« vous ») et le groupe Bavel (« nous »). Le groupe Bavel comprend, mais sans s'y limiter, Bavel Trading Limited (1 Blossom Yard, Fourth Floor, London E1 6RS), Social Online Payments Limited et Social Online Payments, Inc.
          </p>

          <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl text-[12px] text-red-900 font-medium">
            SI VOUS N'ÊTES PAS D'ACCORD ET N'ACCEPTEZ PAS LES CONDITIONS, VOUS NE DEVEZ PAS ACCÉDER OU UTILISER L'APPLICATION OU LE SITE.
          </div>

          {/* 1. Utilisation */}
          <div className="space-y-2">
            <h3 className="text-[14.5px] font-bold text-black">1. Utilisation du site et de l'application, et règles relatives au contenu</h3>
            <p className="font-semibold text-[13px] text-gray-900">Qui peut utiliser Bavel ?</p>
            <p className="text-gray-700">
              Bavel est un lieu de rencontre pour les adultes. Vous pouvez utiliser Bavel et ses fonctionnalités, ou vous y inscrire, uniquement si vous avez 18 ans ou plus.
            </p>
            <p className="font-semibold text-[13px] text-gray-900 pt-1">Quel genre de contenu est-ce que je peux publier ou télécharger sur Bavel ?</p>
            <p className="text-gray-700">
              Vous pouvez publier ou télécharger toutes sortes de choses sur Bavel, y compris des photos, des e-mails, des messages et autres contenus (« Contenus »). Vous ne pouvez pas publier de contenu illégal, diffamatoire, obscène, haineux, commercial ou portant atteinte aux droits de tiers.
            </p>
            <p className="font-semibold text-[13px] text-gray-900 pt-1">Puis-je utiliser les données personnelles d'autres utilisateurs ?</p>
            <p className="text-gray-700">
              Vous pouvez uniquement utiliser les informations personnelles d'autres utilisateurs de Bavel dans le but de faire de nouvelles connaissances. Il vous est strictement interdit d'utiliser leurs informations à des fins commerciales, de spam ou de harcèlement.
            </p>
          </div>

          {/* 2. Propriété */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">2. Propriété du Contenu</h3>
            <p className="text-gray-700">
              Vous restez propriétaire du Contenu que vous soumettez sur Bavel. En publiant du Contenu, vous nous accordez une licence non exclusive, libre de droits, mondiale pour l'utiliser et le diffuser dans le cadre du fonctionnement du service.
            </p>
          </div>

          {/* 3. Services payants */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">3. Services payants</h3>
            <p className="text-gray-700">
              Bavel vous offre la possibilité d'acheter des Services Premium ou des Crédits. Si vous souscrivez un abonnement à renouvellement automatique, il sera automatiquement reconduit à moins de l'annuler au moins 24 heures avant la fin de la période en cours.
            </p>
            <p className="text-gray-700 text-[12.5px] bg-gray-50 p-2.5 rounded-lg">
              Les crédits inutilisés expirent 6 mois après la date d'achat.
            </p>
          </div>

          {/* 4. Accès */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">4. Accès au site et à l'application</h3>
            <p className="text-gray-700">
              Bavel est fourni « en l'état ». Nous ne pouvons garantir un fonctionnement ininterrompu en raison des nécessités de maintenance et des événements hors de notre contrôle.
            </p>
          </div>

          {/* 5. Résiliation */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">5. Résiliation du profil par l'utilisateur</h3>
            <p className="text-gray-700">
              Vous pouvez à tout moment résilier votre inscription en allant dans vos « Paramètres », et en cliquant sur « Supprimer mon profil ». Vous disposez de 28 jours pour réactiver votre compte s'il a été désactivé temporairement.
            </p>
          </div>

          {/* 6. Abus */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">6. Abus et plaintes</h3>
            <p className="text-gray-700">
              Vous pouvez signaler tout abus ou toute plainte en cliquant sur « Signaler un abus » sur le profil concerné ou en contactant notre équipe Bavel.
            </p>
          </div>

          {/* 7 - 12 */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">7. Politique de Confidentialité</h3>
            <p className="text-gray-700">
              Nous traitons vos données conformément à notre Politique de confidentialité.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">8. Liens & 9. Limitation de responsabilité</h3>
            <p className="text-gray-700">
              Vous êtes seul responsable de vos agissements sur notre site et de leurs conséquences vis-à-vis des autres utilisateurs.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-[14.5px] font-bold text-black">10. Dédommagement & 11. Programmes Bêta</h3>
            <p className="text-gray-700">
              Les Conditions, ainsi que tout litige en rapport avec elles, sont régies par la loi anglaise.
            </p>
          </div>

          {/* À propos & Entrée en vigueur */}
          <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border border-gray-100 mt-4">
            <p className="font-bold text-[13px] text-black">À propos de nous</p>
            <p className="text-[12px] text-gray-600">
              www.lovel.com est un site et une application détenus et exploités par Bavel Trading Limited. Enregistré en Angleterre sous le numéro 07540255. Siège social : 1 Blossom Yard, Fourth Floor, London E1 6RS.
            </p>
            <p className="font-extrabold text-[11.5px] text-gray-500 pt-2">
              Dernière mise à jour des Conditions générales d'utilisation : 28 octobre 2025.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfidentialityMenu({ 
  onClose,
}: { 
  onClose: () => void;
}) {
  type PrivacySettings = {
    incognito_mode: boolean;
    show_online_status: boolean;
    show_distance: boolean;
    allow_calls: boolean;
    profile_paused: boolean;
  };
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [incognitoAvailable, setIncognitoAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof PrivacySettings | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    fetchPrivacySettingsWithEntitlements()
      .then(result => {
        if (!active) return;
        setSettings(result.settings);
        setIncognitoAvailable(result.incognitoAvailable);
      })
      .catch(error => {
        if (active) setFeedback(error instanceof Error ? error.message : 'Confidentialité indisponible.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    if (!settings || savingKey) return;
    const previous = settings;
    setSettings({ ...previous, [key]: value });
    setSavingKey(key);
    setFeedback('');
    try {
      const saved = await updatePrivacySettings({ [key]: value });
      setSettings({ ...previous, ...saved });
    } catch (error) {
      setSettings(previous);
      setFeedback(error instanceof Error ? error.message : 'Impossible de sauvegarder ce réglage.');
    } finally {
      setSavingKey(null);
    }
  };

  const privacyOptions: Array<{
    key: keyof PrivacySettings;
    label: string;
    description: string;
    checked: (value: PrivacySettings) => boolean;
    nextValue: (checked: boolean) => boolean;
    disabled?: boolean;
  }> = [
    {
      key: 'profile_paused',
      label: 'Mettre mon profil en pause',
      description: 'Votre profil n’apparaît plus dans la découverte.',
      checked: value => value.profile_paused,
      nextValue: checked => checked
    },
    {
      key: 'incognito_mode',
      label: 'Visites anonymes',
      description: 'Vos visites ne figurent pas dans la liste des visiteurs. Réservé aux offres Extra et Premium.',
      checked: value => value.incognito_mode,
      nextValue: checked => checked,
      disabled: !incognitoAvailable && !settings?.incognito_mode
    },
    {
      key: 'show_online_status',
      label: 'Masquer mon statut en ligne',
      description: 'Votre profil reste visible, mais votre présence en ligne est cachée.',
      checked: value => !value.show_online_status,
      nextValue: checked => !checked
    },
    {
      key: 'show_distance',
      label: 'Masquer ma distance et ma ville',
      description: 'Votre position et la distance approximative ne sont pas communiquées aux autres membres.',
      checked: value => !value.show_distance,
      nextValue: checked => !checked
    },
    {
      key: 'allow_calls',
      label: 'Autoriser les appels',
      description: 'Les autres membres peuvent vous proposer un appel.',
      checked: value => value.allow_calls,
      nextValue: checked => checked
    }
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 font-sans">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-black hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>

        <div className="p-6 flex flex-col mt-2 max-h-[85dvh] overflow-y-auto">
          <div className="w-[52px] h-[52px] bg-[#f4e6ff] rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>

          <h2 className="text-[22px] font-bold text-black tracking-tight mb-2">
            Gérer votre confidentialité
          </h2>
          
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Ces réglages sont enregistrés sur votre compte et appliqués par le serveur.
          </p>

          {loading ? (
            <p role="status" className="py-5 text-sm text-gray-500">Chargement des réglages…</p>
          ) : settings ? (
            <div className="divide-y divide-gray-100 border-y border-gray-100">
              {privacyOptions.map(option => (
                <label key={option.key} className="flex items-start justify-between gap-4 py-4">
                  <span>
                    <span className="block font-semibold text-sm text-gray-900">{option.label}</span>
                    <span className="block text-xs text-gray-500 mt-1">{option.description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={option.checked(settings)}
                    disabled={Boolean(savingKey) || option.disabled}
                    onChange={event => void updateSetting(option.key, option.nextValue(event.target.checked))}
                    aria-label={option.label}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {feedback && <p role="alert" className="text-sm text-red-600 mt-3">{feedback}</p>}
          
          <button 
            onClick={onClose}
            className="w-full mt-5 bg-[#111111] hover:bg-black text-white font-bold py-3 rounded-full"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
