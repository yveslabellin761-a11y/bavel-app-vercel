import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, CameraOff, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil
} from 'lucide-react';
import { User } from '../../../types';
import { poseImg } from '../../MobileApp';
import { AddMediaSourceMenu, FullProfilePhotoModal, FacebookInfoModal } from '../Modals';
import { PROMPT_OPTIONS_MAP, LookingForMenu } from '../SettingsMenu';

import { PhotoAdviceModal } from '../../modals/PhotoAdviceModal';
import ProfilePhotoVerification from '../../../features/security/ProfilePhotoVerification';
import { searchLocations } from '../../../data/worldCities';
import {
  deleteUploadedProfilePhotoFromSupabase,
  syncProfileToSupabase,
  updateProfilePhotosInSupabase,
  uploadProfilePhotoToSupabase
} from '../../../lib/supabase';
import { getProfilePhotoStoragePath } from '../../../lib/profilePhotoUrls';
import { ImageCompressionService } from '../../../services/media/imageCompression';
import { triggerHaptic } from '../../../utils/audio';
import { parseProfileLocation } from '../../../lib/locationProfile';
import { getApiUrl } from '../../../lib/apiUrl';

export function EditProfileMenu({ 
  onClose,
  userPhotos = [],
  setUserPhotos,
  userProfile,
  setUserProfile,
  userMood = { emoji: '✌️', label: 'Plutôt confiant' },
  initialSubEditor = 'none'
}: { 
  onClose: () => void;
  userPhotos?: string[];
  setUserPhotos?: React.Dispatch<React.SetStateAction<string[]>>;
  userProfile: any;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
  userMood?: { emoji: string; label: string } | null;
  initialSubEditor?: 'none' | 'basic' | 'job_studies' | 'description' | 'detail_picker' | 'interests' | 'verification' | 'quiz';
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Desktop real-time camera states
  const [showDesktopCamera, setShowDesktopCamera] = useState(false);
  const [desktopStream, setDesktopStream] = useState<MediaStream | null>(null);
  const [desktopCameraError, setDesktopCameraError] = useState<string | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const desktopCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const desktopStreamRef = useRef<MediaStream | null>(null);

  const [activeSlotTarget, setActiveSlotTarget] = useState<number | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const savingProfileRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);
  const [showAddMediaInEdit, setShowAddMediaInEdit] = useState(false);
  const [showPhotoAdviceInEdit, setShowPhotoAdviceInEdit] = useState(false);
  const [showLiveCameraInEdit, setShowLiveCameraInEdit] = useState(false);
  const [fbModal, setFbModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Sub-editors
  const [activeSubEditor, setActiveSubEditor] = useState<'none' | 'basic' | 'job_studies' | 'description' | 'detail_picker' | 'interests' | 'verification' | 'quiz'>(initialSubEditor);
  const [selectedDetailKey, setSelectedDetailKey] = useState<string | null>(null);
  const [showLookingForMenu, setShowLookingForMenu] = useState(false);

  // Local state for basic info
  const [localName, setLocalName] = useState(userProfile?.name || '');
  const [localAge, setLocalAge] = useState(userProfile?.age || 18);
  const [localGender, setLocalGender] = useState(userProfile?.gender || '');
  const [localCity, setLocalCity] = useState(userProfile?.city || '');
  const [localLocation, setLocalLocation] = useState(userProfile?.location || userProfile?.city || '');
  const [localBirthDate, setLocalBirthDate] = useState(userProfile?.birthday || userProfile?.birthDate || '');
  const [showLocationInfoModal, setShowLocationInfoModal] = useState(false);
  
  // Local state for quiz
  const [localPrompts, setLocalPrompts] = useState<{ question: string, answer: string }[]>(userProfile?.details?.prompts || []);
  const [activePromptModal, setActivePromptModal] = useState<string | null>(null);
  const [selectedPromptOption, setSelectedPromptOption] = useState<string>('');
  const [customPromptAnswer, setCustomPromptAnswer] = useState<string>('');
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'none' | 'name' | 'birthDate' | 'gender' | 'city'>('none');
  const [locationQuery, setLocationQuery] = useState('');

  // Local state for job & studies
  const [localJob, setLocalJob] = useState(userProfile?.job || '');
  const [localStudies, setLocalStudies] = useState(userProfile?.studies || '');

  // Local state for description/bio
  const [localBio, setLocalBio] = useState(userProfile?.bio || '');

  // Local state for custom height input
  const [localHeight, setLocalHeight] = useState(() => {
    const h = userProfile?.details?.height;
    return typeof h === 'string' ? (parseInt(h, 10) || 170) : 170;
  });
  const [isCm, setIsCm] = useState<boolean>(true);
  const [heightIsSet, setHeightIsSet] = useState<boolean>(Boolean(userProfile?.details?.height));
  const [heightNotSay, setHeightNotSay] = useState<boolean>(() => {
    const h = userProfile?.details?.height;
    return h === 'Je préfère ne pas le dire';
  });

  const [localChildren, setLocalChildren] = useState<string>(() => {
    return userProfile?.details?.children || "";
  });

  const [localAlcohol, setLocalAlcohol] = useState<string>(() => {
    return userProfile?.details?.alcohol || "";
  });

  const [localRelation, setLocalRelation] = useState<string>(() => {
    return userProfile?.details?.relation || "";
  });

  const [localSexuality, setLocalSexuality] = useState<string>(() => {
    return userProfile?.details?.sexuality || "";
  });

  const [localSmoking, setLocalSmoking] = useState<string>(() => {
    return userProfile?.details?.smoking || "";
  });

  const [localZodiac, setLocalZodiac] = useState<string>(() => {
    return userProfile?.details?.zodiac || "";
  });

  const [localPets, setLocalPets] = useState<string>(() => {
    return userProfile?.details?.pets || "";
  });

  const [localReligion, setLocalReligion] = useState<string>(() => {
    return userProfile?.details?.religion || "";
  });

  const [localEducation, setLocalEducation] = useState<string>(() => {
    return userProfile?.details?.education || "";
  });

  const [localLanguages, setLocalLanguages] = useState<string>(() => {
    return userProfile?.details?.languages || "";
  });

  const [localPersonality, setLocalPersonality] = useState<string>(() => {
    return userProfile?.details?.personality || "";
  });

  const formatFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  // Local state for interests search & selections
  const [interestSearch, setInterestSearch] = useState('');
  const [localInterests, setLocalInterests] = useState<{ icon: string; label: string }[]>(() => {
    const raw = userProfile?.interests || [];
    return raw.map((item: any) => {
      if (typeof item === 'string') {
        return { icon: '✨', label: item };
      }
      if (item && typeof item === 'object') {
        return { icon: item.icon || '✨', label: item.label || item.name || String(item) };
      }
      return { icon: '✨', label: String(item || '') };
    });
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [verificationStep, setVerificationStep] = useState<'idle' | 'pose' | 'capturing' | 'analyzing' | 'success' | 'rejected'>('idle');
  const [verificationFlash, setVerificationFlash] = useState<'auto' | 'on' | 'off'>('auto');
  const [verificationFacing, setVerificationFacing] = useState<'user' | 'environment'>('user');
  const [verificationStream, setVerificationStream] = useState<MediaStream | null>(null);
  const [verificationFeedbackText, setVerificationFeedbackText] = useState('Vérification indisponible.');
  const verificationVideoRef = useRef<HTMLVideoElement | null>(null);
  const verificationCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getFirstEmptySlot = () => {
    return userPhotos.findIndex(p => !p);
  };

  const processFiles = async (files: File[], targetSlotIndex?: number) => {
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    if (uploadingSlot !== null) return;

    const rawFile = validFiles[0];
    const slotToUse = targetSlotIndex !== undefined ? targetSlotIndex : getFirstEmptySlot();
    if (slotToUse === -1) return;

    const userId = userProfile?.id;
    if (!userId) {
      setPhotoUploadError('Connectez-vous pour enregistrer une photo.');
      return;
    }

    let uploadedPath: string | null = null;
    const previousPhotoPath = getProfilePhotoStoragePath(userPhotos[slotToUse] || '');
    setPhotoUploadError(null);
    setUploadingSlot(slotToUse);
    setUploadProgress(5);
    try {
      // Compress before upload so the original, potentially large file is not stored.
      const compressedRes = await ImageCompressionService.compressImageFile(rawFile, { maxWidth: 1080, maxHeight: 1350, quality: 0.85 });
      setUploadProgress(55);
      const uploadedPhoto = await uploadProfilePhotoToSupabase(compressedRes.file, userId, slotToUse);
      uploadedPath = uploadedPhoto.path;

      const updated = [...userPhotos];
      while (updated.length <= slotToUse) updated.push('');
      updated[slotToUse] = uploadedPhoto.url;
      await updateProfilePhotosInSupabase(userId, updated);
      setUserPhotos?.(updated);
      if (previousPhotoPath && previousPhotoPath !== uploadedPath) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(previousPhotoPath);
        } catch (cleanupError) {
          console.error('Failed to remove the replaced profile photo:', cleanupError);
        }
      }
      setUploadProgress(100);
    } catch (err) {
      if (uploadedPath) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(uploadedPath);
        } catch (cleanupError) {
          console.error('Failed to remove an unreferenced profile photo:', cleanupError);
        }
      }
      console.error('Failed to process profile photo upload:', err);
      setPhotoUploadError(err instanceof Error ? err.message : 'Impossible d’enregistrer cette photo.');
    } finally {
      setUploadingSlot(null);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (activeSlotTarget !== null) {
        void processFiles(files, activeSlotTarget);
      } else {
        void processFiles(files);
      }
      e.target.value = '';
    }
  };

  const handleLiveCapture = async (base64: string) => {
    const slotToUse = activeSlotTarget !== null ? activeSlotTarget : getFirstEmptySlot();
    if (slotToUse === -1) return;

    try {
      const response = await fetch(base64);
      const blob = await response.blob();
      await processFiles([new File([blob], `profile-camera-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })], slotToUse);
    } catch (error) {
      setPhotoUploadError(error instanceof Error ? error.message : 'Impossible de traiter la photo capturée.');
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
      fileInputRef.current?.click();
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
        handleLiveCapture(dataUrl);
        
        // Stop the camera
        stopDesktopCamera();
      }
    }
  };

  const triggerFileInput = (slotIndex?: number) => {
    setActiveSlotTarget(slotIndex !== undefined ? slotIndex : null);
    fileInputRef.current?.click();
  };

  const setAsPrimaryPhoto = async (slotIndex: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!userPhotos[slotIndex]) return;
    const updated = [...userPhotos];
    [updated[0], updated[slotIndex]] = [updated[slotIndex], updated[0]];
    try {
      if (!userProfile?.id) throw new Error('Connectez-vous pour modifier vos photos.');
      await updateProfilePhotosInSupabase(userProfile.id, updated);
      setUserPhotos?.(updated);
      setPhotoUploadError(null);
    } catch (error) {
      setPhotoUploadError(error instanceof Error ? error.message : 'Impossible de modifier la photo principale.');
    }
  };

  const [photoToDeleteSlot, setPhotoToDeleteSlot] = useState<number | null>(null);

  const confirmDeletePhoto = async () => {
    if (photoToDeleteSlot === null) return;
    const slotIndex = photoToDeleteSlot;
    const removedPath = getProfilePhotoStoragePath(userPhotos[slotIndex] || '');
    const updated = [...userPhotos];
    updated[slotIndex] = '';
    if (slotIndex === 0) {
      const firstAvailableIdx = updated.findIndex((photo, index) => index > 0 && Boolean(photo));
      if (firstAvailableIdx !== -1) {
        updated[0] = updated[firstAvailableIdx];
        updated[firstAvailableIdx] = '';
      }
    }
    try {
      if (!userProfile?.id) throw new Error('Connectez-vous pour modifier vos photos.');
      await updateProfilePhotosInSupabase(userProfile.id, updated);
      setUserPhotos?.(updated);
      if (removedPath && !updated.some(photo => getProfilePhotoStoragePath(photo || '') === removedPath)) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(removedPath);
        } catch (cleanupError) {
          console.error('Failed to remove the deleted profile photo from storage:', cleanupError);
        }
      }
      setPhotoToDeleteSlot(null);
      setPhotoUploadError(null);
    } catch (error) {
      setPhotoUploadError(error instanceof Error ? error.message : 'Impossible de supprimer cette photo.');
    }
  };

  const deletePhoto = (slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoToDeleteSlot(slotIndex);
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

  const filledCount = userPhotos.filter(Boolean).length;
  let score = 20; // Base profile creation
  score += filledCount * 5; // up to 30% for photos
  if (userProfile?.bio && userProfile.bio.length > 10) score += 15;
  if (userProfile?.job || userProfile?.studies) score += 10;
  if (userProfile?.interests && userProfile.interests.length > 0) score += 10;
  if (userProfile?.details?.prompts && userProfile.details.prompts.length > 0) score += 15;
  const completionPercentage = Math.min(100, score);

  const handleCloseSubEditor = () => {
    if (initialSubEditor !== 'none') {
      onClose();
    } else {
      setActiveSubEditor('none');
    }
  };

  const saveProfileChanges = async (updates: Record<string, unknown>, closeAfterSave = true): Promise<boolean> => {
    if (savingProfileRef.current) return false;
    savingProfileRef.current = true;
    setSavingProfile(true);
    setProfileSaveError(null);
    const updated = { ...userProfile, ...updates };
    try {
      const savedProfile = await syncProfileToSupabase(updated, userPhotos);
      if (!savedProfile) throw new Error('La sauvegarde a échoué. Vérifiez votre connexion puis réessayez.');
      setUserProfile((previous: any) => ({ ...previous, ...updated }));
      if (closeAfterSave) handleCloseSubEditor();
      return true;
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Impossible de sauvegarder les modifications.');
      return false;
    } finally {
      savingProfileRef.current = false;
      setSavingProfile(false);
    }
  };

  const saveInlineProfileChanges = async (updates: Record<string, unknown>, onSaved?: () => void): Promise<boolean> => {
    const saved = await saveProfileChanges(updates, false);
    if (saved) onSaved?.();
    return saved;
  };

  // Save basic info
  const handleSaveBasic = () => {
    const name = localName.trim();
    let age = Number(localAge);
    if (!name) {
      setProfileSaveError('Le prénom est obligatoire.');
      return;
    }
    if (!Number.isInteger(age) || age < 18 || age > 99) {
      setProfileSaveError('L’âge doit être compris entre 18 et 99 ans.');
      return;
    }
    if (localBirthDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(localBirthDate)) {
        setProfileSaveError('Saisissez une date de naissance valide.');
        return;
      }
      const birthday = new Date(`${localBirthDate}T00:00:00.000Z`);
      const today = new Date();
      const birthdayAge = today.getUTCFullYear() - birthday.getUTCFullYear() -
        (today.toISOString().slice(5, 10) < localBirthDate.slice(5, 10) ? 1 : 0);
      if (Number.isNaN(birthday.getTime()) || birthdayAge < 18 || birthday > today) {
        setProfileSaveError('La date de naissance doit correspondre à un âge d’au moins 18 ans.');
        return;
      }
      age = birthdayAge;
    }
    const location = parseProfileLocation(localLocation || localCity, userProfile?.countryCode);
    void saveProfileChanges({
      name,
      age,
      gender: localGender,
      city: localCity.trim() || userProfile?.city,
      location: localLocation || localCity || userProfile?.location,
      country: location.country || userProfile?.country,
      countryCode: location.countryCode || userProfile?.countryCode,
      locationSource: 'manual',
      birthday: localBirthDate || userProfile?.birthday || userProfile?.birthDate || undefined,
      birthDate: localBirthDate || userProfile?.birthDate || userProfile?.birthday || undefined
    });
  };

  // Save job & studies
  const handleSaveJobStudies = () => {
    void saveProfileChanges({ job: localJob, studies: localStudies });
  };

  // Save bio
  const handleSaveBio = () => {
    void saveProfileChanges({ bio: localBio });
  };

  // Predefined lists of options for details
  const DETAIL_OPTIONS: Record<string, string[]> = {
    children: ["J'en ai déjà", "J'en ai et j'en voudrais d'autres", "J'en voudrais un jour", "Je n'en veux pas", "Je ne sais pas trop"],
    alcohol: ["Non-buveur", "Occasionnellement", "Régulièrement", "Socialement"],
    languages: ["Français", "Français, Anglais", "Français, Anglais, Espagnol", "Français, Allemand", "Multilingue"],
    relation: ["Célibataire", "En couple", "Marié(e)", "C'est compliqué", "Polyamoureux(se)"],
    sexuality: ["Hétéro", "Bi", "Gai / Lesbienne", "Asexuel(le)", "Queer"],
    smoking: ["Non-fumeur", "Fumeur occasionnel", "Fumeur", "Vapoteur"],
    zodiac: ["Bélier", "Taureau", "Gémeaux", "Cancer", "Lion", "Vierge", "Balance", "Scorpion", "Sagittaire", "Capricorne", "Verseau", "Poissons"],
    pets: ["Chien", "Chat", "Poisson", "Oiseau", "Rongeur", "Sans animaux", "J'adore tous les animaux !"],
    religion: ["Catholique", "Protestant", "Musulman", "Juif", "Bouddhiste", "Athée", "Agnostique", "Spirituel"],
    education: ["Diplôme universitaire", "Diplôme d'études secondaires", "Master / Doctorat", "Autodidacte"],
    personality: ["Calme", "Extraverti", "Créatif", "Rêveur", "Aventurier", "Introverti", "Analytique"]
  };

  const detailFields = [
    { key: 'height', icon: Ruler, label: 'Taille', value: userProfile?.details?.height || 'Non renseigné' },
    { key: 'children', icon: Baby, label: 'Enfants', value: userProfile?.details?.children || 'Non renseigné' },
    { key: 'alcohol', icon: Wine, label: 'Alcool', value: userProfile?.details?.alcohol || 'Non renseigné' },
    { key: 'languages', icon: Languages, label: 'Vous parlez...', value: userProfile?.details?.languages || 'Non renseigné' },
    { key: 'relation', icon: Heart, label: 'Relation', value: userProfile?.details?.relation || 'Non renseigné' },
    { key: 'sexuality', icon: UserIcon, label: 'Sexualité', value: userProfile?.details?.sexuality || 'Non renseigné' },
    { key: 'smoking', icon: Cigarette, label: 'Tabac', value: userProfile?.details?.smoking || 'Non renseigné' },
    { key: 'zodiac', icon: Sparkles, label: 'Signe astrologique', value: userProfile?.details?.zodiac || 'Non renseigné' },
    { key: 'pets', icon: Dog, label: 'Animaux', value: userProfile?.details?.pets || 'Non renseigné' },
    { key: 'religion', icon: Target, label: 'Religion', value: userProfile?.details?.religion || 'Non renseigné' },
    { key: 'education', icon: GraduationCap, label: "Niveau d'études", value: userProfile?.details?.education || 'Non renseigné' },
    { key: 'personality', icon: Brain, label: 'Personnalité', value: userProfile?.details?.personality || 'Non renseigné' },
  ];

  // Open detail picker
  const handleOpenDetailPicker = (key: string) => {
    setSelectedDetailKey(key);
    if (key === 'height') {
      const h = userProfile?.details?.height || '';
      setHeightIsSet(Boolean(h));
      if (h === 'Je préfère ne pas le dire') {
        setHeightNotSay(true);
        setLocalHeight(170);
      } else {
        setHeightNotSay(false);
        const parsed = parseInt(h);
        setLocalHeight(isNaN(parsed) ? 170 : parsed);
      }
    }
    if (key === 'children') {
      setLocalChildren(userProfile?.details?.children || "");
    }
    if (key === 'alcohol') {
      setLocalAlcohol(userProfile?.details?.alcohol || "");
    }
    if (key === 'relation') {
      setLocalRelation(userProfile?.details?.relation || "");
    }
    if (key === 'sexuality') {
      setLocalSexuality(userProfile?.details?.sexuality || "");
    }
    if (key === 'smoking') {
      setLocalSmoking(userProfile?.details?.smoking || "");
    }
    if (key === 'zodiac') {
      setLocalZodiac(userProfile?.details?.zodiac || "");
    }
    if (key === 'pets') {
      setLocalPets(userProfile?.details?.pets || "");
    }
    if (key === 'religion') {
      setLocalReligion(userProfile?.details?.religion || "");
    }
    if (key === 'education') {
      setLocalEducation(userProfile?.details?.education || "");
    }
    if (key === 'languages') {
      setLocalLanguages(userProfile?.details?.languages || "");
    }
    if (key === 'personality') {
      setLocalPersonality(userProfile?.details?.personality || "");
    }
    setActiveSubEditor('detail_picker');
  };

  // Save selected detail
  const handleSaveDetailValue = (key: string, value: string) => {
    if (!value.trim()) {
      setProfileSaveError('Sélectionnez une valeur avant de l’enregistrer.');
      return;
    }
    void saveProfileChanges({ details: { ...userProfile?.details, [key]: value } });
  };

  // Key objective options
  const OBJECTIVE_OPTIONS = [
    "Trouver un(e) partenaire de vie",
    "Une histoire sérieuse mais sans pression",
    "Faire des rencontres amicales",
    "Discuter et voir où ça mène",
    "Rien de très sérieux"
  ];

  const handleSelectObjective = (obj: string) => {
    void saveProfileChanges({ keyQuestion: obj }, false);
  };

  // Predefined interests database for editing
  const CATEGORIZED_INTERESTS_DB = [
    {
      title: 'Musique',
      items: [
        { icon: '🥁', label: 'Afrobeats' },
        { icon: '🎉', label: 'Beats dansants' },
        { icon: '🎻', label: 'Desi' },
        { icon: '💃', label: 'Disco' },
        { icon: '🤖', label: 'EDM' },
        { icon: '🎵', label: 'Fan de musique' },
        { icon: '🎧', label: 'Hip-hop' },
        { icon: '📀', label: 'House' },
        { icon: '🎷', label: 'Jazz' },
        { icon: '🎤', label: 'K-Pop' },
        { icon: '🎛️', label: 'Mixer' },
        { icon: '🎹', label: 'Musique classique' },
        { icon: '🎻', label: 'Musique country' },
        { icon: '🎸', label: 'Musique indépendante' },
        { icon: '💃', label: 'Musique latine' },
        { icon: '💀', label: 'Métal' },
        { icon: '🎶', label: 'Pop' },
        { icon: '🧑‍🎤', label: 'Punk' },
        { icon: '🎙️', label: 'R&B' },
        { icon: '🌴', label: 'Reggae' },
        { icon: '👩‍🎤', label: 'Rock' },
        { icon: '🔌', label: 'Techno' }
      ]
    },
    {
      title: 'Lecture et livres',
      items: [
        { icon: '💥', label: 'Bande-dessinée' },
        { icon: '📖', label: 'Biographies' },
        { icon: '🏷️', label: 'Clubs de lecture' },
        { icon: '🏆', label: 'Développement personnel' },
        { icon: '📚', label: 'Dévore les livres' },
        { icon: '🐉', label: 'Fantastique' },
        { icon: '🕯️', label: 'Fiction classique' },
        { icon: '❤️', label: "Histoires d'amour" },
        { icon: '👻', label: 'Horreur' },
        { icon: '😆', label: 'Livres amusants' },
        { icon: '🌸', label: 'Manga' },
        { icon: '✉️', label: 'Poésie' },
        { icon: '🎩', label: 'Roman historique' },
        { icon: '👽', label: 'Science-fiction' }
      ]
    },
    {
      title: 'Soin de soi',
      items: [
        { icon: '🧴', label: 'Aromathérapie' },
        { icon: '🛋️', label: 'Détente' },
        { icon: '🖋️', label: 'Journal intime' },
        { icon: '🧘', label: 'Méditation' },
        { icon: '☁️', label: 'Pleine conscience' },
        { icon: '💆', label: 'Sessions spa' },
        { icon: '🛀', label: 'Soin de soi' },
        { icon: '☀️', label: 'Soins de la peau' },
        { icon: '💬', label: 'Thérapie' }
      ]
    },
    {
      title: "Compétences et centres d'intérêt",
      items: [
        { icon: '🚙', label: 'Accro à la mécanique' },
        { icon: '🎪', label: 'Arts du cirque' },
        { icon: '✂️', label: 'Arts et artisanat' },
        { icon: '🌌', label: 'Astronomie' },
        { icon: '✍️', label: 'Belle plume' },
        { icon: '🔨', label: 'Bricolage' },
        { icon: '🧪', label: 'Chimie' },
        { icon: '🖼️', label: "Collection d'art" },
        { icon: '🎭', label: 'Comédien' },
        { icon: '✏️', label: 'Conception' },
        { icon: '🧵', label: 'Couture' },
        { icon: '🤳', label: 'Création de contenu' },
        { icon: '▶️', label: 'Créer des playlists' },
        { icon: '🧗', label: 'Escalade' },
        { icon: '🧑‍🍳', label: 'Fan de cuisine' },
        { icon: '📀', label: 'Fan de disques vinyle' },
        { icon: '⛳', label: 'Golf' },
        { icon: '🌋', label: 'Géologie' },
        { icon: '🌿', label: 'Jardinage' },
        { icon: '🎮', label: 'Jeux vidéo' },
        { icon: '🎻', label: "Joue d'un instrument" },
        { icon: '♟️', label: "Joueur d'échecs" },
        { icon: '🔮', label: 'Lecture de cartes' },
        { icon: '💄', label: 'Maquillage' },
        { icon: '👕', label: 'Marchés aux puces' },
        { icon: '➗', label: 'Mathématiques' },
        { icon: '💅', label: 'Nail art' },
        { icon: '🚆', label: 'Observation de trains' },
        { icon: '🦅', label: 'Observation des oiseaux' },
        { icon: '📢', label: 'Parler en public' },
        { icon: '⛸️', label: 'Patin à glace' },
        { icon: '🎨', label: 'Peinture' },
        { icon: '📸', label: 'Photographie' },
        { icon: '💡', label: 'Physique' },
        { icon: '💐', label: 'Plantes à la maison' },
        { icon: '🏺', label: 'Poterie' },
        { icon: '🎤', label: 'Pratique du chant' },
        { icon: '🎧', label: 'Producteur de musique' },
        { icon: '🎣', label: 'Pêche' },
        { icon: '🎬', label: 'Réalisateur de films' },
        { icon: '💻', label: 'Rédaction de blog' },
        { icon: '📔', label: 'Scrapbooking' },
        { icon: '🛹', label: 'Skateboard' },
        { icon: '💃', label: 'Super danseur' },
        { icon: '🧶', label: 'Tricot' },
        { icon: '👖', label: 'Vêtements vintage' },
        { icon: '💫', label: 'Âme créative' },
        { icon: '🐴', label: 'Équitation' }
      ]
    },
    {
      title: 'Sport et fitness',
      items: [
        { icon: '🔌', label: 'Adepte du fitness' },
        { icon: '🥋', label: 'Arts martiaux' },
        { icon: '🎽', label: 'Athlétisme' },
        { icon: '🚣', label: 'Aviron' },
        { icon: '🏸', label: 'Badminton' },
        { icon: '⚾', label: 'Baseball' },
        { icon: '🏀', label: 'Basketball' },
        { icon: '🎱', label: 'Billard' },
        { icon: '🥊', label: 'Boxe' },
        { icon: '🏃', label: 'Cardio' },
        { icon: '🏃', label: 'Course à pied' },
        { icon: '🏏', label: 'Cricket' },
        { icon: '🚲', label: 'Cyclisme' },
        { icon: '🏋️', label: "Faire de l'exercice" },
        { icon: '💨', label: 'Faire du jogging' },
        { icon: '🎯', label: 'Fléchettes' },
        { icon: '⚽', label: 'Football' },
        { icon: '🥏', label: 'Frisbee' },
        { icon: '🤸', label: 'Gymnastique' },
        { icon: '🏋️', label: 'Haltérophilie' },
        { icon: '🏒', label: 'Hockey sur gazon' },
        { icon: '🏒', label: 'Hockey sur glace' },
        { icon: '🏎️', label: 'Karting' },
        { icon: '🤼', label: 'Lutte' },
        { icon: '🏋️', label: 'Musculation' },
        { icon: '🏊', label: 'Natation' },
        { icon: '🏀', label: 'Netball' },
        { icon: '🏢', label: 'Parkour' },
        { icon: '🤸', label: 'Pilates' },
        { icon: '🏓', label: 'Ping-pong' },
        { icon: '🤿', label: 'Plongée sous-marine' },
        { icon: '🥾', label: 'Randonnée' },
        { icon: '🏉', label: 'Rugby' },
        { icon: '💪', label: 'Salle de sport' },
        { icon: '🎿', label: 'Ski' },
        { icon: '🏂', label: 'Snowboard' },
        { icon: '⚽', label: 'Sport' },
        { icon: '🏄', label: 'Surf' },
        { icon: '🎾', label: 'Tennis' },
        { icon: '⛵', label: 'Voile' },
        { icon: '🏐', label: 'Volleyball' },
        { icon: '🧘', label: 'Yoga' }
      ]
    },
    {
      title: 'Technologie',
      items: [
        { icon: '📱', label: 'As de la technologie' },
        { icon: '🧠', label: 'Tech & Digital' },
        { icon: '🖨', label: 'Impression 3D' },
        { icon: '💻', label: 'Programmation' },
        { icon: '🦾', label: 'Robotique' },
        { icon: '😎', label: 'RV' },
        { icon: '🖥️', label: 'Électronique' }
      ]
    },
    {
      title: 'Voyages',
      items: [
        { icon: '⛺', label: 'Camping' },
        { icon: '🚢', label: 'Croisières' },
        { icon: '👜', label: 'Escapades week-end' },
        { icon: '🌳', label: 'Escapades à la campagne' },
        { icon: '🔎', label: 'Explorateur urbain' },
        { icon: '✈️', label: 'Jet-setteur' },
        { icon: '🏔️', label: "L'aventure" },
        { icon: '🚗', label: 'Road trips' },
        { icon: '🦁', label: 'Safari' },
        { icon: '🏖️', label: 'Vacances à la plage' },
        { icon: '🌍', label: 'Visites touristiques' },
        { icon: '🌍', label: 'Voyageur aventurier' }
      ]
    },
    {
      title: 'Valeurs',
      items: [
        { icon: '🖤', label: 'Black Lives Matter' },
        { icon: '👏', label: 'Body positive' },
        { icon: '🙋', label: 'Bénévolat' },
        { icon: '✊', label: "Droits de l'Homme" },
        { icon: '🏳️‍🌈', label: 'Droits LGBTQIA+' },
        { icon: '💗', label: 'Droits transgenre' },
        { icon: '♻️', label: 'Développement durable' },
        { icon: '🌿', label: 'Environnement' },
        { icon: '💜', label: 'Féminisme' },
        { icon: '🚫', label: 'Stop au racisme anti-asiatique' }
      ]
    },
    {
      title: 'Boire et manger',
      items: [
        { icon: '🍖', label: 'Barbecues' },
        { icon: '🥞', label: 'Brunch le week-end' },
        { icon: '☕', label: 'Café' },
        { icon: '🍫', label: 'Chocolat' },
        { icon: '🍹', label: 'Cocktails' },
        { icon: '🥘', label: 'Cuisiner' },
        { icon: '🍕', label: 'Pizza' },
        { icon: '🍣', label: 'Sushi' },
        { icon: '🍵', label: 'Thé' },
        { icon: '🍷', label: 'Vin' },
        { icon: '🍔', label: 'Burgers' },
        { icon: '🌮', label: 'Tacos' },
        { icon: '🌱', label: 'Végan' },
        { icon: '🥗', label: 'Végétarien' },
        { icon: '🍰', label: 'Pâtisserie' }
      ]
    },
    {
      title: 'Animaux de compagnie',
      items: [
        { icon: '🐱', label: 'Chats' },
        { icon: '🐶', label: 'Chiens' },
        { icon: '🐹', label: 'Hamsters' },
        { icon: '🐰', label: 'Lapins' },
        { icon: '🦅', label: 'Oiseaux' },
        { icon: '🐠', label: 'Poissons' },
        { icon: '🦎', label: 'Reptiles' },
        { icon: '🐴', label: 'Équitation' },
        { icon: '🐾', label: 'Ami des animaux' }
      ]
    },
    {
      title: 'Divertissement',
      items: [
        { icon: '🎬', label: 'Cinéma indépendant' },
        { icon: '🎫', label: 'Concerts' },
        { icon: '🎭', label: 'Théâtre' },
        { icon: '🍿', label: 'Cinéma' },
        { icon: '📺', label: 'Séries TV' },
        { icon: '🎙️', label: 'Podcasts' },
        { icon: '🎪', label: 'Cirque' },
        { icon: '🎟️', label: 'Spectacles' },
        { icon: '💫', label: 'Stand-up' },
        { icon: '👾', label: 'Anime' },
        { icon: '📖', label: 'Lecture' }
      ]
    },
    {
      title: 'Créativité',
      items: [
        { icon: '🎨', label: 'Peinture' },
        { icon: '✏️', label: 'Dessin' },
        { icon: '📸', label: 'Photographie' },
        { icon: '🧵', label: 'Couture' },
        { icon: '🧶', label: 'Tricot' },
        { icon: '🏺', label: 'Poterie' },
        { icon: '✍️', label: 'Écriture' },
        { icon: '💃', label: 'Danse' },
        { icon: '🎭', label: 'Comédie' },
        { icon: '🛠️', label: 'Bricolage' },
        { icon: '📐', label: 'Architecture' }
      ]
    },
    {
      title: 'Nature et plein air',
      items: [
        { icon: '⛺', label: 'Camping' },
        { icon: '🥾', label: 'Randonnée' },
        { icon: '🌳', label: 'Forêt / Parcs' },
        { icon: '🏔️', label: 'Montagne' },
        { icon: '🏖️', label: 'Plage' },
        { icon: '🌿', label: 'Nature' },
        { icon: '🌅', label: 'Couchers de soleil' },
        { icon: '🛶', label: 'Canoë / Kayak' },
        { icon: '🧗', label: 'Escalade' }
      ]
    }
  ];

  const ALL_INTERESTS_DB = CATEGORIZED_INTERESTS_DB.reduce<Array<{ icon: string; label: string }>>((acc, cat) => {
    return [...acc, ...cat.items];
  }, []);

  const filteredInterestsDb = ALL_INTERESTS_DB.filter(item => 
    item.label.toLowerCase().includes(interestSearch.toLowerCase())
  );

  const toggleInterest = (item: { icon: string; label: string }) => {
    const exists = localInterests.some(i => i.label === item.label);
    let updated;
    if (exists) {
      updated = localInterests.filter(i => i.label !== item.label);
    } else {
      if (localInterests.length >= 8) {
        return; // limit to 8
      }
      updated = [...localInterests, item];
    }
    setLocalInterests(updated);
  };

  const handleSaveInterests = () => {
    void saveProfileChanges({ interests: localInterests });
  };

  const startCameraVerification = async () => {
    setVerificationStep('rejected');
    setVerificationFeedbackText('Le service serveur de vérification n’est pas configuré. Aucun selfie ne sera capturé.');
  };

  const stopVerificationCamera = () => {
    verificationStream?.getTracks().forEach(track => track.stop());
    setVerificationStream(null);
  };

  const switchVerificationCamera = () => {
    setVerificationFacing(current => current === 'user' ? 'environment' : 'user');
  };

  const toggleVerificationFlash = () => {
    setVerificationFlash(current => current === 'auto' ? 'on' : current === 'on' ? 'off' : 'auto');
  };

  const captureVerificationPhoto = () => {
    setVerificationStep('rejected');
    setVerificationFeedbackText('Aucune capture n’est possible tant que le service de vérification n’est pas configuré.');
  };

  const shouldShowProfilePhotoVerification = () => activeSubEditor === 'verification';
  if (shouldShowProfilePhotoVerification()) {
    return (
      <div className="absolute inset-0 z-[100] flex h-full flex-col overflow-hidden bg-white">
        <ProfilePhotoVerification
          onClose={handleCloseSubEditor}
          onVerified={() => setUserProfile((current: any) => ({ ...current, is_verified: true, isVerified: true }))}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#f4f4f4] z-[100] flex flex-col h-full overflow-hidden">
      {profileSaveError && (
        <div role="alert" className="absolute top-3 left-3 right-3 z-[300] flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          <span>{profileSaveError}</span>
          <button type="button" onClick={() => setProfileSaveError(null)} aria-label="Fermer le message d’erreur">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {savingProfile && <span className="sr-only" role="status">Enregistrement du profil…</span>}

      {/* Header & Main Edit Profile View */}
      {(initialSubEditor === 'none' || activeSubEditor === 'none') && (
        <>
          <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-100 shrink-0">
        <button 
          onClick={onClose} 
          className="p-1.5 -ml-1.5 active:scale-95 transition-transform cursor-pointer"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-black" strokeWidth={3} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-extrabold text-black mb-1">Rempli à {completionPercentage}%</span>
          <div className="w-[80px] h-[3px] bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setShowFullPreviewModal(true)}
          className="text-[11.5px] font-black text-white bg-black active:scale-95 transition-all px-3 py-1 rounded-full flex items-center cursor-pointer whitespace-nowrap shadow-sm"
        >
          <span>Aperçu</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide bg-gray-50/30">
        {showPreview ? (
          <div className="p-4 bg-gray-50/50 min-h-full">
            {/* Profile Preview Card (Matches Image Exactly) */}
            <div className="relative w-full aspect-[3/4.2] max-h-[510px] rounded-[28px] overflow-hidden shadow-lg bg-black mb-4">
              {userPhotos[0] ? (
                <img 
                  src={userPhotos[0]} 
                  alt="Aperçu du profil" 
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60">
                  <UserIcon className="w-12 h-12" aria-label="Aucune photo" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75 pointer-events-none" />

              {/* Top-Left Details Overlay */}
              <div className="absolute top-4 left-4 z-10 flex flex-col items-start space-y-1.5">
                <div className="flex items-center space-x-2">
                  {Boolean(userProfile?.isVerified) && (
                    <span 
                      className="w-5 h-5 rounded-full bg-[#0084ff] text-white inline-flex items-center justify-center shrink-0 shadow-xs"
                      title="Profil vérifié par photo"
                    >
                      <Check className="w-3 h-3 stroke-[3.5]" />
                    </span>
                  )}
                  <h2 className="text-[24px] font-extrabold text-white tracking-tight drop-shadow-sm">
                    {userProfile?.name || 'Membre'}, {userProfile?.age || ''}
                  </h2>
                  <div className="w-3 h-3 rounded-full bg-[#30d158] border-2 border-white shadow-xs shrink-0" />
                </div>

                <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 shadow-md">
                  <span className="text-[13px] font-extrabold text-black">
                    👋 {userProfile?.keyQuestion === 'rencontres' ? 'Des rencontres' : 
                        userProfile?.keyQuestion === 'serieuse' ? 'Une histoire sérieuse' : 
                        'Envie de discuter'}
                  </span>
                </div>

                <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-1.5 shadow-md border border-white/20">
                  <span className="text-[12px] text-white">💼</span>
                  <span className="text-[12.5px] font-bold text-white">{userProfile?.city || 'Localisation non définie'}</span>
                </div>
              </div>

              {/* Right Side Scroll Bar Indicator */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1 h-16 bg-white/70 rounded-full z-10" />

              {/* Bottom Action Buttons */}
              <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center space-x-6">
                <button 
                  onClick={() => {
                    setShowPreview(false);
                    triggerFileInput(0);
                  }}
                  className="w-13 h-13 rounded-full bg-white shadow-xl flex items-center justify-center active:scale-95 transition-transform relative cursor-pointer"
                  title="Ajouter photo"
                  aria-label="Ajouter photo"
                >
                  <Camera className="w-6 h-6 text-black" strokeWidth={2} />
                  <div className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#ff2d55] text-white flex items-center justify-center text-[10px] font-black border-2 border-white">+</div>
                </button>

                <button 
                  onClick={() => setShowPreview(false)}
                  className="w-13 h-13 rounded-full bg-white shadow-xl flex items-center justify-center active:scale-95 transition-transform relative cursor-pointer"
                  title="Modifier profil"
                  aria-label="Modifier profil"
                >
                  <UserIcon className="w-6 h-6 text-black" strokeWidth={2} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-black text-white flex items-center justify-center border-2 border-white">
                    <Edit3 className="w-2.5 h-2.5" />
                  </div>
                </button>
              </div>
            </div>

            {/* Description Section Below Card */}
            <div 
              onClick={() => {
                setLocalBio(userProfile?.bio || '');
                setActiveSubEditor('description');
              }}
              className="bg-white p-4 rounded-[20px] shadow-2xs flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 pr-4">
                <h3 className="text-[17px] font-extrabold text-black mb-1">Description</h3>
                <p className="text-[14px] font-medium text-gray-700 leading-snug">
                  {userProfile?.bio || "Sympa"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </div>
          </div>
        ) : (
          <>
        {/* Photos Section */}
        <div className="bg-white px-4 py-3 mb-1.5">
          <div 
            className="relative"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                void processFiles(Array.from(e.dataTransfer.files));
              }
            }}
          >
            {/* Hidden Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />

            <input 
              type="file" 
              ref={cameraInputRef} 
              className="hidden" 
              accept="image/*" 
              capture="user"
              onChange={handleFileChange} 
            />

            {/* Drag & Drop Overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-black/10 backdrop-blur-xs border-2 border-dashed border-black rounded-xl z-50 flex flex-col items-center justify-center text-black font-black transition-all">
                <div className="bg-white p-3 rounded-full shadow-lg mb-2">
                  <Plus className="w-7 h-7 animate-pulse" />
                </div>
                <span className="text-[13px]">Déposez vos photos ici</span>
              </div>
            )}

            <div className="max-w-[280px] sm:max-w-[320px] mx-auto w-full mb-3">
              <div className="grid grid-cols-3 gap-1.5">
                {/* Slot 0 (col-span-2 row-span-2) */}
                <div className="col-span-2 row-span-2 aspect-[2/2.1] rounded-[14px] overflow-hidden relative border border-gray-100 bg-gray-50 flex items-center justify-center group shadow-2xs">
                  {userPhotos[0] ? (
                    <>
                      <img src={userPhotos[0]} className="w-full h-full object-cover object-top" alt="Profile 1" />
                      {/* Delete button */}
                      <button 
                        onClick={(e) => deletePhoto(0, e)}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-xs transition-colors z-20"
                      >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => triggerFileInput(0)}
                      className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-black transition-colors"
                    >
                      <Plus className="w-7 h-7 mb-1" strokeWidth={1.5} />
                      <span className="text-[11px] font-bold">Photo principale</span>
                    </button>
                  )}

                  {/* Loading overlay */}
                  {uploadingSlot === 0 && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-30">
                      <div className="w-8 h-8 border-[3px] border-white/30 border-t-white rounded-full animate-spin mb-2" />
                      <span className="text-[11px] font-bold">{uploadProgress}%</span>
                    </div>
                  )}
                </div>

                {/* Slots 1, 2, 3, 4, 5 */}
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div 
                    key={idx}
                    className="aspect-[1/1] bg-gray-50 rounded-[12px] flex items-center justify-center border border-gray-100 relative overflow-hidden group shadow-3xs"
                  >
                    {userPhotos[idx] ? (
                      <>
                        <img src={userPhotos[idx]} className="w-full h-full object-cover object-top" alt={`Photo ${idx + 1}`} />
                        <button 
                          onClick={(e) => deletePhoto(idx, e)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-xs transition-colors z-20 cursor-pointer"
                          title="Supprimer la photo"
                        >
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                        
                        {/* Option pour définir cette photo comme principale */}
                        <button 
                          onClick={(e) => setAsPrimaryPhoto(idx, e)}
                          className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-white/95 hover:bg-white text-purple-900 border border-purple-100 rounded-full text-[8.5px] font-black tracking-tight shadow-3xs transition-all active:scale-95 z-20 flex items-center gap-0.5 cursor-pointer"
                          title="Définir comme photo principale"
                        >
                          ★ Activer
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => triggerFileInput(idx)}
                        className="w-full h-full flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100/50 transition-all"
                      >
                        <Plus className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    )}

                    {/* Loading overlay */}
                    {uploadingSlot === idx && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-30">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                        <span className="text-[9px] font-bold">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {photoUploadError && (
              <p className="mb-3 text-center text-sm text-red-600" role="alert">
                {photoUploadError}
              </p>
            )}

            <button 
              onClick={() => triggerFileInput()}
              disabled={uploadingSlot !== null}
              className="w-full bg-[#111111] active:bg-black text-white font-bold py-2.5 rounded-full text-[13.5px] transition-transform active:scale-98 shadow-sm flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={3} />
              <span>Ajouter des photos</span>
            </button>
          </div>
        </div>

        {/* Basic Info (Interactive) */}
        <button 
          onClick={() => {
            setLocalName(userProfile?.name || '');
            setLocalAge(userProfile?.age || 34);
            setLocalGender(userProfile?.gender || 'homme');
            setLocalCity(userProfile?.city || '');
            setActiveSubEditor('basic');
          }}
          className="w-full bg-white px-4 py-3 mb-1.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Infos de base</span>
            <span className="text-[16px] font-black text-black leading-tight">
              {userProfile?.name || 'Membre'}, {userProfile?.age || ''}
            </span>
            <span className="text-[12.5px] font-medium text-gray-500">
              {userProfile?.gender === 'homme' ? 'Homme' : userProfile?.gender === 'femme' ? 'Femme' : 'Non défini'}, {userProfile?.city || 'Localisation non définie'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        {/* Emploi et études (Interactive) */}
        <button 
          onClick={() => {
            setLocalJob(userProfile?.job || '');
            setLocalStudies(userProfile?.studies || '');
            setActiveSubEditor('job_studies');
          }}
          className="w-full bg-white px-4 py-3 mb-1.5 text-left hover:bg-gray-50 transition-colors flex justify-between items-center cursor-pointer"
        >
          <div className="flex-1 pr-4">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Emploi et études</h2>
            {userProfile?.job || userProfile?.studies ? (
              <div className="text-[13.5px] text-black font-extrabold leading-snug">
                {userProfile?.job && <p>💼 {userProfile.job}</p>}
                {userProfile?.studies && <p>🎓 {userProfile.studies}</p>}
              </div>
            ) : (
              <p className="text-[13.5px] text-gray-400 font-bold leading-snug">
                Ajouter
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-black shrink-0" strokeWidth={3} />
        </button>

        {/* Ce que je cherche / Questions-Clés (Interactive) */}
        <div className="px-3 mb-1.5">
          <button 
            onClick={() => setShowLookingForMenu(true)}
            className="w-full bg-white px-4 py-3 text-left transition-colors flex justify-between items-center cursor-pointer rounded-[18px]"
          >
            <div className="flex-1 pr-3">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ce que je cherche</h2>
              <p className="text-[14px] font-extrabold text-black">
                {userProfile?.keyQuestion === 'rencontres' ? 'Des rencontres' : 
                 userProfile?.keyQuestion === 'discuter' ? 'Discuter' : 
                 userProfile?.keyQuestion === 'serieuse' ? 'Une histoire sérieuse' : 
                 userProfile?.keyQuestion || 'Une histoire sérieuse'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-black shrink-0" strokeWidth={3} />
          </button>
        </div>

        {/* Description (Interactive) */}
        <div className="px-3 mb-1.5">
          <button 
            onClick={() => {
              setLocalBio(userProfile?.bio || '');
              setActiveSubEditor('description');
            }}
            className="w-full bg-white px-4 py-3 text-left transition-colors flex justify-between items-center cursor-pointer rounded-[18px]"
          >
            <div className="flex-1 pr-3">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ma Description </h2>
              <p className="text-[13.5px] text-black font-extrabold leading-tight line-clamp-1">
                {userProfile?.bio || "Présentez-vous en quelques mots..."}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-black shrink-0" strokeWidth={3} />
          </button>
        </div>

        {/* Dites-nous en plus sur vous (Interactive options list) */}
        <div className="bg-white px-4 py-3 mb-1.5">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dites-nous en plus sur vous</h2>
          <div className="flex flex-col">
            {detailFields.map((item, i) => (
              <button 
                key={i} 
                onClick={() => handleOpenDetailPicker(item.key)}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 w-full hover:bg-gray-50/50 px-1 -mx-1 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <item.icon className="w-4 h-4 text-black" strokeWidth={2.5} />
                  <span className="text-[13px] font-semibold text-black">{item.label}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`text-[12px] truncate max-w-[140px] ${item.value ? 'text-black font-bold' : 'text-gray-400'}`}>
                    {item.value || 'Ajouter'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Questions-Clés */}
        <div className="bg-white px-4 py-4 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-[20px] font-black text-black tracking-tight">Questions-Clés</h2>
            <button 
              onClick={() => setLocalPrompts([])}
              className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
          
          <div className="space-y-2">
            {localPrompts.map((p, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setEditingPromptIndex(idx);
                  setActiveSubEditor('quiz');
                }}
                className="bg-[#f6f6f6] rounded-[18px] px-4 py-2.5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="flex-1 pr-3">
                  <span className="block text-[10.5px] font-bold text-gray-400 mb-0.5 leading-tight line-clamp-1">{p.question}</span>
                  <p className="text-[13px] font-extrabold text-black leading-tight">{p.answer}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-black stroke-[3] shrink-0 opacity-80 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}

            {localPrompts.length < 3 && (
              <button 
                onClick={() => {
                  setEditingPromptIndex(null);
                  setActiveSubEditor('quiz');
                }}
                className="w-full bg-[#111111] text-white rounded-full h-[46px] flex items-center justify-center space-x-2 active:scale-[0.98] transition-all mt-2.5 shadow-sm"
              >
                <MessageCircleMore className="w-4.5 h-4.5 text-white fill-white" strokeWidth={0} />
                <span className="text-[13px] font-black tracking-tight">
                  {localPrompts.length === 0 
                    ? "Ajouter mes questions" 
                    : localPrompts.length === 1 
                      ? "Encore 2 et c'est bon !" 
                      : "Encore une et c'est bon !"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Centres d'intérêt (Interactive) */}
        <div className="bg-white px-4 py-3 mb-1.5">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Centres d'intérêt</h2>
            <button 
              onClick={() => {
                setLocalInterests(userProfile?.interests || []);
                setInterestSearch('');
                setActiveSubEditor('interests');
              }}
              className="text-[11.5px] font-bold text-black bg-[#f6f6f6] hover:bg-gray-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              Modifier
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(userProfile?.interests || []).length > 0 ? (
              (userProfile?.interests || []).map((interest: any, i: number) => {
                const isObj = typeof interest === 'object' && interest !== null;
                const label = isObj ? (interest.label || interest.name || '') : String(interest);
                const icon = isObj ? interest.icon : null;
                return (
                  <div key={label || i} className="bg-white border border-gray-100 rounded-full px-2.5 py-1 flex items-center space-x-1 shadow-3xs">
                    {icon && <span className="text-[12px]">{icon}</span>}
                    <span className="text-[11.5px] font-bold text-black">{label}</span>
                  </div>
                );
              })
            ) : (
              <span className="text-[13px] text-gray-400 italic">Aucun centre d'intérêt sélectionné</span>
            )}
          </div>
        </div>

        {/* Verification is unavailable until the server-side service is deployed. */}
        <div className="bg-white px-4 py-3 mb-1.5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Vérification par selfie</h2>
            {userProfile?.isVerified && (
              <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 fill-green-800 text-white" />
                <span>Vérifié</span>
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-gray-500 leading-snug mb-2.5">
            Le service de vérification selfie n’est pas encore disponible. Aucun selfie ne sera capturé ni badge ajouté.
          </p>
          <button 
            onClick={() => {
              setVerificationStep('idle');
              setActiveSubEditor('verification');
            }}
            className="w-full bg-gray-200 text-gray-600 font-bold py-2.5 rounded-full text-[13.5px] flex items-center justify-center space-x-2 cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Vérification bientôt disponible</span>
          </button>
        </div>

          </>
        )}

      </div>
        </>
      )}

      {/* Sub-Editor Modal Rendering */}
      <AnimatePresence>
        {activeSubEditor !== 'none' && (
          <motion.div 
            initial={initialSubEditor !== 'none' ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="absolute inset-0 bg-white z-[150] flex flex-col h-full overflow-hidden"
          >
            
            {/* Infos Screen (Matches Image 1) */}
            {activeSubEditor === 'basic' && (
              <div className="flex flex-col h-full bg-white relative">
                {/* Header Bar */}
                <div className="flex items-center justify-between pt-10 pb-3 px-4 border-b border-gray-100 shrink-0">
                  <button 
                    type="button"
                    onClick={handleSaveBasic} 
                    disabled={savingProfile}
                    className="p-1 -ml-1 text-black hover:opacity-75 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                  </button>
                  <h3 className="font-bold text-[17px] text-black">Infos</h3>
                  <div className="w-6" /> {/* Spacer for centering */}
                </div>

                {/* Main Content List */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-100 border-b border-gray-100">
                    {/* Prénom Row */}
                    <button 
                      type="button"
                      onClick={() => setEditingField('name')}
                      className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-gray-50/80 transition-colors cursor-pointer text-left"
                    >
                      <span className="text-[15px] font-normal text-black">Prénom</span>
                      <div className="flex items-center space-x-1 text-[15px] text-gray-500 font-normal">
                        <span>{localName || 'Membre'}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>

                    {/* Né(e) le Row */}
                    <button 
                      type="button"
                      onClick={() => setEditingField('birthDate')}
                      className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-gray-50/80 transition-colors cursor-pointer text-left"
                    >
                      <span className="text-[15px] font-normal text-black">Né(e) le</span>
                      <div className="flex items-center space-x-1 text-[15px] text-gray-500 font-normal">
                        <span>{localBirthDate}</span>
                      </div>
                    </button>

                    {/* Sexe Row */}
                    <button 
                      type="button"
                      onClick={() => setEditingField('gender')}
                      className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-gray-50/80 transition-colors cursor-pointer text-left"
                    >
                      <span className="text-[15px] font-normal text-black">Sexe</span>
                      <div className="flex items-center space-x-1 text-[15px] text-gray-500 font-normal">
                        <span className="capitalize">
                          {localGender === 'homme' ? 'Homme' : localGender === 'femme' ? 'Femme' : 'Autre'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>

                    {/* Emplacement Row */}
                    <button 
                      type="button"
                      onClick={() => setEditingField('city')}
                      className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-gray-50/80 transition-colors cursor-pointer text-left"
                    >
                      <span className="text-[15px] font-normal text-black">Emplacement</span>
                      <div className="flex items-center space-x-1 text-[15px] text-gray-500 font-normal">
                        <span>{localCity || 'Localisation non définie'}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  </div>

                  {/* Subtext and Link */}
                  <div className="px-4 pt-5 pb-8">
                    <p className="text-[13px] font-normal text-gray-500 leading-snug mb-1">
                      Les autres pourront voir que tu n'utilises pas ta localisation actuelle:
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLocationInfoModal(true)}
                      className="text-[13px] font-bold text-black underline underline-offset-3 hover:opacity-80 transition-opacity cursor-pointer text-left block"
                    >
                      Comment est-ce que ça apparaît sur mon profil ?
                    </button>
                  </div>
                </div>

                {/* Modal "Comment est-ce que ça apparaît sur mon profil ?" (Matches Image 2) */}
                <AnimatePresence>
                  {showLocationInfoModal && (
                    <div className="fixed inset-0 bg-black/60 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
                      <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        className="w-full sm:max-w-[390px] bg-white rounded-t-[28px] sm:rounded-[28px] p-6 text-left relative flex flex-col shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                      >
                        {/* Top Close Button */}
                        <button
                          type="button"
                          onClick={() => setShowLocationInfoModal(false)}
                          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-transparent hover:bg-gray-100 flex items-center justify-center text-black transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {/* Map Pin Badge Icon */}
                        <div className="w-12 h-12 rounded-full bg-[#f3e8ff] flex items-center justify-center mb-4 shrink-0">
                          <MapPin className="w-6 h-6 text-black fill-black" strokeWidth={1} />
                        </div>

                        {/* Title */}
                        <h2 className="text-[20px] sm:text-[21px] font-[850] text-black leading-tight tracking-tight mb-2.5 pr-6">
                          Nous avons rendu les détails de localisation plus clairs
                        </h2>

                        {/* Subtitle */}
                        <p className="text-[13.5px] text-gray-500 font-normal leading-normal mb-5">
                          Voir sur les profils des autres s'ils utilisent leur emplacement actuel, par exemple:
                        </p>

                        {/* Example Card 1: Position - Emplacement actuel */}
                        <div className="bg-[#f6f6f8] rounded-[18px] p-4 mb-2 border border-gray-100/80">
                          <div className="text-[12px] font-bold text-gray-500 mb-0.5">Position</div>
                          <div className="text-[18px] font-[850] text-black mb-1">{localCity || 'Localisation non définie'}</div>
                          <div className="flex items-center space-x-1.5 text-[12px] font-medium text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-700 fill-gray-700" />
                            <span>Emplacement actuel</span>
                          </div>
                        </div>

                        {/* Divider text: ou */}
                        <div className="text-center text-[13px] font-medium text-gray-400 py-1">
                          ou
                        </div>

                        {/* Example Card 2: Position - La localisation choisie */}
                        <div className="bg-[#f6f6f8] rounded-[18px] p-4 mb-6 border border-gray-100/80">
                          <div className="text-[12px] font-bold text-gray-500 mb-0.5">Position</div>
                          <div className="text-[18px] font-[850] text-black mb-1">{localCity || 'Localisation non définie'}</div>
                          <div className="flex items-center space-x-1.5 text-[12px] font-medium text-gray-600">
                            <Briefcase className="w-3.5 h-3.5 text-gray-700 fill-gray-700" />
                            <span>La localisation choisie</span>
                          </div>
                        </div>

                        {/* Buttons */}
                        <button
                          type="button"
                          onClick={() => setShowLocationInfoModal(false)}
                          className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold py-3.5 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-all mb-2.5 shadow-xs"
                        >
                          C'est compris
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                void saveInlineProfileChanges({
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                  locationSource: 'device'
                                }, () => setShowLocationInfoModal(false));
                              },
                              (error) => {
                                setProfileSaveError(error.message || 'Autorisez la localisation puis réessayez.');
                              },
                              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                            );
                          }}
                          className="w-full border border-black bg-white hover:bg-gray-50 text-black font-extrabold py-3.5 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-all"
                        >
                          Définir l'emplacement actuel
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Sub-modals for editing fields */}
                {editingField === 'name' && (
                  <div className="fixed inset-0 bg-black/50 z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] p-5 w-full max-w-[340px] shadow-xl">
                      <h3 className="text-[16px] font-bold text-black mb-3">Modifier le prénom</h3>
                      <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        className="w-full border-b-2 border-black py-2 text-[15px] font-bold text-black outline-none mb-5"
                        placeholder="Prénom"
                        autoFocus
                      />
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setEditingField('none')}
                          className="px-4 py-2 text-[13.5px] font-bold text-gray-500 hover:text-black cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveInlineProfileChanges(
                            { name: localName.trim() },
                            () => setEditingField('none')
                          )}
                          className="px-4 py-2 bg-black text-white text-[13.5px] font-bold rounded-full cursor-pointer hover:bg-neutral-800"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {editingField === 'birthDate' && (
                  <div className="fixed inset-0 bg-black/50 z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] p-5 w-full max-w-[340px] shadow-xl">
                      <h3 className="text-[16px] font-bold text-black mb-3">Date de naissance</h3>
                      <input
                        type="date"
                        value={localBirthDate}
                        onChange={(e) => setLocalBirthDate(e.target.value)}
                        className="w-full border-b-2 border-black py-2 text-[15px] font-bold text-black outline-none mb-5"
                        max={(() => {
                          const latestBirthDate = new Date();
                          latestBirthDate.setFullYear(latestBirthDate.getFullYear() - 18);
                          return latestBirthDate.toISOString().slice(0, 10);
                        })()}
                        autoFocus
                      />
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setEditingField('none')}
                          className="px-4 py-2 text-[13.5px] font-bold text-gray-500 hover:text-black cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const birthDate = new Date(`${localBirthDate}T00:00:00.000Z`);
                            const age = new Date().getUTCFullYear() - birthDate.getUTCFullYear() -
                              (new Date().toISOString().slice(5, 10) < localBirthDate.slice(5, 10) ? 1 : 0);
                            if (!localBirthDate || Number.isNaN(birthDate.getTime()) || age < 18) {
                              setProfileSaveError('La date de naissance doit correspondre à un âge d’au moins 18 ans.');
                              return;
                            }
                            void saveInlineProfileChanges(
                              { birthday: localBirthDate, birthDate: localBirthDate, age },
                              () => setEditingField('none')
                            );
                          }}
                          className="px-4 py-2 bg-black text-white text-[13.5px] font-bold rounded-full cursor-pointer hover:bg-neutral-800"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {editingField === 'gender' && (
                  <div 
                    className="fixed inset-0 bg-black/40 z-[250] flex items-end justify-center p-2.5 sm:p-4 select-none animate-in fade-in duration-200"
                    onClick={() => setEditingField('none')}
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
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setLocalGender('homme');
                            void saveInlineProfileChanges({ gender: 'homme' }, () => setEditingField('none'));
                          }}
                          className="w-full py-3.5 sm:py-4 text-center text-[#007AFF] text-[18px] sm:text-[19px] font-normal hover:bg-gray-100/60 active:bg-gray-200/60 transition-colors cursor-pointer block"
                        >
                          Homme
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setLocalGender('femme');
                            void saveInlineProfileChanges({ gender: 'femme' }, () => setEditingField('none'));
                          }}
                          className="w-full py-3.5 sm:py-4 text-center text-[#007AFF] text-[18px] sm:text-[19px] font-normal hover:bg-gray-100/60 active:bg-gray-200/60 transition-colors cursor-pointer block"
                        >
                          Femme
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setLocalGender('autre');
                            void saveInlineProfileChanges({ gender: 'autre' }, () => setEditingField('none'));
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
                            setEditingField('none');
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
                    className="fixed inset-0 bg-white z-[250] flex flex-col h-[100dvh] overflow-hidden select-none font-sans"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between relative pt-8 pb-2.5 px-4 bg-white border-b border-gray-100 shrink-0">
                      <button 
                        onClick={() => setEditingField('none')} 
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
                                const parsed = parseProfileLocation(loc.fullName);
                                void saveInlineProfileChanges({
                                  city: newCityName,
                                  location: loc.fullName,
                                  country: parsed.country,
                                  countryCode: parsed.countryCode,
                                  locationSource: 'manual'
                                }, () => {
                                  setLocalCity(newCityName);
                                  setLocalLocation(loc.fullName);
                                  setEditingField('none');
                                });
                              }}
                              className="w-full px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer block border-b border-gray-100/80 last:border-b-0"
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
              </div>
            )}

            {/* Job & Studies Editor */}
            {activeSubEditor === 'job_studies' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pt-10 pb-3 px-4 border-b border-gray-100">
                  <button onClick={() => setActiveSubEditor('none')} className="text-gray-500 font-medium text-[13.5px]">Annuler</button>
                  <h3 className="font-bold text-[15px] text-black">Emploi & Études</h3>
                  <button onClick={handleSaveJobStudies} disabled={savingProfile} className="text-[#e20030] font-bold text-[13.5px] disabled:opacity-50">
                    {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Profession / Emploi</label>
                    <input 
                      type="text"
                      value={localJob}
                      onChange={(e) => setLocalJob(e.target.value)}
                      className="w-full border-b border-gray-200 py-2 text-[15px] text-black outline-none focus:border-black font-medium"
                      placeholder="Ex: Designer, Ingénieur, Étudiant..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">École / Université</label>
                    <input 
                      type="text"
                      value={localStudies}
                      onChange={(e) => setLocalStudies(e.target.value)}
                      className="w-full border-b border-gray-200 py-2 text-[15px] text-black outline-none focus:border-black font-medium"
                      placeholder="Ex: Université du Maine, Sorbonne..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quiz Editor */}
            {activeSubEditor === 'quiz' && (
              <div className="flex flex-col h-full bg-white relative">
                {/* Header Bar */}
                <div className="flex items-center justify-between pt-10 pb-3 px-4 border-b border-gray-100 shrink-0">
                  <button 
                    onClick={() => setActiveSubEditor('none')} 
                    className="text-gray-500 font-medium text-[13.5px]"
                  >
                    Annuler
                  </button>
                  <h3 className="font-[900] text-[15.5px] text-neutral-900 tracking-tight uppercase">Questions-clés</h3>
                  <button 
                    onClick={() => {
                      void saveProfileChanges({ details: { ...userProfile?.details, prompts: localPrompts } });
                    }} 
                    disabled={savingProfile}
                    className="text-black font-black text-[13.5px]"
                  >
                    {savingProfile ? 'Enregistrement…' : 'Terminé'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0 space-y-0 bg-[#fcfcfc] flex flex-col no-scrollbar">
                  {/* Register Wizard Illustration Style */}
                  <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-2">
                    <svg viewBox="0 0 400 240" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="200" cy="120" r="100" fill="#F3E5F5" opacity="0.6" />
                      <rect x="130" y="60" width="140" height="120" rx="20" fill="white" stroke="#E1BEE7" strokeWidth="2" />
                      <rect x="145" y="80" width="110" height="8" rx="4" fill="#F3E5F5" />
                      <rect x="145" y="100" width="90" height="8" rx="4" fill="#F3E5F5" />
                      <rect x="145" y="125" width="110" height="35" rx="10" fill="#EDE7F6" />
                      
                      <g transform="translate(100, 40)">
                        <circle cx="20" cy="20" r="18" fill="#E1F5FE" />
                        <MessageCircle className="w-5 h-5 text-[#03A9F4]" style={{ transform: 'translate(10px, 10px)' }} />
                      </g>
                      
                      <g transform="translate(280, 140)">
                        <circle cx="20" cy="20" r="18" fill="#FFF3E0" />
                        <Heart className="w-5 h-5 text-[#FF9800]" style={{ transform: 'translate(10px, 10px)' }} />
                      </g>
                    </svg>
                  </div>

                  <div className="px-5 pt-4 text-center shrink-0 mb-4">
                    <h2 className="text-[17.5px] font-[900] tracking-tight text-black leading-tight mb-1">
                      Répondez à des questions
                    </h2>
                    <p className="text-[11.5px] font-[500] text-gray-500 leading-snug">
                      Vos réponses permettent aux gens de mieux vous connaître ! ({localPrompts.length}/3)
                    </p>
                  </div>

                  <div className="px-5 pb-8 space-y-2.5">
                    {[
                      "Qu'est-ce que vous appréciez le plus chez un partenaire ?",
                      "Comment votre meilleur(e) ami(e) vous décrirait-il/elle ?",
                      "Sur quoi devons-nous être sur la même longueur d'onde ?",
                      "Qu'est-ce qui vous impressionne ?",
                      "Quelle est votre qualité préférée chez vous ?",
                      "Qu'essayez-vous encore de comprendre ?",
                      "Si vous deviez choisir une seule fête, ce serait laquelle ?",
                      "Qu'est-ce que vous gardez toujours dans votre voiture ?",
                      "Que doit-on savoir sur vous avant de sortir ensemble ?",
                      "Le meilleur endroit pour un rendez-vous cinéma ?",
                      "Que recherchez-vous ?",
                      "Quel est votre plus grand critère rédhibitoire ?",
                      "Quel est le métier de vos rêves ?",
                      "À quoi ressemble l'amour selon vous ?",
                      "Comment aimez-vous passer vos week-ends ?",
                      "Qu'est-ce qui vous fait rire ?",
                      "À quoi ressemble la vie de vos rêves ?",
                      "Quelle est la chose incontournable sur votre liste de souhaits ?",
                      "Quelle est la cause qui vous tient particulièrement à cœur ?",
                      "Quel est votre genre de musique préféré ?",
                      "Quel est votre premier rendez-vous idéal ?",
                      "Que pensez-vous de l'astrologie ?",
                      "Qu'est-ce que les gens devraient savoir sur vous ?",
                      "De quoi êtes-vous le/la plus fier(e) ?",
                      "Qu'essayez-vous d'apprendre en ce moment ?",
                      "Quel est votre objectif amoureux cette année ?",
                      "Comment prenez-vous soin de vous ?",
                      "À quoi ressembliez-vous au lycée ?",
                      "Quel est votre avis sur la monogamie ?",
                      "Au cinéma, que regardez-vous ?",
                      "Quelle est votre façon préférée de passer un week-end ?",
                      "Quel est votre sport préféré à regarder ?"
                    ].map((question, idx) => {
                      const existingPrompt = localPrompts.find(p => p.question === question);
                      const isAnswered = !!existingPrompt;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (localPrompts.length >= 3 && !isAnswered && editingPromptIndex === null) {
                              setFbModal({
                                isOpen: true,
                                title: "Limite atteinte",
                                message: "Vous ne pouvez ajouter que 3 questions maximum.",
                                type: 'info'
                              });
                              return;
                            }
                            setActivePromptModal(question);
                            const options = PROMPT_OPTIONS_MAP[question] || [];
                            if (isAnswered) {
                              if (options.includes(existingPrompt.answer)) {
                                setSelectedPromptOption(existingPrompt.answer);
                                setCustomPromptAnswer('');
                              } else {
                                setSelectedPromptOption('Votre propre réponse');
                                setCustomPromptAnswer(existingPrompt.answer);
                              }
                            } else {
                              setSelectedPromptOption('');
                              setCustomPromptAnswer('');
                            }
                          }}
                          className={`w-full text-left p-4 rounded-[20px] border transition-all active:scale-[0.98] cursor-pointer ${
                            isAnswered 
                              ? 'bg-[#F3E5F5]/50 border-purple-200 shadow-xs' 
                              : 'bg-white hover:bg-gray-50 border-gray-100 shadow-3xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-[11.5px] font-[800] text-black pr-2 leading-snug">
                              {question}
                            </span>
                            {isAnswered ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocalPrompts(prev => prev.filter(p => p.question !== question));
                                }}
                                className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0"
                              >
                                <X className="w-3 h-3 stroke-[3]" />
                              </button>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-black shrink-0">
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          {isAnswered && (
                            <div className="mt-2.5 pt-2 border-t border-purple-200/60 text-[12.5px] font-bold text-purple-950">
                              "{existingPrompt.answer}"
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inline Modal for Answering */}
                <AnimatePresence>
                  {activePromptModal && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[250] flex items-end justify-center"
                      onClick={() => setActivePromptModal(null)}
                    >
                      <motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 320 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white rounded-t-[32px] p-6 text-black flex flex-col relative shadow-2xl max-h-[85vh] overflow-hidden"
                      >
                        <button
                          onClick={() => setActivePromptModal(null)}
                          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-gray-100 transition-colors cursor-pointer z-10"
                        >
                          <X className="w-5.5 h-5.5 stroke-[2.5]" />
                        </button>

                        <h2 className="text-[16px] font-[900] tracking-tight text-black leading-snug mb-4 pr-10 pt-1 shrink-0">
                          {activePromptModal}
                        </h2>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 mb-4 pr-1">
                          {(PROMPT_OPTIONS_MAP[activePromptModal] || []).concat(["Votre propre réponse"]).map((option) => {
                            const isSelected = selectedPromptOption === option;
                            return (
                              <div key={option} className="flex flex-col space-y-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPromptOption(option)}
                                  className={`w-full text-left px-4 py-3 rounded-[18px] bg-[#F4F4F6] hover:bg-[#EAEAEF] transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] border-2 ${
                                    isSelected ? 'border-black' : 'border-transparent'
                                  }`}
                                >
                                  <span className="text-[11.5px] font-[800] text-black pr-3 leading-snug">
                                    {option}
                                  </span>
                                  <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected ? 'border-black bg-black' : 'border-black/80 bg-transparent'
                                  }`}>
                                    {isSelected && (
                                      <div className="w-1 h-1 rounded-full bg-white" />
                                    )}
                                  </div>
                                </button>

                                {option === "Votre propre réponse" && isSelected && (
                                  <div className="pt-1 pb-1.5 px-1">
                                    <textarea
                                      autoFocus
                                      value={customPromptAnswer}
                                      onChange={(e) => setCustomPromptAnswer(e.target.value.slice(0, 150))}
                                      placeholder="Écrivez votre propre réponse ici..."
                                      rows={3}
                                      className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 text-[12.5px] font-bold text-black focus:outline-none focus:border-black focus:bg-white transition-all resize-none shadow-3xs"
                                    />
                                    <div className="text-right text-[11px] font-black text-gray-400 mt-1 uppercase tracking-tighter">
                                      {customPromptAnswer.length} / 150
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="shrink-0 pt-2 border-t border-gray-100 flex flex-col space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              const finalAnswer = selectedPromptOption === "Votre propre réponse" 
                                ? customPromptAnswer.trim() 
                                : selectedPromptOption;
                              
                              if (!finalAnswer) return;

                              setLocalPrompts(prev => {
                                const existingIndex = prev.findIndex(p => p.question === activePromptModal);
                                if (existingIndex >= 0) {
                                  const newPrompts = [...prev];
                                  newPrompts[existingIndex] = { question: activePromptModal, answer: finalAnswer };
                                  return newPrompts;
                                } else {
                                  if (prev.length >= 3) return prev;
                                  return [...prev, { question: activePromptModal!, answer: finalAnswer }];
                                }
                              });
                              setActivePromptModal(null);
                            }}
                            disabled={
                              !selectedPromptOption || 
                              (selectedPromptOption === "Votre propre réponse" && !customPromptAnswer.trim())
                            }
                            className={`w-full h-[48px] rounded-full font-black text-[14px] flex items-center justify-center transition-all ${
                              selectedPromptOption && (selectedPromptOption !== "Votre propre réponse" || customPromptAnswer.trim())
                                ? 'bg-black text-white hover:bg-neutral-800 active:scale-[0.97] cursor-pointer shadow-md'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Valider
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Description Bio Quiz Editor (Matches Image) */}
            {activeSubEditor === 'description' && (
              <div className="flex flex-col h-full bg-white relative p-6">
                {/* Header: Close Button 'X' */}
                <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setActiveSubEditor('none')} 
                    className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                    aria-label="Fermer"
                  >
                    <X className="w-6 h-6 stroke-[2.2]" />
                  </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                  {/* Notebook Illustration */}
                  <div className="w-full flex justify-center mb-4 shrink-0">
                    <svg viewBox="0 0 320 240" className="w-full max-h-[140px] sm:max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Open Yellow Book Base */}
                      <path d="M 35 185 Q 105 200 160 185 Q 215 200 285 185 L 275 205 Q 215 220 160 205 Q 105 220 45 205 Z" fill="#FACC15" stroke="black" strokeWidth="2.5" strokeLinejoin="round" />
                      <path d="M 45 175 Q 105 190 160 175 Q 215 190 275 175 L 285 185 Q 215 200 160 185 Q 105 200 35 185 Z" fill="#FFFFFF" stroke="black" strokeWidth="2.5" strokeLinejoin="round" />
                      <path d="M 160 175 L 160 205" stroke="black" strokeWidth="2.5" />

                      {/* Left Purple Lobe (Face/Book Page) */}
                      <path d="M 160 170 C 130 175, 75 165, 50 120 C 35 85, 60 40, 105 35 C 135 32, 155 55, 160 85 Z" fill="#D6BCFA" stroke="black" strokeWidth="2.8" strokeLinejoin="round" />
                      {/* White Cloud shapes on left page */}
                      <path d="M 70 95 Q 75 85 85 87 Q 95 80 105 85 Q 112 87 112 97 Q 112 105 95 105 Q 70 105 70 95 Z" fill="white" stroke="rgba(0,0,0,0.15)" strokeWidth="1" opacity="0.95" />
                      <path d="M 95 120 Q 100 110 110 112 Q 118 105 128 110 Q 135 113 135 123 Q 135 130 120 130 Q 95 130 95 120 Z" fill="white" stroke="rgba(0,0,0,0.15)" strokeWidth="1" opacity="0.95" />

                      {/* Right Purple Lobe (Face/Book Page) */}
                      <path d="M 160 170 C 190 175, 245 165, 270 120 C 285 85, 260 40, 215 35 C 185 32, 165 55, 160 85 Z" fill="#D6BCFA" stroke="black" strokeWidth="2.8" strokeLinejoin="round" />
                      {/* Eye on right page */}
                      <circle cx="215" cy="80" r="7" fill="black" />
                      
                      {/* Red Name Badge / Tag */}
                      <rect x="182" y="112" width="56" height="28" rx="6" fill="#EF4444" stroke="black" strokeWidth="2.5" />
                      <rect x="187" y="117" width="46" height="18" rx="3" fill="white" />
                      <path d="M 192 126 Q 202 120 210 126 T 227 126" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none" />

                      {/* Center Gold Spiral Binding */}
                      {[68, 84, 100, 116, 132, 148].map((y, i) => (
                        <g key={i}>
                          <ellipse cx="160" cy={y} rx="6" ry="10" fill="#FACC15" stroke="black" strokeWidth="2" />
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* Title */}
                  <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                    Parlez-nous de vous !
                  </h2>

                  {/* Input / Textarea */}
                  <div className="relative mb-2">
                    <textarea 
                      value={localBio}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setLocalBio(e.target.value);
                        }
                      }}
                      placeholder="Sympa, passionné(e) de voyages et de découvertes..."
                      className="w-full text-[15px] sm:text-[16px] font-medium text-black placeholder-gray-400 outline-none border-b border-gray-300 focus:border-black pb-2 bg-transparent resize-none min-h-[80px]"
                      rows={3}
                      autoFocus
                    />
                    <div className="text-right text-[12px] text-gray-400 font-semibold mt-1.5">
                      {localBio.length}/500 caractères
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation & Validation Checkmark */}
                <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                  {/* Progress Line */}
                  <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full w-2/5" />
                  </div>

                  {/* Validation Green Check Circle */}
                  <button 
                    type="button"
                    onClick={handleSaveBio}
                    disabled={savingProfile}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    aria-label="Valider la description"
                  >
                    <Check className="w-7 h-7 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* Detail Picker */}
            {activeSubEditor === 'detail_picker' && selectedDetailKey && (
              selectedDetailKey === 'height' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* House Illustration */}
                    <div className="w-full flex justify-center mb-3 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Chimney on the right of the roof */}
                        <rect x="270" y="55" width="28" height="60" fill="#E0E0E0" rx="3" />
                        <rect x="266" y="50" width="36" height="10" fill="#757575" rx="2" />
                        
                        {/* Hand waving from chimney */}
                        <path d="M284 50 C284 35, 275 30, 260 25 C250 21, 245 23, 248 18 C251 13, 260 17, 270 20 C275 14, 282 12, 286 18 C290 12, 296 14, 296 22 L290 50 Z" fill="#8D6E63" />

                        {/* House body (lavender) */}
                        <path d="M100 130 L300 130 L300 240 L100 240 Z" fill="#D1C4E9" />
                        
                        {/* House front gable/peak */}
                        <path d="M100 130 L200 70 L300 130 Z" fill="#D1C4E9" />
                        <path d="M110 130 L200 76 L290 130 Z" fill="white" opacity="0.3" />

                        {/* Red roof on top of house body */}
                        <path d="M80 135 L200 60 L320 135 L305 142 L200 78 L95 142 Z" fill="#EF5350" />

                        {/* Small circle window in the gable */}
                        <circle cx="200" cy="105" r="12" stroke="black" strokeWidth="2.5" fill="white" />

                        {/* Front door - brown frame, open doors */}
                        <rect x="160" y="150" width="80" height="90" fill="#5D4037" rx="2" />
                        {/* Inside the door: Striped curtains */}
                        <rect x="168" y="155" width="64" height="85" fill="#E0F7FA" />
                        {/* Purple/white striped curtains */}
                        <rect x="168" y="155" width="16" height="85" fill="#AB47BC" />
                        <rect x="184" y="155" width="12" height="85" fill="#E0F7FA" />
                        <rect x="196" y="155" width="8" height="85" fill="#AB47BC" />
                        <rect x="204" y="155" width="12" height="85" fill="#E0F7FA" />
                        <rect x="216" y="155" width="16" height="85" fill="#AB47BC" />
                        {/* Feet sticking out at the bottom of the curtains */}
                        <rect x="190" y="232" width="10" height="8" rx="2" fill="#FFE082" />
                        <rect x="202" y="232" width="10" height="8" rx="2" fill="#FFE082" />
                        <circle cx="192" cy="232" r="1.5" fill="#EF5350" />
                        <circle cx="195" cy="232" r="1.5" fill="#EF5350" />
                        <circle cx="204" cy="232" r="1.5" fill="#EF5350" />
                        <circle cx="207" cy="232" r="1.5" fill="#EF5350" />

                        {/* Left & Right open brown door panels */}
                        <rect x="135" y="150" width="25" height="90" fill="#3E2723" rx="1" />
                        <line x1="142" y1="160" x2="142" y2="230" stroke="#5D4037" strokeWidth="2" />
                        <line x1="149" y1="160" x2="149" y2="230" stroke="#5D4037" strokeWidth="2" />
                        
                        <rect x="240" y="150" width="25" height="90" fill="#3E2723" rx="1" />
                        <line x1="247" y1="160" x2="247" y2="230" stroke="#5D4037" strokeWidth="2" />
                        <line x1="254" y1="160" x2="254" y2="230" stroke="#5D4037" strokeWidth="2" />

                        {/* Window on the right showing people */}
                        <rect x="270" y="150" width="40" height="65" fill="#0288D1" rx="4" stroke="black" strokeWidth="2.5" />
                        <line x1="270" y1="182" x2="310" y2="182" stroke="black" strokeWidth="2" />
                        <line x1="290" y1="150" x2="290" y2="215" stroke="black" strokeWidth="2" />
                        
                        <path d="M274 182 C274 172, 280 168, 285 168 C287 168, 288 170, 288 172 C288 178, 282 182, 274 182 Z" fill="#FFE082" />
                        <path d="M306 182 C306 170, 298 165, 294 165 C292 165, 292 168, 292 170 C292 176, 298 182, 306 182 Z" fill="#8D6E63" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      combien mesurez-vous ??
                    </h2>

                    {/* Height Selector Card */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      {/* Value and Unit toggle */}
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[22px] font-[900] text-black tracking-tight select-none">
                          {heightNotSay ? 'Je préfère ne pas le dire' : heightIsSet ? (isCm ? `${localHeight} cm` : formatFeetInches(localHeight)) : 'Non renseigné'}
                        </span>
                        
                        <button 
                          type="button"
                          onClick={() => setIsCm(!isCm)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                          <span className="text-[12px] font-extrabold text-gray-800 uppercase">{isCm ? 'cm' : 'ft'}</span>
                        </button>
                      </div>

                      {/* Slider */}
                      <div className="relative pt-2 pb-1">
                        <input 
                          type="range"
                          min="130"
                          max="220"
                          value={localHeight}
                          onChange={(e) => {
                            setLocalHeight(parseInt(e.target.value, 10));
                            setHeightIsSet(true);
                            setHeightNotSay(false);
                          }}
                          className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-black"
                          style={{
                            background: `linear-gradient(to right, #000 0%, #000 ${((localHeight - 130) / (220 - 130)) * 100}%, #e5e7eb ${((localHeight - 130) / (220 - 130)) * 100}%, #e5e7eb 100%)`
                          }}
                        />
                      </div>

                      {/* "Je préfère ne pas le dire" toggle button */}
                      <button
                        type="button"
                        onClick={() => setHeightNotSay(current => !current)}
                        className={`w-full py-3 px-4 rounded-xl text-left transition-all duration-200 border flex items-center justify-between cursor-pointer ${
                          heightNotSay 
                            ? 'bg-[#EFE5FF] border-[#D4C3FC] text-black shadow-sm' 
                            : 'bg-gray-50 hover:bg-gray-100 border-transparent text-gray-800'
                        }`}
                      >
                        <span className="text-[13.5px] font-bold">Je préfère ne pas le dire</span>
                        
                        <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          heightNotSay 
                            ? 'border-black bg-white' 
                            : 'border-gray-300 bg-white'
                        }`}>
                          {heightNotSay && (
                            <div className="w-[9px] h-[9px] rounded-full bg-black" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-4 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      disabled={savingProfile || (!heightNotSay && !heightIsSet)}
                      onClick={() => {
                        const valToSave = heightNotSay ? "Je préfère ne pas le dire" : (isCm ? `${localHeight} cm` : formatFeetInches(localHeight));
                        handleSaveDetailValue('height', valToSave);
                      }}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Valider la taille"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'children' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Robot & Toys Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[150px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Purple block */}
                        <path d="M140 180 L180 180 L180 230 L140 230 Z" fill="#9C27B0" />
                        {/* Red block */}
                        <path d="M70 190 L150 190 L150 240 L70 240 Z" fill="#C62828" />
                        {/* Yellow block */}
                        <path d="M60 150 L130 150 L130 190 L60 190 Z" fill="#FDD835" />
                        <path d="M65 140 L85 140 L85 150 L65 150 Z" fill="#FDD835" />
                        <path d="M100 140 L120 140 L120 150 L100 150 Z" fill="#FDD835" />
                        
                        {/* Castle blocks */}
                        <path d="M280 150 L340 150 L340 220 L280 220 Z" fill="#880E4F" />
                        <path d="M280 130 L295 130 L295 150 L280 150 Z" fill="#880E4F" />
                        <path d="M305 130 L320 130 L320 150 L305 150 Z" fill="#880E4F" />
                        <path d="M330 130 L345 130 L345 150 L330 150 Z" fill="#880E4F" />

                        {/* Rubber Duck */}
                        <path d="M260 210 Q240 210 240 230 Q240 250 270 250 L310 250 Q330 250 330 230 Q330 210 300 210 Z" fill="#FFCA28" />
                        <circle cx="310" cy="190" r="20" fill="#FFCA28" />
                        <circle cx="315" cy="185" r="4" fill="#212121" />
                        <path d="M325 190 L345 195 L325 200 Z" fill="#D84315" />
                        <path d="M250 230 Q260 240 280 230" fill="none" stroke="#FFA000" strokeWidth="4" strokeLinecap="round" />

                        {/* Robot */}
                        {/* Antenna */}
                        <path d="M200 60 L200 40" stroke="#E1BEE7" strokeWidth="6" strokeLinecap="round" />
                        <circle cx="200" cy="35" r="6" fill="#9C27B0" />
                        
                        {/* Head */}
                        <path d="M160 60 L240 60 L240 120 L160 120 Z" fill="#D1C4E9" />
                        <path d="M145 70 L160 70 L160 100 L145 100 Z" fill="#E1BEE7" />
                        <path d="M240 70 L255 70 L255 100 L245 100 Z" fill="#E1BEE7" />
                        
                        {/* Eyes */}
                        <circle cx="185" cy="85" r="8" fill="#212121" />
                        <circle cx="215" cy="85" r="8" fill="#212121" />
                        <path d="M175 75 L195 80" stroke="#212121" strokeWidth="4" strokeLinecap="round" />
                        <path d="M225 75 L205 80" stroke="#212121" strokeWidth="4" strokeLinecap="round" />
                        
                        {/* Mouth */}
                        <path d="M175 105 L225 105 L225 115 L175 115 Z" fill="#FFF" />
                        <path d="M185 105 L185 115 M195 105 L195 115 M205 105 L205 115 M215 105 L215 115" stroke="#212121" strokeWidth="2" />
                        
                        {/* Neck */}
                        <path d="M190 120 L210 120 L210 130 L190 130 Z" fill="#B39DDB" />
                        
                        {/* Body */}
                        <path d="M160 130 L240 130 L230 200 L170 200 Z" fill="#E1BEE7" />
                        
                        {/* Body details */}
                        <circle cx="185" cy="150" r="6" fill="#D50000" />
                        <circle cx="205" cy="150" r="6" fill="#D50000" />
                        <circle cx="185" cy="170" r="6" fill="#D50000" />
                        <circle cx="205" cy="170" r="6" fill="#D50000" />
                        <path d="M170 190 L230 190" stroke="#212121" strokeWidth="20" strokeLinecap="round" />
                        
                        {/* Left Arm */}
                        <path d="M165 140 L135 180" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                        <path d="M135 180 L145 220" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                        {/* Claw Left */}
                        <path d="M135 220 Q120 230 135 240 Q150 230 155 220" fill="none" stroke="#D1C4E9" strokeWidth="8" strokeLinecap="round" />
                        
                        {/* Right Arm */}
                        <path d="M235 140 L265 180" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                        <path d="M265 180 L250 220" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                        {/* Claw Right */}
                        <path d="M260 220 Q275 230 260 240 Q245 230 240 220" fill="none" stroke="#D1C4E9" strokeWidth="8" strokeLinecap="round" />
                        
                        {/* Legs */}
                        <path d="M185 200 L185 240" stroke="#B39DDB" strokeWidth="12" strokeDasharray="5 5" />
                        <path d="M215 200 L215 240" stroke="#B39DDB" strokeWidth="12" strokeDasharray="5 5" />
                        
                        {/* Feet */}
                        <path d="M165 240 L195 240 L195 250 L165 250 Z" fill="#D1C4E9" />
                        <path d="M205 240 L235 240 L235 250 L205 250 Z" fill="#D1C4E9" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      voulez-vous des enfants ?
                    </h2>

                    {/* Kids Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "J'en voudrais un jour",
                        "J'en voudrais bientôt",
                        "Je ne veux pas d'enfants",
                        "J'ai déjà des enfants",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localChildren === label || 
                          (localChildren === "J'en ai déjà" && label === "J'ai déjà des enfants") || 
                          (localChildren === "Je n'en veux pas" && label === "Je ne veux pas d'enfants");
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalChildren(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('children', localChildren)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix enfants"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'alcohol' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Drink Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[150px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Purple liquid splash bottom */}
                        <path d="M50 250 Q100 200 130 250 Q180 230 200 280 Q250 240 280 270 Q320 250 350 270 L350 280 L50 280 Z" fill="#B39DDB" />
                        <path d="M60 210 Q90 180 120 220 Q160 200 200 240 Q240 210 260 250 Q290 230 310 250 L310 280 L60 280 Z" fill="#9575CD" opacity="0.5" />
                        
                        <path d="M70 190 Q90 140 100 180" fill="none" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                        
                        {/* Cocktail Glass */}
                        <path d="M180 130 L280 150 L240 240 L210 230 Z" fill="#E1BEE7" />
                        <path d="M210 230 L230 280 L190 270 Z" fill="#D1C4E9" />
                        
                        {/* Glass rim */}
                        <path d="M180 130 Q230 160 280 150" fill="none" stroke="#E1BEE7" strokeWidth="4" />
                        <path d="M180 130 Q220 110 280 150" fill="none" stroke="#E1BEE7" strokeWidth="4" />
                        
                        {/* Red Drink inside */}
                        <path d="M190 140 Q230 170 270 150 L240 220 L210 210 Z" fill="#D50000" />
                        <path d="M190 140 Q225 155 270 150 Q225 125 190 140 Z" fill="#EF5350" />
                        
                        {/* Cherry */}
                        <circle cx="215" cy="120" r="15" fill="#B71C1C" />
                        <path d="M215 105 Q225 80 250 90" fill="none" stroke="#388E3C" strokeWidth="3" />
                        
                        {/* Straw */}
                        <path d="M260 160 L240 50 L280 30" fill="none" stroke="#FFCA28" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Lemon slice in splash */}
                        <path d="M150 250 A 40 40 0 0 1 210 230" fill="#FFEE58" stroke="#FBC02D" strokeWidth="4" />
                        <path d="M180 240 L160 230" stroke="#FBC02D" strokeWidth="3" />
                        <path d="M180 240 L190 215" stroke="#FBC02D" strokeWidth="3" />
                        <path d="M180 240 L200 255" stroke="#FBC02D" strokeWidth="3" />
                        
                        {/* Red splashes */}
                        <path d="M140 100 Q160 130 170 110 Z" fill="#D50000" />
                        <path d="M120 70 Q140 60 150 90 Q120 100 120 70 Z" fill="#D50000" />
                        <path d="M130 150 Q160 140 140 170 Q120 180 130 150 Z" fill="#D50000" />
                        <circle cx="160" cy="180" r="5" fill="#D50000" />
                        <circle cx="110" cy="130" r="6" fill="#D50000" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      est ce que vous buvez ?
                    </h2>

                    {/* Alcohol Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "À l'occasion",
                        "Jamais",
                        "Souvent",
                        "Non, je suis sobre",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localAlcohol === label ||
                          (localAlcohol === "Occasionnellement" && label === "À l'occasion") ||
                          (localAlcohol === "Non-buveur" && label === "Jamais");
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalAlcohol(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('alcohol', localAlcohol)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix alcool"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'relation' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Relationship Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* LEFT GROUP */}
                        <g id="left-group">
                          {/* Sleeve with curvy line details */}
                          <path d="M40 210 C45 195, 55 185, 75 185 L105 185 L105 240 L50 240 C42 235, 38 225, 40 210 Z" fill="#EF5350" />
                          <path d="M48 200 Q56 205, 64 200 M52 212 Q60 217, 68 212 M56 224 Q64 229, 72 224" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                          
                          {/* Stack of colorful blocks */}
                          <path d="M105 180 L205 180 L205 220 L115 220 C109 220, 105 216, 105 210 Z" fill="#29B6F6" />
                          <line x1="155" y1="180" x2="155" y2="220" stroke="#0288D1" strokeWidth="2.5" />

                          {/* Purple middle block with lips */}
                          <rect x="105" y="140" width="100" height="36" rx="4" fill="#B39DDB" />
                          <path d="M140 158 C145 152, 160 152, 165 158 C160 164, 145 164, 140 158 Z" fill="#FF8A80" stroke="#D32F2F" strokeWidth="1.5" />
                          <line x1="140" y1="158" x2="165" y2="158" stroke="#D32F2F" strokeWidth="1.5" />

                          {/* Red block with nose */}
                          <rect x="105" y="105" width="100" height="32" rx="4" fill="#EF5350" />
                          <path d="M145 112 L165 112 L165 126" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Brown hand arching over */}
                          <path d="M75 185 C75 140, 100 105, 145 105 C170 105, 185 118, 185 125" stroke="#8D6E63" strokeWidth="16" strokeLinecap="round" />
                          <ellipse cx="145" cy="135" rx="14" ry="10" fill="white" />
                          <circle cx="145" cy="135" r="5" fill="black" />
                          <circle cx="120" cy="112" r="7" stroke="#29B6F6" strokeWidth="2" fill="none" />
                        </g>

                        {/* RIGHT GROUP */}
                        <g id="right-group">
                          <path d="M285 100 L325 100 L315 70 L295 70 Z" fill="#29B6F6" />
                          <line x1="290" y1="100" x2="290" y2="70" stroke="#0288D1" strokeWidth="2" />
                          <line x1="305" y1="100" x2="305" y2="70" stroke="#0288D1" strokeWidth="2" />
                          <line x1="320" y1="100" x2="320" y2="70" stroke="#0288D1" strokeWidth="2" />

                          <rect x="255" y="110" width="110" height="40" rx="4" fill="#B39DDB" />

                          <rect x="245" y="155" width="120" height="30" rx="4" fill="#29B6F6" />
                          <ellipse cx="275" cy="170" rx="10" ry="7" fill="white" />
                          <circle cx="275" cy="170" r="4.5" fill="black" />
                          <ellipse cx="330" cy="170" rx="10" ry="7" fill="white" />
                          <circle cx="330" cy="170" r="4.5" fill="black" />

                          <path d="M240 190 L320 190 L320 220 L240 220 Z" fill="#F5F5F5" />
                          <path d="M320 190 L365 190 L365 220 L320 220 Z" fill="#212121" />

                          <path d="M315 90 L315 135 C315 142, 310 145, 305 145" stroke="#FFF9C4" strokeWidth="14" strokeLinecap="round" />
                          <circle cx="292" cy="142" r="3" fill="#EF5350" />
                          <circle cx="302" cy="145" r="3" fill="#EF5350" />
                          <circle cx="312" cy="142" r="3" fill="#EF5350" />
                        </g>
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      quelle est votre situation amoureuse ?
                    </h2>

                    {/* Relation Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Célibataire",
                        "En couple",
                        "C'est compliqué",
                        "Relation libre",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localRelation === label;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalRelation(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('relation', localRelation)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix situation amoureuse"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'sexuality' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Space Illustration (Astronaut with Flag) */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 320 180" className="w-full max-h-[130px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Background Stars */}
                        <circle cx="45" cy="35" r="1.5" fill="#B39DDB" />
                        <circle cx="280" cy="45" r="1" fill="#B39DDB" />
                        <circle cx="100" cy="20" r="1.2" fill="#B39DDB" />
                        
                        {/* Planet Saturn in top-left */}
                        <ellipse cx="40" cy="50" rx="14" ry="10" fill="#E1BEE7" />
                        <path d="M20 53 C30 43, 50 43, 60 53 C55 60, 25 60, 20 53 Z" stroke="#B39DDB" strokeWidth="2.5" fill="none" />
                        
                        {/* Red/Pink cratered Moon in top-right */}
                        <circle cx="270" cy="65" r="12" fill="#FF8A80" />
                        <circle cx="266" cy="61" r="2.5" fill="#EF9A9A" />
                        <circle cx="274" cy="69" r="2" fill="#EF9A9A" />
                        <circle cx="272" cy="59" r="1.5" fill="#EF9A9A" />

                        {/* Curved red/orange hills with hearts */}
                        <path d="M10 180 C80 115, 240 115, 310 180 Z" fill="#FFCDD2" />
                        {/* Hearts on the floor */}
                        <path d="M80 150 C80 145, 95 145, 95 150 C95 155, 80 160, 80 150 Z" fill="#EF5350" />
                        <path d="M230 145 C230 140, 245 140, 245 145 C245 150, 230 155, 230 145 Z" fill="#EF5350" />

                        {/* Flagpole and Flag with heart */}
                        <line x1="205" y1="140" x2="205" y2="55" stroke="black" strokeWidth="3" strokeLinecap="round" />
                        <path d="M205 55 L265 55 L255 70 L265 85 L205 85 Z" fill="#EF5350" />
                        {/* Heart on flag */}
                        <path d="M227 65 C227 62, 233 62, 233 65 C233 69, 227 73, 227 65 Z" fill="white" />
                        <path d="M233 65 C233 62, 239 62, 239 65 C239 69, 233 73, 233 65 Z" fill="white" />

                        {/* Astronaut */}
                        {/* Legs */}
                        <path d="M135 125 L125 150" stroke="#E1BEE7" strokeWidth="10" strokeLinecap="round" />
                        <path d="M155 125 L165 150" stroke="#E1BEE7" strokeWidth="10" strokeLinecap="round" />
                        <path d="M118 150 L128 150" stroke="black" strokeWidth="4" strokeLinecap="round" />
                        <path d="M160 150 L170 150" stroke="black" strokeWidth="4" strokeLinecap="round" />
                        
                        {/* Body / Spacesuit */}
                        <rect x="125" y="85" width="40" height="38" rx="12" fill="#EDE7F6" stroke="black" strokeWidth="1.5" />
                        {/* Backpack */}
                        <rect x="117" y="89" width="8" height="26" rx="3" fill="#D1C4E9" />
                        {/* Suit Controls (three red dots + black plate) */}
                        <circle cx="135" cy="95" r="1.5" fill="#EF5350" />
                        <circle cx="145" cy="95" r="1.5" fill="#EF5350" />
                        <circle cx="155" cy="95" r="1.5" fill="#EF5350" />
                        <rect x="133" y="103" width="24" height="4" rx="1" fill="black" />

                        {/* Arms */}
                        {/* Waving left arm */}
                        <path d="M125 91 C115 85, 105 75, 100 60" stroke="#EDE7F6" strokeWidth="8" strokeLinecap="round" />
                        <circle cx="100" cy="60" r="5" fill="#B39DDB" />
                        
                        {/* Right arm holding flagpole */}
                        <path d="M165 91 C180 91, 185 105, 205 105" stroke="#EDE7F6" strokeWidth="8" strokeLinecap="round" />
                        <circle cx="203" cy="105" r="5" fill="#B39DDB" />

                        {/* Helmet */}
                        <circle cx="145" cy="67" r="18" fill="white" stroke="black" strokeWidth="1.5" />
                        {/* Visor */}
                        <ellipse cx="145" cy="67" rx="13" ry="9" fill="#1A237E" />
                        {/* Visor reflection */}
                        <ellipse cx="141" cy="64" rx="4" ry="2.5" fill="white" opacity="0.6" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      Quelle est votre orientation sexuelle ?
                    </h2>

                    {/* Sexuality Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Hétérosexuel(le)",
                        "Gay",
                        "Lesbienne",
                        "Bisexuel(le)",
                        "Asexuel(le)",
                        "Démisexuel(le)",
                        "Pansexuel(le)",
                        "Queer",
                        "En questionnement",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localSexuality === label ||
                          (localSexuality === "Hétéro" && label === "Hétérosexuel(le)") ||
                          (localSexuality === "Bi" && label === "Bisexuel(le)") ||
                          (localSexuality === "Gai / Lesbienne" && (label === "Gay" || label === "Lesbienne"));
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalSexuality(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('sexuality', localSexuality)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix orientation sexuelle"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'smoking' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Smoking Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Purple smoke/magic dust */}
                        <path d="M160 50 Q100 40 120 90 Q140 140 180 100 Q200 80 180 60 Z" fill="#E1BEE7" />
                        <path d="M120 140 Q100 130 110 160 Q120 190 150 170 Q180 150 160 140 Z" fill="#E1BEE7" />
                        <path d="M220 120 Q180 140 200 180 Q220 220 260 200 Q280 180 250 150 Z" fill="#E1BEE7" opacity="0.7" />
                        
                        {/* Dark smoke particles */}
                        <path d="M190 60 Q210 40 240 60 Q260 80 250 110" fill="none" stroke="#212121" strokeWidth="8" strokeDasharray="4 8" strokeLinecap="round" />
                        <path d="M210 80 Q230 70 250 90" fill="none" stroke="#424242" strokeWidth="6" strokeDasharray="2 6" strokeLinecap="round" />
                        
                        {/* Ashtray */}
                        <ellipse cx="140" cy="220" rx="60" ry="25" fill="#212121" />
                        <ellipse cx="140" cy="215" rx="50" ry="20" fill="#424242" />
                        
                        <path d="M120 220 Q140 240 160 220" fill="none" stroke="#E1BEE7" strokeWidth="15" strokeLinecap="round" />
                        <path d="M130 220 Q140 230 150 220" fill="none" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
                        
                        {/* Divots in ashtray */}
                        <path d="M85 215 Q95 210 105 220" fill="none" stroke="#212121" strokeWidth="6" strokeLinecap="round" />
                        <path d="M175 215 Q185 210 195 220" fill="none" stroke="#212121" strokeWidth="6" strokeLinecap="round" />
                        <path d="M130 240 Q140 235 150 240" fill="none" stroke="#212121" strokeWidth="4" strokeLinecap="round" />

                        {/* Sparkles */}
                        <path d="M120 70 L125 75 L130 70 L125 65 Z" fill="#FFF" />
                        <path d="M140 150 L143 153 L146 150 L143 147 Z" fill="#FFF" />
                        <path d="M160 210 L162 212 L164 210 L162 208 Z" fill="#FFF" />

                        {/* Sleeve */}
                        <path d="M240 280 L310 280 L300 230 L230 230 Z" fill="#D50000" />
                        <path d="M245 280 L235 230 M265 280 L255 230 M285 280 L275 230 M305 280 L295 230" stroke="#B71C1C" strokeWidth="4" />

                        {/* Hand base */}
                        <path d="M240 230 Q230 180 260 140 Q280 120 300 140 L310 230 Z" fill="#F4A460" />
                        
                        {/* Fingers */}
                        <path d="M300 140 Q330 130 330 150 Q330 160 300 170" fill="#F4A460" />
                        <path d="M290 130 Q340 100 340 120 Q340 140 290 155" fill="#F4A460" />
                        <path d="M275 125 Q325 80 330 100 Q335 120 280 145" fill="#F4A460" />
                        <path d="M260 140 Q250 80 270 70 Q280 60 290 80 Q290 100 270 120" fill="#F4A460" />
                        
                        {/* Thumb crossing over */}
                        <path d="M230 180 Q250 150 280 150 Q295 150 285 170 Q270 190 240 200" fill="#E28743" />
                        
                        {/* Blue Nails */}
                        <path d="M325 145 Q335 145 330 152" fill="#0288D1" />
                        <path d="M335 110 Q345 110 340 120" fill="#0288D1" />
                        <path d="M325 90 Q335 90 330 100" fill="#0288D1" />
                        <path d="M265 72 Q275 68 275 75" fill="#0288D1" />

                        {/* Ring */}
                        <path d="M285 150 L275 160" stroke="#FFD700" strokeWidth="4" />
                        <circle cx="280" cy="155" r="4" fill="#D50000" />
                        
                        {/* Cigarette / Object being smoked */}
                        <path d="M265 95 L200 95 L190 105 L255 105 Z" fill="#424242" />
                        <path d="M190 105 L180 105 L185 95 L195 95 Z" fill="#E0E0E0" />
                        <circle cx="185" cy="100" r="3" fill="#FF5252" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      est ce que vous fumez ?
                    </h2>

                    {/* Smoking Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Oui",
                        "Non",
                        "Parfois",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localSmoking === label ||
                          (localSmoking === "Non-fumeur" && label === "Non") ||
                          (localSmoking === "Fumeur" && label === "Oui") ||
                          (localSmoking === "Fumeur occasionnel" && label === "Parfois") ||
                          (localSmoking === "Vapoteur" && label === "Parfois");
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalSmoking(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('smoking', localSmoking)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix tabac"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'zodiac' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Star Sign Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Deep space cosmic background blob */}
                        <path d="M40 140 Q100 20 220 50 Q360 80 340 180 Q320 260 160 250 Q60 220 40 140 Z" fill="#1E1E2E" />
                        <path d="M60 140 Q110 50 210 70 Q310 90 310 170 Q280 230 170 220 Q80 200 60 140 Z" fill="#2D2B40" />

                        {/* Constellation Stars and Connection Lines */}
                        <line x1="120" y1="130" x2="160" y2="100" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                        <line x1="160" y1="100" x2="220" y2="110" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                        <line x1="220" y1="110" x2="240" y2="170" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                        <line x1="240" y1="170" x2="190" y2="200" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                        <line x1="190" y1="200" x2="120" y2="130" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                        <line x1="220" y1="110" x2="270" y2="90" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />

                        {/* Star sparkles */}
                        <g transform="translate(120, 130)">
                          <path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" fill="#FFFFFF" />
                        </g>
                        <g transform="translate(220, 110)">
                          <path d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" fill="#E8D1FF" />
                        </g>
                        <g transform="translate(160, 100)">
                          <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#4DD0E1" />
                        </g>
                        <g transform="translate(240, 170)">
                          <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#FF1744" />
                        </g>
                        <g transform="translate(190, 200)">
                          <path d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z" fill="#B388FF" />
                        </g>
                        <circle cx="90" cy="80" r="2" fill="#FFFFFF" opacity="0.8" />
                        <circle cx="100" cy="180" r="3" fill="#E8D1FF" opacity="0.6" />
                        <circle cx="280" cy="140" r="2.5" fill="#4DD0E1" opacity="0.7" />
                        <circle cx="260" cy="70" r="1.5" fill="#FFFFFF" opacity="0.9" />
                        <circle cx="150" cy="220" r="2" fill="#FF8A80" opacity="0.5" />

                        {/* Hand sketching */}
                        <path d="M380 230 L310 180 L350 145 L400 180 Z" fill="#EDE7F6" />
                        <path d="M365 215 L325 185 L335 172 L375 202 Z" fill="#FF1744" stroke="#FF1744" strokeWidth="2" />
                        <path d="M325 180 C310 170 270 145 250 150 C235 154 225 170 235 185 C245 195 285 210 315 210 Z" fill="#8D5524" />
                        <path d="M245 160 C240 155 230 162 232 168 C234 174 245 180 252 176 Z" fill="#704118" />
                        <path d="M250 165 C245 160 238 167 240 173 C242 179 250 183 258 179 Z" fill="#8D5524" />
                        <path d="M258 172 C253 167 246 174 248 180 C250 186 258 189 265 184 Z" fill="#704118" />

                        {/* Cyan Pencil */}
                        <g transform="translate(230, 120) rotate(28)">
                          <rect x="0" y="0" width="12" height="70" rx="3" fill="#00ACC1" />
                          <rect x="3" y="0" width="6" height="70" fill="#00E5FF" />
                          <polygon points="0,0 6,-14 12,0" fill="#E5A93B" />
                          <polygon points="4,-9 6,-14 8,-9" fill="#263238" />
                        </g>
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      Quel est votre signe astrologique ?
                    </h2>

                    {/* Zodiac Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Bélier",
                        "Taureau",
                        "Gémeaux",
                        "Cancer",
                        "Lion",
                        "Vierge",
                        "Balance",
                        "Scorpion",
                        "Sagittaire",
                        "Capricorne",
                        "Verseau",
                        "Poissons",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localZodiac === label;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalZodiac(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('zodiac', localZodiac)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix signe astrologique"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'pets' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Pets Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Grass background patch */}
                        <path d="M40 230 Q140 190 240 230 Q290 250 360 230 L360 270 L40 270 Z" fill="#8BC34A" />
                        <path d="M70 220 Q110 200 170 230 Q210 250 290 230 Z" fill="#7CB342" />
                        
                        {/* Tiny Grass details */}
                        <path d="M60 225 L62 215 M64 226 L68 217" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M320 228 L323 218 M325 229 L329 220" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M110 232 L112 222 M114 233 L118 224" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M220 235 L222 225 M224 236 L228 227" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Dog (Brown Dachshund) */}
                        <path d="M125 165 Q110 140 100 148 Q92 155 110 170 Z" fill="#A04000" />
                        <rect x="135" y="175" width="12" height="45" rx="6" fill="#8d3d19" />
                        <rect x="150" y="175" width="12" height="45" rx="6" fill="#A04000" />
                        <rect x="250" y="175" width="12" height="45" rx="6" fill="#8d3d19" />
                        <rect x="265" y="175" width="12" height="45" rx="6" fill="#A04000" />
                        <path d="M130 180 L275 180 Q290 180 290 160 L130 160 Z" fill="#A04000" />
                        <rect x="272" y="145" width="6" height="20" rx="2" transform="rotate(-15 272 145)" fill="#E53935" />
                        <circle cx="280" cy="162" r="4.5" fill="#FDD835" />
                        <circle cx="290" cy="140" r="18" fill="#A04000" />
                        <path d="M290 130 L325 142 Q335 145 325 152 L290 152 Z" fill="#A04000" />
                        <circle cx="325" cy="146" r="4" fill="#1C2833" />
                        <circle cx="288" cy="136" r="2.5" fill="#1C2833" />
                        <path d="M276 138 C270 140 265 158 268 172 C270 176 278 176 277 167 C275 158 279 143 276 138 Z" fill="#8d3d19" />

                        {/* Cat (Sitting on Dog's back) */}
                        <path d="M175 168 C165 158 165 118 180 113 C195 108 205 128 200 168 Z" fill="#D1C4E9" />
                        <path d="M195 160 Q215 145 205 115 Q198 100 208 105" fill="none" stroke="#D1C4E9" strokeWidth="6" strokeLinecap="round" />
                        <circle cx="190" cy="95" r="16" fill="#D1C4E9" />
                        <path d="M177 89 L174 73 L185 81 Z" fill="#D1C4E9" />
                        <path d="M179 87 L176 77 L183 81 Z" fill="#F8BBD0" />
                        <path d="M203 89 L206 73 L195 81 Z" fill="#D1C4E9" />
                        <path d="M201 87 L204 77 L197 81 Z" fill="#F8BBD0" />
                        <circle cx="185" cy="93" r="1.5" fill="#1C2833" />
                        <circle cx="195" cy="93" r="1.5" fill="#1C2833" />
                        <polygon points="190,96 188,98 192,98" fill="#F8BBD0" />
                        <path d="M180 97 L165 95 M180 99 L167 100 M200 97 L215 95 M200 99 L213 100" stroke="#7E57C2" strokeWidth="1" strokeLinecap="round" />
                        <rect x="182" y="107" width="16" height="3" rx="1.5" fill="#E53935" />
                        <circle cx="190" cy="111" r="2.5" fill="#FDD835" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      Avez-vous des animaux de compagnie ?
                    </h2>

                    {/* Pets Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Chat(s)",
                        "Chien(s)",
                        "Chats et chiens",
                        "Autres",
                        "Pas d'animaux",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localPets === label ||
                          (localPets === "Chat" && label === "Chat(s)") ||
                          (localPets === "Chien" && label === "Chien(s)") ||
                          (localPets === "Sans animaux" && label === "Pas d'animaux");
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalPets(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('pets', localPets)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix animaux"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'religion' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Religion Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="200" cy="110" r="60" fill="#FFE0B2" opacity="0.4" />
                        <ellipse cx="200" cy="180" rx="45" ry="12" fill="#5C6BC0" />
                        <rect x="175" y="110" width="50" height="70" rx="6" fill="#EDE7F6" />
                        <ellipse cx="200" cy="110" rx="25" ry="8" fill="#D1C4E9" />
                        <rect x="197" y="98" width="6" height="15" fill="#37474F" />

                        {/* Flame */}
                        <path d="M200 95 C190 80 195 60 200 45 C205 60 210 80 200 95 Z" fill="#FF7043" />
                        <path d="M200 90 C194 78 197 65 200 52 C203 65 206 78 200 90 Z" fill="#FFCA28" />

                        {/* Left Hand */}
                        <path d="M70 250 L110 180 L140 160 L160 175 L120 260 Z" fill="#E64A19" />
                        <path d="M125 150 C125 130 110 90 120 70 C125 60 135 60 140 70 C148 85 145 110 150 130 Z" fill="#D7CCC8" />
                        <path d="M140 140 C145 120 142 85 152 75 C158 68 168 72 165 85 C162 105 160 125 162 145 Z" fill="#D7CCC8" />
                        <path d="M158 145 C162 125 165 90 175 85 C182 82 190 90 185 102 C180 118 175 135 170 155 Z" fill="#D7CCC8" />
                        <path d="M172 160 C178 145 185 120 195 122 C202 125 203 138 195 148 C188 158 180 170 175 180 Z" fill="#D7CCC8" />

                        {/* Right Hand */}
                        <path d="M330 250 L290 180 L260 160 L240 175 L280 260 Z" fill="#E64A19" />
                        <path d="M275 150 C275 130 290 90 280 70 C275 60 265 60 260 70 C252 85 255 110 250 130 Z" fill="#D7CCC8" />
                        <path d="M260 140 C255 120 258 85 248 75 C242 68 232 72 235 85 C238 105 240 125 238 145 Z" fill="#D7CCC8" />
                        <path d="M242 145 C238 125 235 90 225 85 C218 82 210 90 215 102 C220 118 225 135 230 155 Z" fill="#D7CCC8" />
                        <path d="M228 160 C222 145 215 120 205 122 C198 125 197 138 205 148 C212 158 220 170 225 180 Z" fill="#D7CCC8" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      Quelle est votre religion ?
                    </h2>

                    {/* Religion Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Agnostique",
                        "Athée",
                        "Bouddhiste",
                        "Catholique",
                        "Chrétien(ne)",
                        "Hindou(e)",
                        "Jaïne",
                        "Juif / Juive",
                        "Mormon(e)",
                        "Musulman(e)",
                        "Zoroastrien(ne)",
                        "Sikh",
                        "Spirituel(le)",
                        "Autre",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localReligion === label ||
                          (localReligion === "Chrétien" && label === "Chrétien(ne)") ||
                          (localReligion === "Juif" && label === "Juif / Juive") ||
                          (localReligion === "Musulman" && label === "Musulman(e)") ||
                          (localReligion === "Spirituel" && label === "Spirituel(le)");
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalReligion(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-neutral-50/80 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('religion', localReligion)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix religion"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'education' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Education Level Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Graduation cap */}
                        <path d="M110 90 L200 60 L290 90 L200 120 Z" fill="#D1C4E9" />
                        <path d="M140 100 L140 130 Q200 160 260 130 L260 100" fill="none" stroke="#B39DDB" strokeWidth="8" strokeLinecap="round" />
                        <path d="M130 90 L110 160" stroke="#FFCA28" strokeWidth="4" />
                        <circle cx="110" cy="165" r="8" fill="#FFCA28" />
                        <path d="M105 165 L100 185 L120 185 L115 165 Z" fill="#FFCA28" />

                        {/* Books */}
                        <path d="M140 230 L320 230 L320 280 L140 280 Z" fill="#D50000" />
                        <path d="M145 240 L315 240 L315 270 L145 270 Z" fill="#FFCA28" />
                        <path d="M160 250 L300 250 M160 260 L300 260" stroke="#212121" strokeWidth="2" />
                        
                        <path d="M120 180 L220 180 L220 230 L120 230 Z" fill="#E1BEE7" />
                        <path d="M125 190 L215 190 L215 220 L125 220 Z" fill="#FFCA28" />
                        <path d="M140 200 L200 200 M140 210 L200 210" stroke="#212121" strokeWidth="2" />

                        {/* Apple */}
                        <path d="M260 180 Q250 140 280 140 Q290 140 300 150 Q310 140 320 140 Q350 140 340 180 Q330 220 300 220 Q270 220 260 180 Z" fill="#D50000" />
                        <path d="M300 150 Q295 130 310 120" fill="none" stroke="#81C784" strokeWidth="6" strokeLinecap="round" />
                        <path d="M275 155 Q285 145 295 155 Q290 165 275 155 Z" fill="#FF8A80" opacity="0.6" />

                        {/* Pencil */}
                        <path d="M305 115 L365 245 L375 240 L315 110 Z" fill="#FFCA28" />
                        <path d="M365 245 L375 240 L380 265 Z" fill="#F4A460" />
                        <path d="M375 255 L380 265 L372 253 Z" fill="#212121" />
                        <path d="M305 115 L315 110 L320 120 L310 125 Z" fill="#EF5350" />
                        <path d="M312 110 L322 130" stroke="#212121" strokeWidth="2" />

                        {/* Glasses */}
                        <circle cx="100" cy="240" r="30" fill="#FFF" stroke="#212121" strokeWidth="12" />
                        <circle cx="180" cy="240" r="30" fill="#FFF" stroke="#212121" strokeWidth="12" />
                        <path d="M130 240 L150 240" stroke="#212121" strokeWidth="8" strokeLinecap="round" />
                        <path d="M180 210 L195 190" stroke="#212121" strokeWidth="8" strokeLinecap="round" />
                        
                        {/* Glasses glare */}
                        <path d="M85 230 L115 250 M100 225 L115 235" stroke="#FFCA28" strokeWidth="3" strokeLinecap="round" />
                        <path d="M165 230 L195 250 M180 225 L195 235" stroke="#FFCA28" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      Quel est votre niveau d'études ?
                    </h2>

                    {/* Education Level Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Lycée",
                        "Diplôme universitaire",
                        "En études supérieures",
                        "À l'université",
                        "Licence/Bachelor",
                        "Master / Doctorat",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localEducation === label ||
                          (localEducation === "Diplôme d'études secondaires" && label === "Lycée");
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalEducation(label)}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-[#F5F5F5] border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[19px] h-[19px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                              isSelected ? 'border-black' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <div className="w-[8.5px] h-[8.5px] bg-black rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('education', localEducation)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix niveau d'études"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'languages' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* World Landmarks Illustration */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Ocean / Globe base */}
                        <path d="M40 200 C80 140 180 120 360 160 C380 220 280 270 120 260 C60 250 30 230 40 200 Z" fill="#29B6F6" opacity="0.85" />
                        <path d="M80 180 C120 150 220 140 340 170 C310 220 200 250 100 230 Z" fill="#0288D1" opacity="0.6" />
                        
                        {/* Eiffel Tower (Left) */}
                        <g transform="translate(60, 20)">
                          <path d="M40 190 L60 80 L80 190 M52 130 L68 130 M46 160 L74 160 M55 190 Q60 165 65 190" stroke="#1A1A24" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          <path d="M60 80 L60 20" stroke="#1A1A24" strokeWidth="3" strokeLinecap="round" />
                          <line x1="56" y1="100" x2="64" y2="100" stroke="#1A1A24" strokeWidth="2" />
                          <line x1="54" y1="115" x2="66" y2="115" stroke="#1A1A24" strokeWidth="2" />
                          <line x1="50" y1="145" x2="70" y2="145" stroke="#1A1A24" strokeWidth="2.5" />
                          <line x1="48" y1="175" x2="72" y2="175" stroke="#1A1A24" strokeWidth="2.5" />
                        </g>

                        {/* Leaning Tower of Pisa (Center) */}
                        <g transform="translate(150, 15) rotate(12 200 120)">
                          <rect x="30" y="20" width="60" height="150" rx="4" fill="#E57373" />
                          <path d="M30 20 Q60 0 90 20 Z" fill="#D32F2F" />
                          <rect x="25" y="35" width="70" height="12" rx="2" fill="#BA68C8" />
                          <rect x="25" y="60" width="70" height="12" rx="2" fill="#BA68C8" />
                          <rect x="25" y="85" width="70" height="12" rx="2" fill="#BA68C8" />
                          <rect x="25" y="110" width="70" height="12" rx="2" fill="#BA68C8" />
                          <rect x="25" y="135" width="70" height="12" rx="2" fill="#BA68C8" />
                          <circle cx="45" cy="41" r="3" fill="#FFFFFF" />
                          <circle cx="60" cy="41" r="3" fill="#FFFFFF" />
                          <circle cx="75" cy="41" r="3" fill="#FFFFFF" />
                          <circle cx="45" cy="66" r="3" fill="#FFFFFF" />
                          <circle cx="60" cy="66" r="3" fill="#FFFFFF" />
                          <circle cx="75" cy="66" r="3" fill="#FFFFFF" />
                          <circle cx="45" cy="91" r="3" fill="#FFFFFF" />
                          <circle cx="60" cy="91" r="3" fill="#FFFFFF" />
                          <circle cx="75" cy="91" r="3" fill="#FFFFFF" />
                        </g>

                        {/* Sydney Opera House Sails (Right) */}
                        <g transform="translate(230, 90)">
                          <path d="M10 100 Q40 20 80 80 Q50 90 10 100 Z" fill="#F5F5F5" stroke="#37474F" strokeWidth="2" />
                          <path d="M40 100 Q70 30 110 85 Q80 92 40 100 Z" fill="#FFFFFF" stroke="#37474F" strokeWidth="2" />
                          <path d="M70 100 Q100 45 135 90 Q110 95 70 100 Z" fill="#ECEFF1" stroke="#37474F" strokeWidth="2" />
                          <path d="M0 100 L140 100 L130 115 L10 115 Z" fill="#D7CCC8" />
                        </g>
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      Quelles langues parlez-vous ?
                    </h2>

                    {/* Languages Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Anglais",
                        "Français",
                        "Allemand",
                        "Espagnol",
                        "italien",
                        "portugais",
                        "russe",
                        "Chinois",
                        "afrikaans",
                        "indonésien",
                        "Bosniaque",
                        "catalan",
                        "tchèque",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localLanguages === label || localLanguages.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              if (label === "Je préfère ne pas le dire") {
                                setLocalLanguages(label);
                              } else if (localLanguages === "Je préfère ne pas le dire") {
                                setLocalLanguages(label);
                              } else if (localLanguages.includes(label)) {
                                const list = localLanguages.split(', ').filter(l => l !== label);
                                setLocalLanguages(list.length > 0 ? list.join(', ') : "Français");
                              } else {
                                const list = localLanguages ? localLanguages.split(', ').filter(l => l !== "Je préfère ne pas le dire") : [];
                                setLocalLanguages([...list, label].join(', '));
                              }
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-[#F5F5F5] border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-black text-white' : 'border-[2px] border-neutral-300'
                            }`}>
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('languages', localLanguages)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix des langues"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : selectedDetailKey === 'personality' ? (
                <div className="flex flex-col h-full bg-white relative p-6">
                  {/* Top Bar / Close Button */}
                  <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setActiveSubEditor('none')} 
                      className="p-1 -ml-2 text-black hover:opacity-75 transition-opacity cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col pt-1 overflow-y-auto">
                    {/* Flower / Hand SVG Illustration from Quiz Step 14 */}
                    <div className="w-full flex justify-center mb-2 shrink-0">
                      <svg viewBox="0 0 400 280" className="w-full max-h-[150px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Ground */}
                        <path d="M50 240 Q150 200 250 240 Q300 260 350 240 L350 280 L50 280 Z" fill="#8BC34A" />
                        <path d="M80 230 Q120 210 180 240 Q220 260 280 240 Z" fill="#7CB342" />

                        {/* Plants */}
                        <path d="M100 250 Q120 180 150 200" fill="none" stroke="#558B2F" strokeWidth="8" strokeLinecap="round" />
                        <path d="M120 180 Q100 150 80 160 Q60 170 90 200" fill="#B39DDB" stroke="#9C27B0" strokeWidth="2" />
                        <path d="M120 180 Q110 160 90 170" fill="#9C27B0" />
                        
                        {/* Main Flower */}
                        <path d="M180 250 Q200 150 200 150" fill="none" stroke="#558B2F" strokeWidth="10" strokeLinecap="round" />
                        
                        <path d="M180 210 Q250 150 280 230" fill="#8BC34A" />
                        <path d="M180 220 Q220 170 240 220" fill="#7CB342" />
                        
                        <path d="M170 230 Q150 180 130 250" fill="#8BC34A" />
                        <path d="M170 240 Q160 200 150 240" fill="#7CB342" />

                        {/* Petals */}
                        <path d="M200 150 Q160 110 150 140 Q140 170 200 150" fill="#E1BEE7" />
                        <path d="M200 150 Q180 80 200 80 Q220 80 200 150" fill="#D1C4E9" />
                        <path d="M200 150 Q240 110 250 140 Q260 170 200 150" fill="#E1BEE7" />
                        <path d="M200 150 Q170 180 180 190 Q190 200 200 150" fill="#D1C4E9" />
                        <path d="M200 150 Q230 180 220 190 Q210 200 200 150" fill="#D1C4E9" />

                        {/* Flower Center */}
                        <circle cx="200" cy="150" r="15" fill="#FDD835" />
                        <path d="M195 135 L195 115 M205 135 L205 115" stroke="#F57F17" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="195" cy="115" r="3" fill="#FFF" />
                        <circle cx="205" cy="115" r="3" fill="#FFF" />

                        {/* Hand picking flower */}
                        <path d="M350 80 L320 80 L290 120 L310 160 L350 160 Z" fill="#D1C4E9" />
                        <path d="M350 80 L320 80 L290 120 L310 160 L350 160 Z" fill="#D50000" opacity="0.8" stroke="#D50000" strokeWidth="4" strokeDasharray="10 10" />
                        
                        <path d="M300 130 Q280 120 260 120 Q240 120 230 130 Q220 140 220 150 Q220 160 230 160 Q240 160 250 150 Q260 140 280 140" fill="#8D6E63" />
                        <path d="M225 145 L220 145 L220 155 L225 155 Z" fill="#D50000" />
                        <path d="M290 90 Q270 90 250 90 Q210 90 180 100 Q170 105 180 115 Q190 125 210 120 Q250 110 290 110" fill="#8D6E63" />
                        <path d="M175 105 L170 105 L170 115 L175 115 Z" fill="#D50000" />
                        
                        <path d="M270 100 Q250 100 230 110 Q220 115 230 125 Q240 135 260 130" fill="#795548" />
                        
                        <path d="M310 120 L350 120 L350 160 L310 160 Z" fill="#B39DDB" />
                        <path d="M315 125 L345 125 L345 155 L315 155 Z" fill="#9575CD" opacity="0.5" />
                        
                        {/* Sleeve Details */}
                        <path d="M330 125 L330 155" stroke="#D50000" strokeWidth="6" />
                        <path d="M340 125 L340 155" stroke="#D50000" strokeWidth="6" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <h2 className="text-[20px] sm:text-[22px] font-[850] text-black tracking-tight mb-4 text-center">
                      Êtes-vous plutôt introverti ou extraverti ?
                    </h2>

                    {/* Options List */}
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-3">
                      {[
                        "Introverti",
                        "Extraverti",
                        "Un peu des deux",
                        "Je préfère ne pas le dire"
                      ].map((label) => {
                        const isSelected = localPersonality === label || 
                          (localPersonality === "introvert" && label === "Introverti") ||
                          (localPersonality === "extrovert" && label === "Extraverti") ||
                          (localPersonality === "in_between" && label === "Un peu des deux") ||
                          (localPersonality === "not_say" && label === "Je préfère ne pas le dire");
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLocalPersonality(label)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                                : 'bg-[#F5F5F5] border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            <span className={`text-[14px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                              {label}
                            </span>
                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-black text-white' : 'border-[2px] border-neutral-300'
                            }`}>
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Bar: Progress Line & Green Check Validation */}
                  <div className="shrink-0 pt-3 flex items-center justify-between mt-auto">
                    <div className="w-[120px] sm:w-[150px] h-[3.5px] bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full w-4/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveDetailValue('personality', localPersonality)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb34f] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      aria-label="Valider le choix personnalité"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between pt-10 pb-3 px-4 border-b border-gray-100">
                    <button onClick={() => setActiveSubEditor('none')} className="text-gray-500 font-medium text-[13.5px]">Fermer</button>
                    <h3 className="font-bold text-[15px] text-black">
                      {detailFields.find(f => f.key === selectedDetailKey)?.label || 'Choisir'}
                    </h3>
                    <div className="w-10" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-col space-y-2">
                      {DETAIL_OPTIONS[selectedDetailKey]?.map((opt) => {
                        const currentVal = userProfile?.details?.[selectedDetailKey] || '';
                        return (
                          <button
                            key={opt}
                            onClick={() => handleSaveDetailValue(selectedDetailKey, opt)}
                            className={`w-full text-left p-3.5 rounded-xl border text-[14.5px] font-bold flex items-center justify-between transition-all ${
                              currentVal === opt 
                                ? 'border-black bg-black text-white shadow-xs' 
                                : 'border-gray-100 bg-gray-50 text-black hover:border-gray-200'
                            }`}
                          >
                            <span>{opt}</span>
                            {currentVal === opt && <CheckCircle className="w-4.5 h-4.5 text-white fill-black" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Interests Multi-Selector */}
            {activeSubEditor === 'interests' && (
              <div className="absolute inset-0 bg-white z-[150] flex flex-col h-full overflow-hidden">
                {/* Header (Loyal to Screenshot design with back button) */}
                <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-100 shrink-0">
                  <button 
                    onClick={handleSaveInterests} 
                    disabled={savingProfile}
                    className="p-2 -ml-2 text-gray-800 hover:text-black transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                  </button>
                  <h3 className="font-extrabold text-[15px] text-neutral-900 tracking-tight">Centres d'intérêt</h3>
                  <div className="w-10"></div> {/* Spacer to keep title centered */}
                </div>
                
                {/* Main Scrollable Area */}
                <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide bg-white">
                  {/* Categorized List Mode (Exactly Loyal to Screenshot Design) */}
                  <div>
                    {/* Big Heading Section */}
                    <div className="pt-4 px-4 mb-4">
                      <h2 className="text-[20px] font-black text-gray-900 leading-tight tracking-tight mb-1">
                        Ce qui vous rend unique.
                      </h2>
                      <p className="text-[12.5px] text-gray-500 font-medium">
                        {localInterests.length === 8 ? (
                          <span>Vous avez choisi <strong>8</strong> centres d'intérêt. C'est parfait !</span>
                        ) : localInterests.length >= 3 ? (
                          <span>Vous avez choisi <strong>{localInterests.length}</strong> centres d'intérêt. C'est parfait !</span>
                        ) : (
                          <span>Sélectionnez au moins <strong>3</strong> centres d'intérêt pour enrichir votre profil (choisissez-en jusqu'à 8).</span>
                        )}
                      </p>
                    </div>

                    {/* Selected Interests (Loyal to Screenshot Design) */}
                    {localInterests.length > 0 && (
                      <div className="px-4 mb-5">
                        <h3 className="text-[14px] font-black text-gray-900 tracking-tight mb-2">
                          Vos centres d'intérêt
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {localInterests.map((item, i) => (
                            <button 
                              key={i}
                              onClick={() => toggleInterest(item)}
                              className="bg-[#f3e8ff] hover:bg-[#ebd5ff] text-neutral-900 rounded-full px-3 py-1.5 flex items-center space-x-1.5 text-[12px] font-extrabold transition-all duration-200 cursor-pointer select-none"
                            >
                              <span className="text-[14px] shrink-0">{item.icon}</span>
                              <span>{item.label}</span>
                              <div className="w-3.5 h-3.5 rounded-full bg-black flex items-center justify-center shrink-0 ml-0.5">
                                <X className="w-2 h-2 text-white stroke-[4]" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Categories List */}
                    <div className="space-y-4 px-4">
                      {CATEGORIZED_INTERESTS_DB.map((cat, groupIdx) => {
                        const isExpanded = !!expandedCategories[cat.title];
                        const hasManyItems = cat.items.length > 8;
                        const visibleItems = (hasManyItems && !isExpanded) 
                          ? cat.items.slice(0, 8) 
                          : cat.items;

                        return (
                          <div key={groupIdx} className="border-b border-gray-100 pb-4 last:border-b-0">
                            <h4 className="text-[13.5px] font-extrabold text-neutral-900 mb-2">
                              {cat.title}
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {visibleItems.map((item, i) => {
                                const isSelected = localInterests.some(li => li.label === item.label);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => toggleInterest(item)}
                                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all flex items-center space-x-1.5 border cursor-pointer select-none ${
                                      isSelected 
                                        ? 'bg-[#ffe6ec] border-[#e20030] text-[#e20030] shadow-3xs scale-[1.02]' 
                                        : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'
                                    }`}
                                  >
                                    <span className="text-[13.5px] shrink-0">{item.icon}</span>
                                    <span>{item.label}</span>
                                    {isSelected ? (
                                      <Check className="w-3 h-3 text-[#e20030] stroke-[3.5] ml-0.5 shrink-0" />
                                    ) : (
                                      <span className="text-gray-400 font-medium ml-0.5 shrink-0">+</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {hasManyItems && (
                              <button
                                onClick={() => {
                                  setExpandedCategories(prev => ({
                                    ...prev,
                                    [cat.title]: !isExpanded
                                  }));
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[11px] font-bold text-black hover:bg-gray-50 transition-all cursor-pointer mt-2"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3 text-black" strokeWidth={2.5} />
                                    <span>Voir moins</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3 text-black" strokeWidth={2.5} />
                                    <span>Voir plus</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Verification */}
            {activeSubEditor === 'verification' && (
              <div className={`flex flex-col h-full relative overflow-hidden ${verificationStep === 'idle' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                
                {/* White flashing capture flash overlay */}
                <AnimatePresence>
                  {verificationStep === 'capturing' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 bg-white z-[200] pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Top Close Button for Idle State */}
                {verificationStep === 'idle' && (
                  <div className="absolute top-0 inset-x-0 h-[56px] flex items-center justify-between px-4 z-50 bg-white border-b border-gray-100">
                    <button 
                      onClick={handleCloseSubEditor} 
                      className="text-black hover:opacity-70 transition-opacity active:scale-95 p-1 -ml-1"
                    >
                      <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-[17px] font-bold text-black absolute left-1/2 -translate-x-1/2">Safety Centre</h1>
                    <div className="w-6" />
                  </div>
                )}

                {/* --- STATE 1: IDLE / PREPARATION --- */}
                {verificationStep === 'idle' && (
                  <div className="flex-1 overflow-y-auto pt-8 pb-12 z-10 scrollbar-hide bg-white mt-[56px]">
                    <div className="flex flex-col items-center px-5 w-full max-w-md mx-auto">
                      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100">
                        <Shield className="h-12 w-12 text-gray-500" aria-hidden="true" />
                      </div>

                      {/* Heading */}
                      <h3 className="text-[18px] sm:text-[20px] font-bold text-black text-center mt-5 sm:mt-6 tracking-tight leading-tight">
                        Vérification indisponible
                      </h3>

                      {/* Description Paragraph */}
                      <p className="text-[13.5px] sm:text-[15px] text-gray-500 text-center leading-snug mt-2.5 sm:mt-3 px-2">
                        Le service serveur de vérification n’est pas configuré. Aucun selfie ne sera capturé ou transmis.
                      </p>

                      {/* Main Big Pill Button */}
                      <button 
                        disabled
                        className="w-full bg-gray-200 text-gray-600 font-bold py-3.5 sm:py-[18px] rounded-full text-[15px] sm:text-[16px] mt-5 sm:mt-6 mb-6 sm:mb-8 shrink-0 cursor-not-allowed"
                      >
                        Bientôt disponible
                      </button>

                    </div>
                  </div>
                )}

                {/* --- STATE 2: LIVE CAMERA SCREEN (MATCHES SCREENSHOT IMG_4465 EXACTLY) --- */}
                {(verificationStep === 'pose' || verificationStep === 'capturing') && (
                  <div className="absolute inset-0 z-40 bg-black flex flex-col justify-between select-none">
                    
                    {/* Live Camera View / Fallback Preview Canvas */}
                    <div className="absolute inset-0 w-full h-full bg-[#1e232a] overflow-hidden">
                      <video 
                        ref={verificationVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`absolute inset-0 w-full h-full object-cover ${verificationFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                      />
                      {/* Realistic camera ambient noise & lighting backdrop if no physical webcam is mounted in iframe */}
                      {!verificationStream && (
                        <div className="absolute inset-0 bg-gradient-to-b from-[#2b3340] via-[#3d4858] to-[#1c222b] flex items-center justify-center">
                          <div className="w-72 h-96 rounded-[56px] border border-white/15 bg-white/5 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center shadow-inner">
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center mb-4">
                              <UserIcon className="w-12 h-12 text-white/40" />
                            </div>
                            <p className="text-[12px] font-bold text-white/70 max-w-[200px]">
                              Alignez votre visage dans le cadre pour la capture
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* TOP BAR: Flash (Left), Dynamic Island (Center), Camera Flip (Right) */}
                    <div className="relative z-20 pt-10 sm:pt-12 px-6 flex items-center justify-between w-full">
                      {/* Flash Button with "A" or state */}
                      <button
                        onClick={toggleVerificationFlash}
                        className="flex items-center text-white active:scale-90 transition-transform cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] p-2 -ml-2"
                        title="Activer/désactiver le flash"
                      >
                        <Zap className="w-7 h-7 text-white fill-white" />
                        <span className="text-[11px] font-black -ml-0.5 tracking-tighter">
                          {verificationFlash === 'auto' ? 'A' : verificationFlash === 'on' ? 'ON' : ''}
                        </span>
                      </button>

                      {/* iOS Dynamic Island Center Pill with Sensor Indicator Dot */}
                      <div className="w-28 h-7 bg-black rounded-full flex items-center justify-end px-3 shadow-lg border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                      </div>

                      {/* Switch Camera Button */}
                      <button
                        onClick={switchVerificationCamera}
                        className="text-white active:scale-90 transition-transform cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] p-2 -mr-2"
                        title="Changer de caméra"
                      >
                        <RefreshCw className="w-7 h-7 text-white stroke-[2.4]" />
                      </button>
                    </div>

                    {/* MID-BOTTOM TOAST PILL: "Ton visage n'est pas assez clair" */}
                    <div className="relative z-20 flex items-center justify-center w-full px-4 mb-4">
                      <div className="inline-flex items-center space-x-2.5 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 shadow-2xl text-white">
                        <div className="w-4 h-4 rounded-full bg-[#ff2d55] text-white flex items-center justify-center text-[10.5px] font-black shrink-0">
                          !
                        </div>
                        <span className="text-[13.5px] font-medium text-white tracking-tight">
                          {verificationFeedbackText}
                        </span>
                      </div>
                    </div>

                    {/* BOTTOM BAR: Close Button (Left), Big Shutter Button (Center), Reference Pose (Right) */}
                    <div className="relative z-20 px-6 pb-10 sm:pb-12 flex items-center justify-between w-full max-w-md mx-auto">
                      
                      {/* Bottom-Left White Close Button */}
                      <button
                        onClick={() => {
                          stopVerificationCamera();
                          setVerificationStep('idle');
                        }}
                        className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer text-black shrink-0"
                        title="Fermer"
                      >
                        <X className="w-6 h-6 text-black stroke-[2.8]" />
                      </button>

                      {/* Large Center Shutter Button */}
                      <button
                        onClick={captureVerificationPhoto}
                        className="w-20 h-20 rounded-full border-[4px] border-white p-1 flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer bg-transparent shrink-0 mx-2"
                        title="Prendre la photo"
                      >
                        <div className="w-full h-full rounded-full bg-[#111111] hover:bg-black active:bg-white/40 transition-colors border border-white/20" />
                      </button>

                      {/* Bottom-Right Reference Pose Floating Picture */}
                      <div className="w-[74px] h-[102px] sm:w-[82px] sm:h-[114px] rounded-2xl border-[2.5px] border-white overflow-hidden shadow-2xl bg-black shrink-0 relative">
                        <img 
                          src={poseImg} 
                          className="w-full h-full object-cover" 
                          alt="Pose de référence" 
                          referrerPolicy="no-referrer"
                        />
                      </div>

                    </div>
                  </div>
                )}

                {/* --- STATE 3: ANALYZING PHOTO --- */}
                {verificationStep === 'analyzing' && (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 my-auto text-center px-6 z-20">
                    <div className="w-20 h-20 border-4 border-[#007eff] border-t-white rounded-full animate-spin flex items-center justify-center">
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-[18px] font-bold text-white">Vérification indisponible</h4>
                      <p className="text-sm text-gray-400 max-w-xs">
                        Aucun selfie n’est transmis et aucune vérification n’est effectuée.
                      </p>
                    </div>
                  </div>
                )}

                {/* --- STATE 4: VERIFIED SUCCESS --- */}
                {verificationStep === 'success' && (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 my-auto text-center px-6 z-20">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-scale">
                      <CheckCircle className="w-12 h-12 text-white fill-green-500" strokeWidth={3} />
                    </div>
                    <div className="space-y-2 max-w-xs">
                      <h4 className="text-[24px] font-black text-green-400 leading-tight">Statut de vérification indisponible</h4>
                      <p className="text-sm text-gray-300">
                        Ce parcours ne peut pas attribuer de badge. La vérification serveur n’est pas configurée.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        stopVerificationCamera();
                        handleCloseSubEditor();
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold text-base px-8 py-3.5 rounded-full shadow-lg active:scale-95 transition-transform cursor-pointer"
                    >
                      Génial !
                    </button>
                  </div>
                )}

                {/* --- STATE 5: REJECTED --- */}
                {verificationStep === 'rejected' && (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 my-auto text-center px-6 z-20">
                    <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-scale">
                      <X className="w-12 h-12 text-white" strokeWidth={3} />
                    </div>
                    <div className="space-y-2 max-w-xs">
                      <h4 className="text-[24px] font-black text-red-400 leading-tight">Vérification indisponible</h4>
                      <p className="text-sm text-gray-300">
                        {verificationFeedbackText}
                      </p>
                    </div>
                    <button 
                      disabled
                      onClick={startCameraVerification}
                      className="bg-gray-300 text-gray-600 font-bold text-base px-8 py-3.5 rounded-full mt-4 cursor-not-allowed"
                    >
                      Bientôt disponible
                    </button>
                  </div>
                )}

                {/* Hidden canvas for native photo capture extraction */}
                <canvas ref={verificationCanvasRef} className="hidden" />
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLookingForMenu && (
          <LookingForMenu 
            onClose={() => setShowLookingForMenu(false)} 
            selected={['rencontres', 'discuter', 'serieuse'].includes(userProfile?.keyQuestion) ? userProfile.keyQuestion : 'serieuse'}
            onSelect={async (val) => {
              const saved = await saveInlineProfileChanges({ keyQuestion: val }, () => setShowLookingForMenu(false));
              if (!saved) throw new Error('La préférence n’a pas été enregistrée. Réessayez.');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFullPreviewModal && (
          <FullProfilePhotoModal 
            onClose={() => setShowFullPreviewModal(false)}
            userPhotos={userPhotos}
            userProfile={userProfile}
            userMood={userMood}
            onOpenEditProfile={() => {
              setShowFullPreviewModal(false);
            }}
            onOpenAddMedia={() => {
              setShowFullPreviewModal(false);
              setShowAddMediaInEdit(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMediaInEdit && (
          <AddMediaSourceMenu 
            onClose={() => setShowAddMediaInEdit(false)} 
            onSelectGallery={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            onSelectCamera={() => {
              if (isMobileDevice()) {
                cameraInputRef.current?.click();
              } else {
                setShowDesktopCamera(true);
              }
              setShowAddMediaInEdit(false);
            }}
            onSyncFacebook={() => {
              handleFacebookSync();
            }}
            onOpenAdvice={() => {
              setShowPhotoAdviceInEdit(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhotoAdviceInEdit && (
          <PhotoAdviceModal 
            onClose={() => setShowPhotoAdviceInEdit(false)} 
            onAddPhoto={() => {
              setShowPhotoAdviceInEdit(false);
              setShowAddMediaInEdit(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
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

      <AnimatePresence>
        {photoToDeleteSlot !== null && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPhotoToDeleteSlot(null)}
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed bottom-6 left-[5%] right-[5%] md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[360px] bg-white z-[210] rounded-[24px] p-6 text-center shadow-2xl border border-gray-100 flex flex-col items-center text-black"
            >
              {/* Decorative Warning Icon */}
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500 shrink-0">
                <Trash2 className="w-5 h-5 text-[#e20030]" strokeWidth={2.5} />
              </div>

              <h3 className="text-[17px] font-black text-black mb-1.5 leading-tight">
                Supprimer la photo ?
              </h3>
              <p className="text-[13px] text-gray-500 mb-6 leading-relaxed px-2">
                Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setPhotoToDeleteSlot(null)}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full font-bold text-[13px] transition-colors active:scale-95 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePhoto}
                  className="py-3 px-4 bg-[#e20030] hover:bg-red-600 text-white rounded-full font-black text-[13px] transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
