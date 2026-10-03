import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, animate } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, CameraOff, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Crown, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil
} from 'lucide-react';
import { User } from '../../../types';
import BavelPremiumModal from '../../modals/BavelPremiumModal';
import { PhotoAdviceModal } from '../../modals/PhotoAdviceModal';
import { EditProfileMenu } from './EditProfileMenu';
import { SafetyCentreMenu, CommunityCharterMenu } from '../SafetyCentreMenu';
import { FullProfilePhotoModal, AddMediaSourceMenu, FacebookInfoModal } from '../Modals';
import { AllFeaturesModal, BavelComparisonModal, RechargeCreditsMenu, BavelExtraModal } from '../Monetization';
import { SettingsMenu, HelpCenterMenu, LookingForMenu, ActivityMenu, InvisibleModeMenu, ConfidentialityMenu } from '../SettingsMenu';
import {
  deleteUploadedProfilePhotoFromSupabase,
  syncProfileToSupabase,
  updateProfilePhotosInSupabase,
  uploadProfilePhotoToSupabase
} from '../../../lib/supabase';
import { getProfilePhotoStoragePath } from '../../../lib/profilePhotoUrls';
import { SelfieVerificationModal } from '../../../features/security';
import { CreditsStoreModal, ProfileBoostModal, PremiumPassModal } from '../../../features/monetization';
import { PopularityDashboard, QuestsAndRewardsModal } from '../../../features/gamification';
import { monetizationService } from '../../../services/monetizationService';
import { aiSystemEngine } from '../../../services/aiSystemEngine';
import { getApiUrl } from '../../../lib/apiUrl';
import { gamificationService } from '../../../services/gamificationService';
import { ImageCompressionService } from '../../../services/media/imageCompression';
import { authFetch } from '../../../lib/authFetch';

export function ProfileTab({ 
  userMood, 
  onOpenMoods,
  userLookingFor = 'serieuse',
  setUserLookingFor,
  userPhotos = [],
  setUserPhotos,
  userProfile,
  setUserProfile,
  onLogout,
  textScale,
  onChangeTextScale,
  onOpenAdmin
}: { 
  userMood?: { emoji: string; label: string } | null; 
  onOpenMoods?: () => void;
  userLookingFor?: 'serieuse' | 'discuter' | 'rencontres';
  setUserLookingFor?: (val: 'serieuse' | 'discuter' | 'rencontres') => void;
  userPhotos?: string[];
  setUserPhotos?: React.Dispatch<React.SetStateAction<string[]>>;
  userProfile?: any;
  setUserProfile?: React.Dispatch<React.SetStateAction<any>>;
  onLogout?: () => void;
  textScale: number;
  onChangeTextScale: (scale: number) => void;
  onOpenAdmin?: () => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'abonnements' | 'securite'>('abonnements');
  const [expandedDossier, setExpandedDossier] = useState<'activite' | 'credits' | 'premium' | 'extra' | null>('premium');
  const [subCardIndex, setSubCardIndex] = useState<number>(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileInitialSubEditor, setEditProfileInitialSubEditor] = useState<'none' | 'basic' | 'job_studies' | 'description' | 'detail_picker' | 'interests' | 'verification'>('none');
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showLookingForMenu, setShowLookingForMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [showInvisibleMode, setShowInvisibleMode] = useState(false);
  const [showConfidentiality, setShowConfidentiality] = useState(false);
  const [showCommunityCharter, setShowCommunityCharter] = useState(false);
  const [showSafetyCentre, setShowSafetyCentre] = useState(false);
  const [showRechargeCredits, setShowRechargeCredits] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState<{ open: boolean; tab: 'extra' | 'premium' }>({ open: false, tab: 'extra' });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumSlideId, setPremiumSlideId] = useState<string | undefined>(undefined);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [showPhotoAdvice, setShowPhotoAdvice] = useState(false);
  const [showSelfieVerification, setShowSelfieVerification] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [profileActionError, setProfileActionError] = useState<string | null>(null);
  const uploadingProfilePhotoRef = useRef(false);
  const [showCreditsStore, setShowCreditsStore] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showVipPassModal, setShowVipPassModal] = useState(false);
  const [showQuestsModal, setShowQuestsModal] = useState(false);
  const isVerified = Boolean(userProfile?.isVerified || userProfile?.is_verified);
  const [creditsBalance, setCreditsBalance] = useState(monetizationService.getCredits());

  useEffect(() => {
    const unsubMonetization = monetizationService.subscribe(() => {
      setCreditsBalance(monetizationService.getCredits());
    });
    return unsubMonetization;
  }, []);

  useEffect(() => {
    let active = true;
    authFetch('/api/wallet')
      .then(async response => {
        if (!response.ok) throw new Error(`wallet_${response.status}`);
        return response.json();
      })
      .then(payload => {
        if (active && Number.isFinite(Number(payload.wallet?.balance))) {
          setCreditsBalance(Number(payload.wallet.balance));
        }
      })
      .catch(error => console.warn('Solde portefeuille indisponible:', error));
    return () => { active = false; };
  }, [userProfile?.id]);

  // Desktop real-time camera states
  const [showDesktopCamera, setShowDesktopCamera] = useState(false);
  const [desktopStream, setDesktopStream] = useState<MediaStream | null>(null);
  const [desktopCameraError, setDesktopCameraError] = useState<string | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const desktopCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const desktopStreamRef = useRef<MediaStream | null>(null);

  const [fbModal, setFbModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // States for notification permission
  const [notificationsAuthorized, setNotificationsAuthorized] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [dismissedReminder, setDismissedReminder] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const handleEnableNotifications = () => {
    setShowPermissionDialog(true);
  };

  const handleAuthorize = async () => {
    if (typeof Notification === 'undefined') {
      setShowPermissionDialog(false);
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsAuthorized(permission === 'granted');
    setShowPermissionDialog(false);
  };

  const handleRefuse = () => {
    setShowPermissionDialog(false);
  };

  const handleDismissReminder = () => {
    setDismissedReminder(true);
  };

  const filledCount = userPhotos.filter(Boolean).length;
  let score = 20; // Base
  score += filledCount * 5; 
  if (userProfile?.bio && userProfile.bio.length > 10) score += 15;
  if (userProfile?.job || userProfile?.studies) score += 10;
  if (userProfile?.interests && userProfile.interests.length > 0) score += 10;
  if (userProfile?.details?.prompts && userProfile.details.prompts.length > 0) score += 15;
  const completionPercentage = Math.min(100, score);
  const circumference = 276.46;

  // Animating completion percentage with Framer Motion animate
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    let active = true;
    
    // Always start from 0 on initial mount of the Profile tab to showcase the full animation
    setAnimatedPercentage(0);

    const delayTimer = setTimeout(() => {
      if (!active) return;
      
      const controls = animate(0, completionPercentage, {
        duration: 1.4,
        ease: [0.16, 1, 0.3, 1], // easeOutExpo: fast and elegant acceleration
        onUpdate: (latest) => {
          if (active) {
            setAnimatedPercentage(Math.round(latest));
          }
        }
      });
      
      return () => controls.stop();
    }, 240); // 240ms delay to wait for the page transition to settle perfectly

    return () => {
      active = false;
      clearTimeout(delayTimer);
    };
  }, [completionPercentage]);

  const strokeDashoffset = circumference - (circumference * animatedPercentage) / 100;

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    if (uploadingProfilePhotoRef.current) return;
    const userId = userProfile?.id;
    if (!userId) {
      setProfileActionError('Connectez-vous pour enregistrer une photo.');
      return;
    }

    uploadingProfilePhotoRef.current = true;
    setUploadingProfilePhoto(true);
    setProfileActionError(null);
    let uploadedPath: string | null = null;
    try {
      const compressed = await ImageCompressionService.compressImageFile(validFiles[0], {
        maxWidth: 1080,
        maxHeight: 1350,
        quality: 0.85
      });
      const slotToUse = userPhotos.findIndex(photo => !photo);
      const slotIndex = slotToUse === -1 ? userPhotos.length : slotToUse;
      const uploaded = await uploadProfilePhotoToSupabase(compressed.file, userId, slotIndex);
      uploadedPath = uploaded.path;
      const updated = [...userPhotos];
      while (updated.length <= slotIndex) updated.push('');
      updated[slotIndex] = uploaded.url;
      await updateProfilePhotosInSupabase(userId, updated);
      setUserPhotos?.(updated);

      const replacedPath = getProfilePhotoStoragePath(userPhotos[slotIndex] || '');
      if (replacedPath && replacedPath !== uploaded.path) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(replacedPath);
        } catch (cleanupError) {
          console.error('Failed to remove the replaced profile photo:', cleanupError);
        }
      }
    } catch (error) {
      if (uploadedPath) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(uploadedPath);
        } catch (cleanupError) {
          console.error('Failed to remove an unreferenced profile photo:', cleanupError);
        }
      }
      console.error('Failed to save profile photo:', error);
      setProfileActionError(error instanceof Error ? error.message : 'Impossible d’enregistrer cette photo.');
    } finally {
      uploadingProfilePhotoRef.current = false;
      setUploadingProfilePhoto(false);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Check if current device is a mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const startDesktopCamera = async () => {
    try {
      setDesktopCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      desktopStreamRef.current = mediaStream;
      setDesktopStream(mediaStream);
      if (desktopVideoRef.current) {
        desktopVideoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Camera stream unavailable, opening native file dialog:", err);
      setShowDesktopCamera(false);
      cameraInputRef.current?.click();
    }
  };

  const stopDesktopCamera = () => {
    if (desktopStreamRef.current) {
      desktopStreamRef.current.getTracks().forEach(track => track.stop());
      desktopStreamRef.current = null;
    }
    setDesktopStream(null);
    setShowDesktopCamera(false);
  };

  // Manage starting/stopping desktop camera based on visibility state
  useEffect(() => {
    if (showDesktopCamera) {
      startDesktopCamera();
    } else {
      stopDesktopCamera();
    }

    return () => {
      if (desktopStreamRef.current) {
        desktopStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [showDesktopCamera]);

  const captureDesktopPhoto = () => {
    if (desktopVideoRef.current && desktopCanvasRef.current) {
      const video = desktopVideoRef.current;
      const canvas = desktopCanvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        // Horizontal flip for a natural selfie preview
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Emulate processFiles on the captured Data URL
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "captured_selfie.jpg", { type: "image/jpeg" });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            processFiles(dataTransfer.files);
          });
        
        // Stop the camera
        stopDesktopCamera();
      }
    }
  };

  const handleFacebookSync = async () => {
    try {
      const res = await fetch(getApiUrl('/api/auth/facebook/url'));
      const data = await res.json();
      if (data.code === 'SUPABASE_OAUTH_REQUIRED') {
        setFbModal({
          isOpen: true,
          title: "Synchronisation Facebook indisponible",
          message: "La connexion Facebook pour créer un compte ou se connecter est configurée via Supabase. La liaison d’un profil Facebook à un compte Bavel existant n’est pas encore activée.",
          type: 'info'
        });
        return;
      }
      if (data.url) {
        const fbWindow = window.open(data.url, "Facebook", "width=600,height=700");
        if (!fbWindow) {
          setFbModal({
            isOpen: true,
            title: "Fenêtre bloquée",
            message: "Votre navigateur a bloqué l'ouverture de l'écran de connexion Facebook. Veuillez autoriser les fenêtres contextuelles (popups) pour Bavel.",
            type: 'error'
          });
        }
      } else {
        setFbModal({
          isOpen: true,
          title: "Erreur de connexion",
          message: "Impossible de générer l'adresse de connexion Facebook.",
          type: 'error'
        });
      }
    } catch (err) {
      console.error("Facebook auth initiation error:", err);
      setFbModal({
        isOpen: true,
        title: "Erreur",
        message: "Une erreur est survenue lors de l'initiation de la connexion Facebook.",
        type: 'error'
      });
    }
  };

  return (
    <div className="pt-8 h-full flex flex-col bg-[#f9fafb] overflow-y-auto pb-24 scrollbar-hide">
      <input 
        type="file" 
        ref={galleryInputRef} 
        onChange={handleGalleryChange} 
        accept="image/*" 
        className="hidden" 
      />
      {profileActionError && (
        <div role="alert" className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{profileActionError}</span>
          <button type="button" onClick={() => setProfileActionError(null)} aria-label="Fermer le message d’erreur">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {uploadingProfilePhoto && <p className="sr-only" role="status">Enregistrement de la photo…</p>}
      <input 
        type="file" 
        ref={cameraInputRef} 
        onChange={handleCameraChange} 
        accept="image/*" 
        capture="user" 
        className="hidden" 
      />
      {showSettings && (
        <SettingsMenu 
          onClose={() => setShowSettings(false)} 
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          onLogout={onLogout}
          textScale={textScale}
          onChangeTextScale={onChangeTextScale}
          onOpenAdmin={onOpenAdmin}
        />
      )}
      {showEditProfile && (
        <EditProfileMenu 
          onClose={() => setShowEditProfile(false)} 
          userPhotos={userPhotos} 
          setUserPhotos={setUserPhotos} 
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          initialSubEditor={editProfileInitialSubEditor}
          userMood={userMood}
        />
      )}
      {showHelpCenter && <HelpCenterMenu onClose={() => setShowHelpCenter(false)} />}
      <AnimatePresence>
        {showSafetyCentre && (
          <SafetyCentreMenu 
            onClose={() => setShowSafetyCentre(false)}
            userName={userProfile?.name || 'Membre'}
            onOpenVerification={() => {
              setEditProfileInitialSubEditor('verification');
              setShowEditProfile(true);
            }}
            onOpenConfidentiality={() => setShowConfidentiality(true)}
            onOpenInvisibleMode={() => setShowInvisibleMode(true)}
          />
        )}
        {showRechargeCredits && (
          <RechargeCreditsMenu onClose={() => setShowRechargeCredits(false)} />
        )}
        {showAllFeatures.open && (
          <AllFeaturesModal 
            initialTab={showAllFeatures.tab} 
            onClose={() => setShowAllFeatures({ open: false, tab: 'extra' })} 
            onOpenExtra={() => setShowExtraModal(true)}
            onOpenPremium={() => setShowPremiumModal(true)}
          />
        )}
        {showComparisonModal && (
          <BavelComparisonModal 
            onClose={() => setShowComparisonModal(false)}
            onOpenExtra={() => setShowExtraModal(true)}
            onOpenPremium={() => setShowPremiumModal(true)}
          />
        )}
        {showExtraModal && (
          <BavelExtraModal 
            onClose={() => setShowExtraModal(false)}
            onOpenComparison={() => {
              setShowExtraModal(false);
              setShowComparisonModal(true);
            }}
            onSwitchToPremium={() => {
              setShowExtraModal(false);
              setShowPremiumModal(true);
            }}
          />
        )}
        {showPremiumModal && (
          <BavelPremiumModal 
            onClose={() => {
              setShowPremiumModal(false);
              setPremiumSlideId(undefined);
            }} 
            initialSlideId={premiumSlideId}
            onOpenComparison={() => {
              setShowPremiumModal(false);
              setShowComparisonModal(true);
            }}
            onSwitchToExtra={() => {
              setShowPremiumModal(false);
              setShowExtraModal(true);
            }}
          />
        )}
        {showInvisibleMode && (
          <InvisibleModeMenu 
            onClose={() => setShowInvisibleMode(false)}
          />
        )}
        {showActivityMenu && (
          <ActivityMenu 
            onClose={() => setShowActivityMenu(false)} 
            userId={userProfile?.id}
          />
        )}
        {showConfidentiality && <ConfidentialityMenu onClose={() => setShowConfidentiality(false)} />}
        {showCommunityCharter && <CommunityCharterMenu onClose={() => setShowCommunityCharter(false)} />}
        {showAddMedia && (
          <AddMediaSourceMenu 
            onClose={() => setShowAddMedia(false)} 
            onSelectGallery={() => galleryInputRef.current?.click()}
            onSelectCamera={() => {
              if (isMobileDevice()) {
                cameraInputRef.current?.click();
              } else {
                setShowDesktopCamera(true);
              }
              setShowAddMedia(false);
            }}
            onSyncFacebook={() => handleFacebookSync()}
            onOpenAdvice={() => setShowPhotoAdvice(true)}
          />
        )}
        {showPhotoAdvice && (
          <PhotoAdviceModal 
            onClose={() => setShowPhotoAdvice(false)} 
            onAddPhoto={() => setShowAddMedia(true)}
          />
        )}
        {showFullPhoto && (
          <FullProfilePhotoModal 
            onClose={() => setShowFullPhoto(false)} 
            userPhotos={userPhotos} 
            userProfile={userProfile} 
            userMood={userMood}
            onOpenEditProfile={() => {
              setEditProfileInitialSubEditor('none');
              setShowEditProfile(true);
            }}
            onOpenAddMedia={() => setShowAddMedia(true)}
          />
        )}
        {showDesktopCamera && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={stopDesktopCamera}
              className="fixed inset-0 bg-black/80 z-[150]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 z-[160] rounded-[24px] p-6 flex flex-col items-center text-center shadow-2xl w-[90%] max-w-[420px] text-white"
            >
              <div className="flex items-center justify-between w-full mb-4">
                <span className="text-[15px] font-extrabold tracking-wide uppercase text-zinc-400">
                  Appareil Photo
                </span>
                <button 
                  onClick={stopDesktopCamera}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {desktopCameraError ? (
                <div className="flex flex-col items-center space-y-4 my-6">
                  <CameraOff className="w-12 h-12 text-red-500" />
                  <p className="text-[14px] text-zinc-300 px-4 leading-relaxed">
                    {desktopCameraError}
                  </p>
                </div>
              ) : (
                <div className="relative w-full aspect-[3/4] bg-black rounded-xl overflow-hidden shadow-inner my-2">
                  <video
                    ref={desktopVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {!desktopStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 space-y-2">
                      <div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
                      <span className="text-[12px] font-bold">Initialisation...</span>
                    </div>
                  )}
                </div>
              )}

              <canvas ref={desktopCanvasRef} className="hidden" />

              <div className="flex items-center justify-center space-x-8 w-full mt-6 pb-2">
                <button
                  type="button"
                  onClick={stopDesktopCamera}
                  className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-all active:scale-95 flex items-center justify-center shadow-md"
                  title="Annuler"
                >
                  <X className="w-5 h-5" />
                </button>
                {!desktopCameraError && desktopStream && (
                  <button
                    type="button"
                    onClick={captureDesktopPhoto}
                    className="w-16 h-16 bg-[#e20030] hover:bg-[#ff1643] text-white rounded-full transition-all active:scale-90 flex items-center justify-center shadow-lg shadow-[#e20030]/30 border-4 border-zinc-800"
                    title="Prendre la photo"
                  >
                    <Camera className="w-7 h-7" />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FacebookInfoModal 
        isOpen={!!fbModal} 
        onClose={() => setFbModal(null)} 
        title={fbModal?.title || ""} 
        message={fbModal?.message || ""} 
        type={fbModal?.type} 
      />

      {showPermissionDialog && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[9999] flex items-center justify-center p-6 select-none">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[270px] bg-white rounded-[14px] shadow-2xl flex flex-col overflow-hidden text-center"
          >
            <div className="p-4 flex flex-col items-center">
              <h3 className="text-[17px] font-bold text-black leading-snug px-2">
                « Bavel » souhaite vous envoyer des notifications
              </h3>
              <p className="text-[13px] text-gray-500 font-normal leading-normal mt-1.5 px-1.5">
                Les notifications peuvent comprendre des alertes, des sons et des pastilles d'icônes. Elles peuvent être configurées dans les Réglages.
              </p>
            </div>
            
            <div className="flex border-t border-gray-200">
              <button 
                onClick={handleRefuse}
                className="w-1/2 py-3 text-[17px] text-[#007aff] hover:bg-gray-50 transition-colors font-normal cursor-pointer text-center active:bg-gray-100"
              >
                Refuser
              </button>
              <button 
                onClick={handleAuthorize}
                className="w-1/2 py-3 text-[17px] text-[#007aff] font-bold border-l border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-center active:bg-gray-100"
              >
                Autoriser
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showLookingForMenu && (
        <LookingForMenu 
          onClose={() => setShowLookingForMenu(false)} 
          selected={userLookingFor}
          onSelect={async (val) => {
            const updated = { ...userProfile, lookingFor: val, keyQuestion: val };
            const savedProfile = await syncProfileToSupabase({ ...updated, photos: undefined });
            if (!savedProfile) throw new Error('Impossible d’enregistrer cette préférence. Réessayez.');
            setUserLookingFor?.(val);
            setUserProfile?.((previous: any) => ({ ...previous, lookingFor: val, keyQuestion: val }));
          }}
        />
      )}
      {showActivityMenu && <ActivityMenu onClose={() => setShowActivityMenu(false)} />}
      <div className="flex justify-between items-center mb-3 px-4 shrink-0">
        <h1 className="text-[20px] font-black text-black">Profil</h1>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowSettings(true)} className="p-1.5 -m-1 text-black hover:opacity-75 transition-opacity" title="Réglages">
            <Settings className="w-5 h-5 text-black" strokeWidth={2.2} />
          </button>
          <button onClick={() => setShowHelpCenter(true)} className="p-1.5 -m-1 text-black hover:opacity-75 transition-opacity" title="Aide">
            <HelpCircle className="w-5 h-5 text-black" strokeWidth={2.2} />
          </button>
          <button onClick={() => { setEditProfileInitialSubEditor('none'); setShowEditProfile(true); }} className="p-1.5 -m-1 text-black hover:opacity-75 transition-opacity" title="Modifier profil">
            <Edit3 className="w-5 h-5 text-black" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-3.5 mb-3.5 px-4 shrink-0">
        <div 
          onClick={() => setShowFullPhoto(true)}
          className="relative w-[78px] h-[78px] cursor-pointer active:scale-95 transition-transform shrink-0"
        >
          {/* Progress ring for profile completion */}
          <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0 z-10" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="transparent" stroke="#f1f1f3" strokeWidth="5" />
            <circle 
              cx="50" 
              cy="50" 
              r="44" 
              fill="transparent" 
              stroke="#000000" 
              strokeWidth="6" 
              strokeDasharray="276.46" 
              strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round"
              className="" 
            />
          </svg>
          <div className="absolute inset-0 m-auto w-[64px] h-[64px] rounded-full overflow-hidden flex items-center justify-center bg-white z-0">
            {userPhotos[0] ? (
              <img src={userPhotos[0]} alt="Profil" className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                <UserIcon className="w-7 h-7" aria-label="Aucune photo" />
              </div>
            )}
          </div>

          <div 
            onClick={(e) => {
              e.stopPropagation();
              setEditProfileInitialSubEditor('none');
              setShowEditProfile(true);
            }}
            title="Compléter le profil"
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-black text-white text-[10.5px] font-bold px-2 py-0.2 rounded-full z-20 shadow-xs whitespace-nowrap active:scale-95 transition-transform"
          >
            {animatedPercentage} %
          </div>
        </div>
        
        <div className="flex flex-col items-start space-y-1">
          <h2 className="text-[18px] font-bold text-black leading-tight tracking-tight flex items-center gap-1.5">
            {Boolean(isVerified || userProfile?.isVerified) && (
              <span 
                className="w-4.5 h-4.5 rounded-full bg-[#0084ff] text-white inline-flex items-center justify-center shrink-0 shadow-xs" 
                title="Profil vérifié par photo"
              >
                <Check className="w-2.5 h-2.5 stroke-[3.5]" />
              </span>
            )}
            <span>{userProfile?.name || 'Membre'}{Number.isFinite(Number(userProfile?.age)) && Number(userProfile?.age) >= 18 ? `, ${Number(userProfile?.age)}` : ''}</span>
          </h2>
          
          <div className="flex flex-wrap gap-1.5 items-center">
            <button 
              onClick={() => setShowLookingForMenu(true)}
              className="bg-[#f4f4f6] hover:bg-gray-200 px-2.5 py-1 rounded-full flex items-center space-x-1.5 transition-colors active:scale-98"
            >
              {userLookingFor === 'serieuse' ? (
                <>
                  <Heart className="w-3.5 h-3.5 text-black fill-black shrink-0" />
                  <span className="text-[12.5px] font-bold text-black">Une histoire sérieuse</span>
                </>
              ) : userLookingFor === 'discuter' ? (
                <>
                  <MessageCircle className="w-3.5 h-3.5 text-black fill-black shrink-0" />
                  <span className="text-[12.5px] font-bold text-black">Discuter</span>
                </>
              ) : (
                <>
                  <Coffee className="w-3.5 h-3.5 text-black fill-black shrink-0" />
                  <span className="text-[12.5px] font-bold text-black">Des rencontres</span>
                </>
              )}
            </button>


          </div>
        </div>
      </div>

      {(!notificationsAuthorized && !dismissedReminder) && (
        <div className="px-4 mb-2.5 shrink-0 relative">
          <button 
            onClick={handleEnableNotifications}
            className="w-full bg-white border border-gray-100 rounded-[16px] p-2.5 pr-12 flex items-center justify-between shadow-xs cursor-pointer hover:bg-gray-50/50 transition-colors text-left"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 bg-[#EBE4FF] rounded-full flex items-center justify-center shrink-0">
                <Bell className="w-3.5 h-3.5 text-black fill-black" strokeWidth={1} />
              </div>
              <span className="text-[11.5px] font-medium text-black leading-tight text-left">
                Recevez une notification en cas de Match ou message
              </span>
            </div>
            <div className="w-4" />
          </button>
          
          {/* Close button (X) positioned perfectly at the right of the card */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDismissReminder();
            }}
            className="absolute right-7 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition-colors active:scale-90 z-10"
            title="Fermer"
          >
            <X className="w-3.5 h-3.5 text-gray-700 stroke-[3]" />
          </button>
        </div>
      )}

      <div className="flex space-x-0 border-b border-gray-200 mb-2.5 px-4 shrink-0">
        <button 
          onClick={() => setActiveSubTab('abonnements')}
          className={`flex-1 pb-1.5 font-bold text-[13px] transition-colors relative ${activeSubTab === 'abonnements' ? 'text-black' : 'text-gray-500'}`}
        >
          Abonnements
          {activeSubTab === 'abonnements' && <div className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-black"></div>}
        </button>
        <button 
          onClick={() => setActiveSubTab('securite')}
          className={`flex-1 pb-1.5 font-bold text-[13px] transition-colors relative ${activeSubTab === 'securite' ? 'text-black' : 'text-gray-500'}`}
        >
          Sécurité
          {activeSubTab === 'securite' && <div className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-black"></div>}
        </button>
      </div>

      {activeSubTab === 'abonnements' ? (
        <div className="px-4">
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* Card 1: Votre activité */}
            <button 
              onClick={() => setShowActivityMenu(true)} 
              className="bg-white p-3 rounded-[20px] shadow-2xs border border-gray-100/80 flex items-center space-x-3 text-left w-full active:scale-98 transition-all cursor-pointer hover:border-gray-200"
            >
              <div className="w-9 h-9 rounded-full bg-[#f3f4f6] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  {/* Gauge Arc */}
                  <path 
                    d="M4 17.5 A 8 8 0 1 1 20 17.5" 
                    stroke="#555555" 
                    strokeWidth="2.4" 
                    strokeLinecap="round" 
                  />
                  {/* Red gauge tick / needle */}
                  <path 
                    d="M6 15.5 L 9.5 12" 
                    stroke="#e20030" 
                    strokeWidth="2.8" 
                    strokeLinecap="round" 
                  />
                  {/* Red gauge dot */}
                  <circle cx="5.5" cy="16.5" r="1.5" fill="#e20030" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-gray-500 text-[11.5px] font-medium leading-tight">Votre activité</div>
                <div className="font-extrabold text-black text-[14.5px] sm:text-[15px] mt-0.5 leading-tight tracking-tight">Très basse</div>
              </div>
            </button>
            
            {/* Card 2: Crédits with live balance (e.g. 10) */}
            <button 
              onClick={() => setShowRechargeCredits(true)} 
              className="bg-white p-3 rounded-[20px] shadow-2xs border border-gray-100/80 flex items-center space-x-3 text-left w-full active:scale-98 transition-all cursor-pointer hover:border-gray-200"
            >
              <div className="relative w-9 h-9 shrink-0">
                {/* Lavender circular background */}
                <div className="w-full h-full bg-[#ede4ff] rounded-full flex items-center justify-center relative">
                  {/* Black coin with heart icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    {/* Coin base / rim */}
                    <circle cx="12" cy="12" r="8" fill="#111111" />
                    {/* 3D coin edge effect */}
                    <path d="M19 10.5C19.7 11.2 20 12 20 13C20 15 17.5 17 14 17.5" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Heart cutout */}
                    <path 
                      d="M12 14.5L11.3 13.8C9.5 12.2 8.3 11.1 8.3 9.7C8.3 8.6 9.2 7.7 10.3 7.7C10.9 7.7 11.5 8 12 8.5C12.5 8 13.1 7.7 13.7 7.7C14.8 7.7 15.7 8.6 15.7 9.7C15.7 11.1 14.5 12.2 12.7 13.8L12 14.5Z" 
                      fill="white" 
                    />
                  </svg>
                </div>
                {/* Plus badge on bottom right of the icon */}
                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full z-20 border-[1.5px] border-white w-4.5 h-4.5 flex items-center justify-center shadow-xs">
                  <Plus className="w-2.5 h-2.5 text-black stroke-[3.5]" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-gray-500 text-[11.5px] font-medium leading-tight">Crédits</div>
                <div className="font-extrabold text-black text-[14.5px] sm:text-[15px] mt-0.5 leading-tight tracking-tight">
                  {creditsBalance > 0 ? creditsBalance : 'Ajouter'}
                </div>
              </div>
            </button>
          </div>

          <div className="overflow-hidden relative rounded-[22px] touch-pan-y">
            <motion.div 
              className="flex w-[200%]"
              animate={{ x: subCardIndex === 0 ? "0%" : "-50%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: -100, right: 100 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -40 || info.velocity.x < -200) {
                  setSubCardIndex(1);
                } else if (info.offset.x > 40 || info.velocity.x > 200) {
                  setSubCardIndex(0);
                }
              }}
            >
              {/* Card 1: Extra */}
              <div className="w-1/2 pr-1 shrink-0">
                <div className="bg-[#5c0631] rounded-[22px] p-4 text-white overflow-hidden relative shadow-md h-full select-none">
                  <div className="flex justify-center items-center mb-3">
                    <span className="text-[20px] font-zapfino mr-1.5 pb-2">Bavel</span>
                    <span className="text-[17px] font-medium">Extra</span>
                  </div>
                  
                  <button 
                    onClick={() => setShowExtraModal(true)}
                    className="w-full bg-white text-black font-bold text-[13px] py-2.5 rounded-full mb-3.5 shadow-xs active:scale-98 transition-transform cursor-pointer"
                  >
                    Profitez d'Extra (à partir de 5,99 €)
                  </button>

                  <div className="bg-[#410925] rounded-[18px] p-3.5 border border-white/5">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 items-center">
                      <div className="col-start-2 text-[11px] font-medium text-white/80 text-center relative pt-1">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white/20 text-white text-[8.5px] px-1.5 py-0.2 rounded-full whitespace-nowrap">Ma formule</div>
                        Gratuit
                      </div>
                      <div className="col-start-3 text-[11px] font-bold text-white text-center pt-1">Extra</div>

                      <div className="text-[11.5px] font-medium leading-tight">Swipez aussi souvent que vous voulez</div>
                      <div className="flex justify-center"><X className="w-4 h-4 text-white/70" strokeWidth={2.5} /></div>
                      <div className="flex justify-center"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>

                      <div className="text-[11.5px] font-medium leading-tight">Des crédits bonus pour tout achat de crédits</div>
                      <div className="flex justify-center"><X className="w-4 h-4 text-white/70" strokeWidth={2.5} /></div>
                      <div className="flex justify-center"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>

                      <div className="text-[11.5px] font-medium leading-tight">Supprimez toutes les pubs</div>
                      <div className="flex justify-center"><X className="w-4 h-4 text-white/70" strokeWidth={2.5} /></div>
                      <div className="flex justify-center"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>
                    </div>
                    
                    <button 
                      onClick={() => setShowAllFeatures({ open: true, tab: 'extra' })}
                      className="w-full border border-white/40 hover:border-white rounded-full py-2 mt-3.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
                    >
                      Toutes les fonctionnalités
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Premium */}
              <div className="w-1/2 pl-1 shrink-0">
                <div className="bg-[#22121d] rounded-[22px] p-4 text-white overflow-hidden relative shadow-md h-full select-none">
                  <div className="flex justify-center items-center mb-3">
                    <span className="text-[20px] font-zapfino mr-1.5 pb-2">Bavel</span>
                    <span className="text-[17px] font-medium">Premium</span>
                  </div>
                  
                  <button 
                    onClick={() => { setPremiumSlideId(undefined); setShowPremiumModal(true); }}
                    className="w-full bg-white text-black font-bold text-[13px] py-2.5 rounded-full mb-3.5 shadow-xs active:scale-98 transition-transform cursor-pointer"
                  >
                    Passez à Premium (à partir de 11,99 €)
                  </button>

                  <div className="bg-[#331c2d] rounded-[18px] p-3.5 border border-white/5">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3.5 items-center">
                      <div className="col-start-2 text-[11px] font-medium text-white/80 text-center relative pt-1">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#51364a] text-white/90 text-[8.5px] font-medium px-2 py-0.2 rounded-full whitespace-nowrap">Ma formule</div>
                        Gratuit
                      </div>
                      <div className="col-start-3 text-[11px] font-bold text-white text-center pt-1">Premium</div>

                      <div className="text-[11.5px] font-medium leading-tight">Découvrez qui vous a donné un Like</div>
                      <div className="flex justify-center"><X className="w-4 h-4 text-white/70" strokeWidth={2.5} /></div>
                      <div className="flex justify-center"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>

                      <div className="text-[11.5px] font-medium leading-tight">Des crédits bonus pour tout achat de crédits</div>
                      <div className="flex justify-center"><X className="w-4 h-4 text-white/70" strokeWidth={2.5} /></div>
                      <div className="flex justify-center"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>

                      <div className="text-[11.5px] font-medium leading-tight">Profitez de filtres illimités</div>
                      <div className="flex justify-center"><X className="w-4 h-4 text-white/70" strokeWidth={2.5} /></div>
                      <div className="flex justify-center"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>
                    </div>
                    
                    <button 
                      onClick={() => setShowAllFeatures({ open: true, tab: 'premium' })}
                      className="w-full border border-white/40 hover:border-white rounded-full py-2 mt-3.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
                    >
                      Toutes les fonctionnalités
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="flex justify-center items-center space-x-2 mt-3 pb-4">
            <button 
              onClick={() => setSubCardIndex(0)} 
              className={`h-2 rounded-full transition-all duration-300 ${subCardIndex === 0 ? 'bg-black w-4' : 'bg-gray-300 w-2 hover:bg-gray-400'}`}
              aria-label="Voir Bavel Extra"
            />
            <button 
              onClick={() => setSubCardIndex(1)} 
              className={`h-2 rounded-full transition-all duration-300 ${subCardIndex === 1 ? 'bg-black w-4' : 'bg-gray-300 w-2 hover:bg-gray-400'}`}
              aria-label="Voir Bavel Premium"
            />
          </div>
        </div>
      ) : (
        <div className="px-4 pb-6 space-y-2.5">
          <div 
            onClick={() => setShowSafetyCentre(true)}
            className="bg-white rounded-[16px] p-3 shadow-xs border border-gray-50 relative overflow-hidden flex items-center justify-between cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
          >
            <div className="z-10 max-w-[200px]">
              <h2 className="text-[14px] font-bold text-black mb-0.5">Safety Centre</h2>
              <p className="text-[11px] text-gray-600 font-medium leading-snug">
                Guides, outils et assistance téléphonique pour faire des rencontres en toute sécurité
              </p>
            </div>
            {/* Mock illustration for Safety Centre */}
            <div className="w-[60px] h-[60px] z-0 pointer-events-none opacity-100 shrink-0 absolute -right-2 top-2">
               <svg viewBox="0 0 100 100" fill="none" className="w-full h-full transform -rotate-12 scale-110">
                  <path d="M70 20 C60 10 40 10 30 20 L25 40 L75 40 Z" fill="#d97034" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="#6b4c9a" strokeWidth="18" strokeDasharray="15 5" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="#4c2c78" strokeWidth="2" opacity="0.5" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#222" strokeWidth="2" />
                  <path d="M40 80 C40 60 20 60 10 80 Z" fill="#fbdcb7" />
                  <path d="M10 80 L5 70 M15 78 L12 68 M20 78 L20 68" stroke="#d6b595" strokeWidth="2" strokeLinecap="round" />
               </svg>
            </div>
          </div>

          <div 
            onClick={() => setShowHelpCenter(true)}
            className="bg-white rounded-[16px] p-4 shadow-xs border border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full bg-[#f4ebff] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-black" fill="currentColor" strokeWidth={1} />
              </div>
              <span className="text-[17px] font-medium text-black">Obtenir de l'aide de Bavel</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => {
                setEditProfileInitialSubEditor('verification');
                setShowEditProfile(true);
              }}
              className="w-full bg-white rounded-[14px] p-3 shadow-xs border border-gray-50 flex items-center text-left hover:bg-gray-50 transition-colors active:scale-[0.99]"
            >
              <div className="w-[34px] h-[34px] bg-[#0070c9] rounded-full flex items-center justify-center shrink-0 mr-3 shadow-2xs">
                <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-black mb-0.5 truncate flex items-center gap-1.5">
                  Vérification bientôt disponible
                  {isVerified && (
                    <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">Certifié ✓</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 leading-tight">Le service de vérification selfie n’est pas encore configuré.</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-1.5" />
            </button>

            <button 
              onClick={() => setShowInvisibleMode(true)}
              className="w-full bg-white rounded-[14px] p-3 shadow-xs border border-gray-50 flex items-center text-left hover:bg-gray-50 transition-colors active:scale-[0.99]"
            >
              <div className="w-[34px] h-[34px] bg-[#333333] rounded-full flex items-center justify-center shrink-0 mr-3 shadow-2xs">
                <EyeOff className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-black mb-0.5 truncate">Activer le mode Invisible</div>
                <div className="text-[11px] text-gray-500 leading-tight">Consultez les profils en toute discrétion</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-1.5" />
            </button>

            <button 
              onClick={() => setShowConfidentiality(true)}
              className="w-full bg-white rounded-[14px] p-3 shadow-xs border border-gray-50 flex items-center text-left hover:bg-gray-50 transition-colors active:scale-[0.99]"
            >
              <div className="w-[34px] h-[34px] bg-[#e9d5ff] rounded-full flex items-center justify-center shrink-0 mr-3 shadow-2xs">
                <Lock className="w-4 h-4 text-black fill-black" strokeWidth={1} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-black mb-0.5 truncate">Gérer votre confidentialité</div>
                <div className="text-[11px] text-gray-500 leading-tight">Choisissez les informations que vous partagez</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-1.5" />
            </button>

            <button 
              onClick={() => setShowCommunityCharter(true)}
              className="w-full bg-white rounded-[14px] p-3 shadow-xs border border-gray-50 flex items-center text-left hover:bg-gray-50 transition-colors active:scale-[0.99]"
            >
              <div className="w-[34px] h-[34px] bg-[#ffe6ec] rounded-full flex items-center justify-center shrink-0 mr-3 shadow-2xs">
                <Shield className="w-4 h-4 text-[#e20030]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-black mb-0.5 truncate">Charte de la Communauté</div>
                <div className="text-[11px] text-gray-500 leading-tight">Découvrez nos règles de vie et d'utilisation</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-1.5" />
            </button>
          </div>
        </div>
      )}

      {/* Advanced Security, Monetization & Gamification Modals */}
      <SelfieVerificationModal
        isOpen={showSelfieVerification}
        onClose={() => setShowSelfieVerification(false)}
      />

      <CreditsStoreModal
        isOpen={showCreditsStore}
        onClose={() => setShowCreditsStore(false)}
        onSuccess={() => {
          setCreditsBalance(monetizationService.getCredits());
        }}
      />

      <ProfileBoostModal
        isOpen={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        onOpenStore={() => {
          setShowBoostModal(false);
          setShowCreditsStore(true);
        }}
      />

      <PremiumPassModal
        isOpen={showVipPassModal}
        onClose={() => setShowVipPassModal(false)}
      />

      <QuestsAndRewardsModal
        isOpen={showQuestsModal}
        onClose={() => setShowQuestsModal(false)}
        onTriggerAction={(actionKey) => {
          setShowQuestsModal(false);
          if (actionKey === 'selfie_verify') {
            setShowSelfieVerification(true);
          } else if (actionKey === 'bio' || actionKey === 'photos_3') {
            setShowEditProfile(true);
          }
        }}
      />
    </div>
  );
}
