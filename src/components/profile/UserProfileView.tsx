import React, { useEffect, useRef, useState } from 'react';
import { 
  User as UserIcon, MapPin, Briefcase, Camera, Edit2, Check, 
  ArrowLeft, Save, Globe, Eye, Trash2, Plus, Sparkles, Heart, Info, Calendar,
  Shield, Lock, Bell, EyeOff, Power, Settings, RefreshCw, Star, X, Clock, Mail, Zap
} from 'lucide-react';
import { User } from '../../types';
import { aiSystemEngine } from '../../services/aiSystemEngine';
import { monetizationService } from '../../services/monetizationService';
import {
  deleteAccountFromSupabase,
  deleteUploadedProfilePhotoFromSupabase,
  getSupabase,
  updatePassword,
  updateProfilePhotosInSupabase,
  uploadProfilePhotoToSupabase
} from '../../lib/supabase';
import { getProfilePhotoStoragePath } from '../../lib/profilePhotoUrls';
import { authFetch } from '../../lib/authFetch';
import { fetchPrivacySettingsWithEntitlements, updatePrivacySettings } from '../../services/advancedService';
import ProfilePhotoVerification from '../../features/security/ProfilePhotoVerification';

const MAX_PROFILE_PHOTOS = 8;
const MAX_PROFILE_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function isOwnedProfilePhotoReference(photo: string, userId?: string): boolean {
  const path = getProfilePhotoStoragePath(photo);
  return Boolean(userId && path && path.split('/')[0] === userId);
}

async function compressAndResizeImage(file: File, maxWidth = 1200, maxHeight = 1200): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error("Impossible de préparer cette image sur cet appareil.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => {
        if (result) resolve(result);
        else reject(new Error("Impossible de compresser cette image."));
      }, 'image/jpeg', 0.82);
    });
    return new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface UserProfileViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  initialTab?: 'view' | 'edit' | 'settings';
}

const DEFAULT_INTERESTS = [
  'Voyage', 'Cuisine', 'Cinéma', 'Fitness', 'Musique', 'Afrobeats', 
  'Attiéké-Poisson braisé', 'Assinie Beach', 'Lecture', 'Mode', 'Photographie',
  'Sport', 'Entrepreneuriat', 'Technologie', 'Danse'
];

export default function UserProfileView({ user, onUpdateUser, onBack, showToast, initialTab = 'view' }: UserProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'settings'>(initialTab);
  
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Email verification wizard states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'request' | 'verify' | 'success'>('request');
  const [isSendingCode, setIsSendingCode] = useState(false);
  
  // Form states
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [age, setAge] = useState(user.age);
  const [gender, setGender] = useState(user.gender);
  const [seeking, setSeeking] = useState(user.seeking);
  const [city, setCity] = useState(user.city);
  const [country, setCountry] = useState(user.country || 'Côte d\'Ivoire');
  const [bio, setBio] = useState(user.bio || '');
  const [height, setHeight] = useState(user.height || '');
  const [school, setSchool] = useState(user.school || '');
  const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
  const [company, setCompany] = useState(user.company || '');
  const [drinking, setDrinking] = useState(user.drinking || '');
  const [smoking, setSmoking] = useState(user.smoking || '');
  const [kids, setKids] = useState(user.kids || '');
  const [educationLevel, setEducationLevel] = useState(user.educationLevel || '');
  const [personality, setPersonality] = useState(user.personality || '');
  const [pets, setPets] = useState(user.pets || '');
  const [starSign, setStarSign] = useState(user.starSign || '');
  const [religion, setReligion] = useState(user.religion || '');
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [photos, setPhotos] = useState<string[]>(() =>
    (user.photos || []).filter(photo => isOwnedProfilePhotoReference(photo, user.id))
  );
  const [avatarUrl, setAvatarUrl] = useState(() => {
    const storedPhotos = (user.photos || []).filter(photo => isOwnedProfilePhotoReference(photo, user.id));
    return user.avatarUrl && isOwnedProfilePhotoReference(user.avatarUrl, user.id)
      ? user.avatarUrl
      : storedPhotos[0] || '';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const uploadInProgressRef = useRef(false);
  const legacyPhotoCount = (user.photos || []).filter(photo =>
    !isOwnedProfilePhotoReference(photo, user.id)
  ).length;

  const processUploadedFiles = async (filesList: FileList | null) => {
    if (!filesList?.length || uploadInProgressRef.current) return;
    if (!user.id) {
      showToast('Connectez-vous pour ajouter une photo.', 'error');
      return;
    }

    const selectedFiles = Array.from(filesList);
    const invalidFiles = selectedFiles.filter(file =>
      !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_PROFILE_PHOTO_BYTES
    );
    if (invalidFiles.length) {
      showToast('Utilisez des photos JPG, PNG ou WebP de 10 Mio maximum.', 'error');
    }
    const validFiles = selectedFiles.filter(file =>
      ALLOWED_IMAGE_TYPES.has(file.type) && file.size <= MAX_PROFILE_PHOTO_BYTES
    );
    const remainingSlots = Math.max(0, MAX_PROFILE_PHOTOS - photos.length);
    if (validFiles.length > remainingSlots) {
      showToast(`Votre galerie est limitée à ${MAX_PROFILE_PHOTOS} photos.`, 'info');
    }
    const filesToUpload = validFiles.slice(0, remainingSlots);
    if (!filesToUpload.length) return;

    uploadInProgressRef.current = true;
    setIsUploading(true);
    const uploadedPaths: string[] = [];
    try {
      const existingPhotos = [...photos];
      const primaryPath = getProfilePhotoStoragePath(avatarUrl);
      const primaryPhotoIndex = existingPhotos.findIndex(photo =>
        photo === avatarUrl ||
        (primaryPath && getProfilePhotoStoragePath(photo) === primaryPath)
      );
      if (primaryPhotoIndex > 0) {
        existingPhotos.unshift(existingPhotos.splice(primaryPhotoIndex, 1)[0]);
      }

      const uploadedPhotos: string[] = [];
      for (const file of filesToUpload) {
        const compressed = await compressAndResizeImage(file);
        const uploaded = await uploadProfilePhotoToSupabase(
          compressed,
          user.id,
          existingPhotos.length + uploadedPhotos.length
        );
        uploadedPaths.push(uploaded.path);
        uploadedPhotos.push(uploaded.url);
      }

      const updatedPhotos = [...existingPhotos, ...uploadedPhotos];
      await updateProfilePhotosInSupabase(user.id, updatedPhotos);
      setPhotos(updatedPhotos);
      setAvatarUrl(updatedPhotos[0] || '');
      showToast(`Vos photos (${uploadedPhotos.length}) ont été enregistrées.`, 'success');
    } catch (err) {
      console.error(err);
      for (const path of uploadedPaths) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(path);
        } catch (cleanupError) {
          console.error('Échec du nettoyage de la photo non enregistrée :', cleanupError);
        }
      }
      showToast(err instanceof Error ? err.message : "Une erreur est survenue lors de l'importation.", 'error');
    } finally {
      setIsUploading(false);
      uploadInProgressRef.current = false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processUploadedFiles(e.target.files);
  };

  const handleSetPrimaryPhoto = async (photo: string) => {
    if (uploadInProgressRef.current) return;
    if (!user.id) {
      showToast('Connectez-vous pour modifier vos photos.', 'error');
      return;
    }
    const updatedPhotos = [photo, ...photos.filter(existingPhoto => existingPhoto !== photo)];
    try {
      await updateProfilePhotosInSupabase(user.id, updatedPhotos);
      setPhotos(updatedPhotos);
      setAvatarUrl(photo);
      showToast('Photo principale mise à jour.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de modifier la photo principale.', 'error');
    }
  };

  const handleDeletePhoto = async (photo: string, index: number) => {
    if (uploadInProgressRef.current) return;
    if (!user.id) {
      showToast('Connectez-vous pour modifier vos photos.', 'error');
      return;
    }
    const updatedPhotos = photos.filter((_, photoIndex) => photoIndex !== index);
    const removedPath = getProfilePhotoStoragePath(photo);
    const nextAvatarUrl = updatedPhotos[0] || '';

    try {
      await updateProfilePhotosInSupabase(user.id, updatedPhotos);
      setPhotos(updatedPhotos);
      setAvatarUrl(nextAvatarUrl);
      if (removedPath && !updatedPhotos.some(item => getProfilePhotoStoragePath(item) === removedPath)) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(removedPath);
        } catch (cleanupError) {
          console.error('Échec du nettoyage de la photo supprimée :', cleanupError);
          showToast('Photo retirée du profil, mais le nettoyage du stockage a échoué.', 'error');
          return;
        }
      }
      showToast('Photo supprimée de votre galerie.', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de supprimer cette photo.', 'error');
    }
  };
  
  const [newInterest, setNewInterest] = useState('');

  // Security & Account Settings states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Privacy options
  const [incognito, setIncognito] = useState(false);
  const [incognitoAvailable, setIncognitoAvailable] = useState(false);
  const [hideDistance, setHideDistance] = useState(false);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyLoadError, setPrivacyLoadError] = useState('');

  // Notification options
  const [notifMatches, setNotifMatches] = useState(() => {
    return localStorage.getItem('bavel_setting_notif_matches') !== 'false';
  });
  const [notifMessages, setNotifMessages] = useState(() => {
    return localStorage.getItem('bavel_setting_notif_messages') !== 'false';
  });
  const [notifVisits, setNotifVisits] = useState(() => {
    return localStorage.getItem('bavel_setting_notif_visits') === 'true';
  });

  useEffect(() => {
    let active = true;
    fetchPrivacySettingsWithEntitlements()
      .then(({ settings, incognitoAvailable: canUseIncognito }) => {
        if (!active) return;
        setIncognito(Boolean(settings?.incognito_mode));
        setHideDistance(settings?.show_distance === false);
        setIncognitoAvailable(canUseIncognito);
        setPrivacyLoaded(true);
        setPrivacyLoadError('');
      })
      .catch((error) => {
        if (active) setPrivacyLoadError(error instanceof Error ? error.message : 'Réglages de confidentialité indisponibles.');
      })
      .finally(() => {
        if (active) setPrivacyLoading(false);
      });
    return () => { active = false; };
  }, []);

  // Modals / states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Email verification handlers
  const handleSendEmailCode = async () => {
    if (!email) {
      showToast("Veuillez renseigner votre adresse email dans l'onglet Édition d'abord.", "error");
      return;
    }
    setIsSendingCode(true);
    const { error } = await getSupabase().auth.updateUser({ email });
    setIsSendingCode(false);
    if (error) {
      showToast(error.message || "Impossible d'envoyer l'email de confirmation.", "error");
      return;
    }
    setEmailStep('verify');
    showToast("Un lien de confirmation a été envoyé à votre adresse.", "success");
  };

  const handleVerifyEmailCode = async () => {
    const { data } = await getSupabase().auth.getUser();
    if (!data.user?.email_confirmed_at) {
      showToast("Ouvrez le lien reçu par email puis réessayez.", "error");
      return;
    }
    setEmailStep('success');
    onUpdateUser({ ...user, emailVerified: true });
    showToast("Votre adresse email a été confirmée avec succès ! 🎉", "success");
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('Veuillez saisir votre mot de passe actuel', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Le nouveau mot de passe doit comporter au moins 6 caractères', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Les deux nouveaux mots de passe ne correspondent pas', 'error');
      return;
    }

    updatePassword(newPassword).then(({ error }) => {
      if (error) {
        showToast(error.message || 'Impossible de modifier le mot de passe.', 'error');
        return;
      }
      showToast('Votre mot de passe a été modifié avec succès ! 🔒', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    });
  };

  const handleSaveAllSettings = async () => {
    if (privacySaving || !privacyLoaded) return;
    setPrivacySaving(true);
    try {
      await updatePrivacySettings({
        incognito_mode: incognito,
        show_distance: !hideDistance
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de sauvegarder la confidentialité.', 'error');
      setPrivacySaving(false);
      return;
    }

    try {
      localStorage.setItem('bavel_setting_notif_matches', String(notifMatches));
      localStorage.setItem('bavel_setting_notif_messages', String(notifMessages));
      localStorage.setItem('bavel_setting_notif_visits', String(notifVisits));
    } catch (error) {
      console.error('Notification preferences could not be saved locally:', error);
      setPrivacySaving(false);
      showToast('Confidentialité enregistrée, mais les préférences locales de notification n’ont pas pu être sauvegardées.', 'error');
      return;
    }
    setPrivacySaving(false);
    showToast('Confidentialité enregistrée. Préférences de notification enregistrées sur cet appareil.', 'success');
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    if (deleteConfirmInput.toLowerCase() !== 'supprimer') {
      showToast('Veuillez écrire "supprimer" pour valider', 'error');
      return;
    }
    setIsDeletingAccount(true);
    showToast('Suppression du compte en cours... Vous allez être déconnecté.', 'info');
    try {
      const result = await deleteAccountFromSupabase(user.id);
      if (!result.success) throw new Error(result.error || 'Suppression du compte impossible.');
      showToast('Votre compte a été supprimé.', 'success');
      window.setTimeout(() => window.location.assign('/'), 1200);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Suppression du compte impossible.', 'error');
      setIsDeletingAccount(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadInProgressRef.current) {
      showToast('Attendez la fin de l’envoi des photos avant d’enregistrer.', 'info');
      return;
    }
    if (!name.trim()) {
      showToast('Le nom ne peut pas être vide', 'error');
      return;
    }
    if (age < 18 || age > 99) {
      showToast('L\'âge doit être compris entre 18 et 99 ans', 'error');
      return;
    }

    // AI Profile Scanner (Auto-Censorship of vulgarity / direct phone numbers)
    const scanResult = aiSystemEngine.scanAndCensorProfileBio(bio);
    let finalBio = bio;
    if (scanResult.wasCensored) {
      finalBio = scanResult.censoredBio;
      setBio(scanResult.censoredBio);
      showToast(`🛡️ Modération : ${scanResult.reason}`, 'info');
    }

    const updatedUser: User = {
      ...user,
      name,
      email,
      age,
      gender,
      seeking,
      city,
      country,
      bio: finalBio,
      avatarUrl,
      photos,
      height,
      school,
      jobTitle,
      company,
      drinking,
      smoking,
      kids,
      educationLevel,
      personality,
      pets,
      starSign,
      religion,
      interests
    };

    onUpdateUser(updatedUser);
    showToast('Votre profil a été mis à jour avec succès ! ✨', 'success');
    setActiveTab('view');
  };

  const handleAddInterest = () => {
    if (interests.length >= 8) {
      showToast('Vous ne pouvez ajouter que 8 centres d\'intérêt maximum.', 'info');
      return;
    }
    const trimmed = newInterest.trim();
    if (!trimmed) return;
    if (interests.includes(trimmed)) {
      showToast('Cet intérêt existe déjà', 'info');
      return;
    }
    const updated = [...interests, trimmed];
    setInterests(updated);
    setNewInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    const updated = interests.filter(i => i !== interest);
    setInterests(updated);
  };

  const handleAddPresetInterest = (interest: string) => {
    if (interests.length >= 8) {
      showToast('Vous ne pouvez ajouter que 8 centres d\'intérêt maximum.', 'info');
      return;
    }
    if (interests.includes(interest)) return;
    const updated = [...interests, interest];
    setInterests(updated);
  };

  if (showVerificationModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-md">
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl shadow-2xl">
          <ProfilePhotoVerification
            onClose={() => setShowVerificationModal(false)}
            onVerified={() => onUpdateUser({ ...user, is_verified: true, verified: true })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8" id="user-profile-view-container">
      {/* Header section with back button and high-end Tab selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-100">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-500 hover:text-[#9c1f35] font-bold transition text-sm cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Retour à la découverte
        </button>
        
        {/* Modern Tab Bar */}
        <div className="bg-gray-100/85 p-1 rounded-2xl flex border border-gray-200/50 self-start md:self-auto">
          <button 
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center space-x-1.5 cursor-pointer ${activeTab === 'view' ? 'bg-[#9c1f35] text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Aperçu Public</span>
          </button>
          <button 
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center space-x-1.5 cursor-pointer ${activeTab === 'edit' ? 'bg-[#9c1f35] text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Modifier Infos</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center space-x-1.5 cursor-pointer ${activeTab === 'settings' ? 'bg-[#9c1f35] text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Sécurité</span>
          </button>
        </div>
      </div>

      {activeTab === 'view' && (
        /* ================= Public Preview View ================= */
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300" id="user-profile-preview-card">
          <div className="relative h-48 md:h-64 bg-gradient-to-r from-[#9c1f35] to-[#cd6d7d] overflow-hidden">
            {/* Elegant mesh visual shapes */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-10 left-10 w-28 h-28 rounded-full bg-white blur-xl"></div>
              <div className="absolute bottom-4 right-16 w-36 h-36 rounded-full bg-pink-300 blur-2xl"></div>
            </div>
            
            {/* Gold Premium Status Badge */}
            <div className="absolute top-6 right-6 bg-amber-500/90 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full flex items-center shadow-lg border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-white text-white" /> 
              <span>Membre VIP Or</span>
            </div>
          </div>

          <div className="px-6 md:px-10 pb-10 relative">
            {/* Overlapping Avatar Container */}
            <div className="absolute -top-16 left-6 md:left-10">
              <div className="w-32 h-32 rounded-3xl border-4 border-white overflow-hidden shadow-xl bg-gray-50 flex items-center justify-center relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-400" />
                )}
              </div>
              {user.verificationStatus === 'verified' && (
                <div className="absolute -bottom-2 right-1.5 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-md" title="Compte Vérifié Or">
                  <Check className="w-4 h-4 text-white stroke-[4]" />
                </div>
              )}
              {user.verificationStatus === 'pending' && (
                <div className="absolute -bottom-2 right-1.5 w-7 h-7 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white shadow-md" title="Vérification en cours">
                  <Clock className="w-4 h-4 text-white" />
                </div>
              )}
              {(!user.verificationStatus || user.verificationStatus === 'unverified') && (
                <button 
                  type="button"
                  onClick={() => setShowVerificationModal(true)}
                  className="absolute -bottom-2 right-1.5 w-7 h-7 rounded-full bg-[#9c1f35] hover:bg-[#83192c] border-2 border-white flex items-center justify-center text-white shadow-md transition-colors cursor-pointer animate-pulse" 
                  title="Vérifier votre profil par selfie"
                >
                  <Plus className="w-4 h-4 text-white stroke-[3]" />
                </button>
              )}
            </div>

            {/* Public details columns */}
            <div className="pt-20 md:flex md:items-start md:justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center flex-wrap gap-2.5">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{name}</h1>
                  <span className="text-2xl text-gray-400 font-medium">{age} ans</span>
                  <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>En Ligne</span>
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm font-semibold flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5 text-rose-500" />
                  {city}, {country}
                </p>

                <span className="inline-block bg-[#cd6d7d]/10 text-[#9c1f35] font-bold text-xs px-3.5 py-1.5 rounded-full border border-[#cd6d7d]/20 mt-3">
                  Recherche idéale : {seeking === 'female' ? 'Femme' : seeking === 'male' ? 'Homme' : 'Femme ou Homme'}
                </span>
              </div>

              <div className="mt-4 md:mt-0 flex space-x-3">
                {user.trustScore && (
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center space-x-3.5 text-xs text-emerald-800">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm">
                      <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-emerald-600/80 block font-medium">Taux de Sincérité</span>
                      <span className="font-bold text-emerald-700">{user.trustScore}%</span>
                    </div>
                  </div>
                )}
                <div className="bg-neutral-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-3.5 text-xs text-neutral-500">
                  <div className="bg-white p-2.5 rounded-xl shadow-sm">
                    <Calendar className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <span className="text-neutral-400 block font-medium">Inscription</span>
                    <span className="font-bold text-neutral-800">Membre depuis Juillet 2026</span>
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-8 border-gray-100" />

            {/* Profile bento grid layout details */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
              <div className="space-y-6">
                {/* Photos Gallery */}
                {photos && photos.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h3 className="text-gray-900 text-lg font-black flex items-center">
                      <Camera className="w-5 h-5 mr-2 text-[#9c1f35]" /> Mes Photos
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition">
                          <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lifestyle Tags */}
                {user.lifestyleTags && user.lifestyleTags.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-gray-900 text-lg font-black flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-500 fill-current" /> Abidjan Vibes 🇨🇮
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {user.lifestyleTags.map((tag, tagIdx) => (
                        <span 
                          key={`${tag}-${tagIdx}`} 
                          className="bg-orange-50 text-orange-700 text-xs font-bold px-3.5 py-1.5 rounded-full border border-orange-100 flex items-center shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-orange-400" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Public Description */}
                <div className="space-y-3">
                  <h3 className="text-gray-900 text-lg font-black flex items-center">
                    <Star className="w-5 h-5 mr-2 text-[#9c1f35] fill-current" /> Ma Description
                  </h3>
                  <div className="bg-neutral-50 p-5 rounded-2xl border border-gray-100 leading-relaxed text-sm text-neutral-700 italic relative">
                    <span className="absolute -top-3 left-4 text-3xl text-[#cd6d7d] font-serif">“</span>
                    {bio ? (
                      <p className="pl-2">"{bio}"</p>
                    ) : (
                      <p className="text-neutral-400 pl-2">
                        Aucune description rédigée. Prenez 2 minutes pour vous présenter et doubler vos chances de match en écrivant ce que vous aimez !
                      </p>
                    )}
                  </div>
                </div>

                {/* Tagged Interests */}
                <div className="space-y-3">
                  <h3 className="text-gray-900 text-lg font-black flex items-center">
                    <Heart className="w-5 h-5 mr-2 text-[#9c1f35]" /> Mes Centres d'Intérêts
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {interests.map((interest: any, idx: number) => {
                      const isObj = typeof interest === 'object' && interest !== null;
                      const label = isObj ? (interest.label || interest.name || '') : String(interest);
                      const icon = isObj ? interest.icon : null;
                      return (
                        <span 
                          key={`${label}-${idx}`} 
                          className="bg-purple-50 text-purple-700 text-xs font-bold px-3.5 py-1.5 rounded-full border border-purple-100 flex items-center"
                        >
                          {icon ? <span className="mr-1.5">{icon}</span> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />}
                          <span>{label}</span>
                        </span>
                      );
                    })}
                    {interests.length === 0 && (
                      <p className="text-gray-400 text-xs italic">Aucun intérêt spécifié.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Side Stats */}
              <div className="bg-neutral-50/50 rounded-2xl border border-gray-100 p-5 space-y-4">
                <h4 className="text-xs font-black text-[#9c1f35] uppercase tracking-widest">Informations Vérifiées</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                    <span className="text-neutral-400">Situation</span>
                    <span className="font-bold text-neutral-800">Célibataire</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                    <span className="text-neutral-400">Origine</span>
                    <span className="font-bold text-neutral-800">Côte d'Ivoire</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                    <span className="text-neutral-400">Profil vérifié</span>
                    {user.verificationStatus === 'verified' ? (
                      <span className="font-bold text-emerald-600 flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Oui (Certifié Or)
                      </span>
                    ) : user.verificationStatus === 'pending' ? (
                      <span className="font-bold text-amber-500 flex items-center" title="En cours de vérification par nos agents">
                        <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" /> En attente
                      </span>
                    ) : (
                      <span className="font-bold text-gray-400 flex items-center">
                        Non vérifié
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                    <span className="text-neutral-400">Email vérifié</span>
                    {user.emailVerified ? (
                      <span className="font-bold text-emerald-600 flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Oui (Confirmé)
                      </span>
                    ) : (
                      <span className="font-bold text-rose-500 flex items-center">
                        Non vérifié
                      </span>
                    )}
                  </div>
                  {user.height && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Taille</span>
                      <span className="font-bold text-neutral-800">{user.height}</span>
                    </div>
                  )}
                  {user.school && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Études</span>
                      <span className="font-bold text-neutral-800">{user.school}</span>
                    </div>
                  )}
                  {user.jobTitle && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Poste</span>
                      <span className="font-bold text-neutral-800">{user.jobTitle}</span>
                    </div>
                  )}
                  {user.company && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Entreprise</span>
                      <span className="font-bold text-neutral-800">{user.company}</span>
                    </div>
                  )}
                  {user.drinking && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Alcool</span>
                      <span className="font-bold text-neutral-800">{user.drinking}</span>
                    </div>
                  )}
                  {user.smoking && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Fumeur</span>
                      <span className="font-bold text-neutral-800">{user.smoking}</span>
                    </div>
                  )}
                  {user.kids && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Enfants</span>
                      <span className="font-bold text-neutral-800">{user.kids}</span>
                    </div>
                  )}
                  {user.educationLevel && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Études</span>
                      <span className="font-bold text-neutral-800">{user.educationLevel}</span>
                    </div>
                  )}
                  {user.personality && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Personnalité</span>
                      <span className="font-bold text-neutral-800">{user.personality}</span>
                    </div>
                  )}
                  {user.pets && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Animaux</span>
                      <span className="font-bold text-neutral-800">{user.pets}</span>
                    </div>
                  )}
                  {user.starSign && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Signe astrologique</span>
                      <span className="font-bold text-neutral-800">{user.starSign}</span>
                    </div>
                  )}
                  {user.religion && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <span className="text-neutral-400">Religion</span>
                      <span className="font-bold text-neutral-800">{user.religion}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-3">
                  {(!user.verificationStatus || user.verificationStatus === 'unverified') && (
                    <button
                      type="button"
                      onClick={() => setShowVerificationModal(true)}
                      className="w-full bg-gradient-to-r from-[#9c1f35] to-[#cd6d7d] hover:from-[#83192c] hover:to-[#b34c5c] text-white text-xs font-extrabold uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-pink-100 fill-pink-100/20" />
                      <span>Vérifier mon profil par selfie</span>
                    </button>
                  )}

                  {!user.emailVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailStep('request');
                        setEmailCode('');
                        setShowEmailModal(true);
                      }}
                      className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-extrabold uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-neutral-600" />
                      <span>Confirmer mon Email</span>
                    </button>
                  )}
                </div>
                
                {user.verificationStatus === 'pending' && (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/60 text-[11px] text-amber-800 leading-normal mt-2">
                    <Clock className="w-4 h-4 text-amber-600 inline mr-1 -mt-0.5" />
                    <span>Votre selfie de certification est en cours de validation par notre équipe d'Abidjan.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'edit' && (
        /* ================= Modifier mes Infos Form ================= */
        <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 space-y-8 animate-in fade-in duration-300" id="user-profile-edit-form">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Modifier mes Informations</h2>
            <p className="text-xs text-neutral-400 mt-1">Gérez vos coordonnées, choisissez votre photo et modifiez vos préférences d'affichage public.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
            {/* Avatar picker container */}
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Photo de Profil</label>
              
              <div className="flex flex-col items-center p-5 bg-neutral-50 rounded-2xl border border-gray-100 space-y-4 text-center">
                <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-gray-200 shadow-md relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Aperçu" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <UserIcon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-800">Mon Avatar</h4>
                  <p className="text-[10px] text-neutral-400">Ajoutez une photo personnelle depuis votre appareil.</p>
                </div>
              </div>

              {/* Drag & Drop and File Picker Uploader */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block">Ajouter des photos à ma galerie</label>
                
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    processUploadedFiles(e.dataTransfer.files);
                  }}
                  onClick={() => !isUploading && document.getElementById('photo-file-upload')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-300 flex flex-col items-center justify-center space-y-2 ${
                    dragOver 
                      ? 'border-[#9c1f35] bg-[#9c1f35]/5 scale-[1.01]' 
                      : 'border-gray-200 bg-neutral-50 hover:bg-neutral-100/50 hover:border-gray-300'
                  } ${isUploading ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                >
                  <input 
                    type="file" 
                    id="photo-file-upload" 
                    multiple 
                    accept="image/jpeg,image/png,image/webp" 
                    className="hidden" 
                    disabled={isUploading}
                    onChange={handleFileChange} 
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center space-y-2 py-2">
                      <RefreshCw className="w-8 h-8 text-[#9c1f35] animate-spin" />
                      <span className="text-xs font-bold text-[#9c1f35]">Optimisation et compression des images...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-[#fce8eb] rounded-full flex items-center justify-center text-[#9c1f35]">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-800">Glissez-déposez des images ici</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">ou cliquez pour parcourir vos fichiers locaux</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Photos Gallery */}
              <div className="space-y-2.5 pt-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Ma Galerie ({photos.length} photo{photos.length > 1 ? 's' : ''}) :</span>
                  {photos.length > 0 && <span className="text-[10px] text-amber-600 font-bold">★ Choisir la photo principale</span>}
                </p>
                {legacyPhotoCount > 0 && (
                  <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                    {legacyPhotoCount} ancienne{legacyPhotoCount > 1 ? 's' : ''} photo{legacyPhotoCount > 1 ? 's' : ''} ne peut{legacyPhotoCount > 1 ? 'vent' : ''} pas être utilisée dans le stockage privé. Importez-la à nouveau depuis votre appareil.
                  </p>
                )}
                
                {photos.length === 0 ? (
                  <div className="bg-neutral-50 rounded-2xl p-5 text-center border border-gray-150">
                    <p className="text-xs text-neutral-500 italic">Aucune photo dans votre galerie pour le moment.</p>
                    <p className="text-[10px] text-neutral-400 mt-1">Ajoutez des photos de vous pour attirer l'attention des autres célibataires !</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {photos.map((photo, index) => {
                        const isMain = avatarUrl === photo;
                        return (
                          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-neutral-100">
                            {/* Gallery Thumbnail Image */}
                            <img 
                              src={photo} 
                              alt={`Photo de galerie ${index + 1}`} 
                              className={`w-full h-full object-cover cursor-pointer transition duration-200 ${isMain ? 'ring-4 ring-[#9c1f35] scale-95' : 'hover:opacity-90'}`}
                              onClick={() => void handleSetPrimaryPhoto(photo)}
                              title="Définir comme photo principale"
                            />
                            
                            {/* Main Avatar Badge Indicator - ALWAYS VISIBLE */}
                            {isMain && (
                              <div className="absolute bottom-1 left-1 right-1 bg-[#9c1f35] text-white text-[8px] font-black uppercase text-center py-0.5 px-1 rounded-md shadow-md flex items-center justify-center space-x-1">
                                <Star className="w-2.5 h-2.5 fill-white text-white" />
                                <span>Principal</span>
                              </div>
                            )}

                            {/* Hover prompt to set main - hidden on mobile / click handles it */}
                            {!isMain && (
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                                <span className="text-white text-[9px] font-bold bg-[#9c1f35] px-1.5 py-0.5 rounded-full">Choisir</span>
                              </div>
                            )}
                            
                            {/* ALWAYS VISIBLE Delete Button (Optimized for Touch/Mobile) */}
                            <button
                              type="button"
                              onClick={() => void handleDeletePhoto(photo, index)}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md z-20 transition active:scale-90 cursor-pointer"
                              title="Supprimer la photo"
                            >
                              <X className="w-3 h-3 stroke-[3]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-500 leading-normal bg-[#9c1f35]/5 p-2 rounded-xl border border-[#9c1f35]/10">
                      💡 <strong>Astuce :</strong> Touchez une photo pour en faire votre photo de profil principale. Les autres utilisateurs verront cette galerie complète sur votre profil !
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* General Form Fields */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Prénom / Pseudo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre prénom"
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                </div>

                {/* Email address (read-only for system demo) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Adresse Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full bg-neutral-100 border border-gray-150 rounded-xl px-4 py-3 text-sm text-neutral-400 outline-none cursor-not-allowed"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400 bg-neutral-200 px-2 py-0.5 rounded">SÉCURISÉ</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Age slider/input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Âge</label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    required
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                </div>

                {/* City dropdown selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Ville d'habitation</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  >
                    <option value="Abidjan">Abidjan</option>
                    <option value="Yamoussoukro">Yamoussoukro</option>
                    <option value="Bouaké">Bouaké</option>
                    <option value="San Pedro">San Pedro</option>
                    <option value="Assinie">Assinie</option>
                    <option value="Grand-Bassam">Grand-Bassam</option>
                  </select>
                </div>
              </div>

              {/* Gender and Seeker selections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Votre genre</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${gender === 'male' ? 'bg-[#9c1f35] text-white border-[#9c1f35] shadow-md' : 'bg-neutral-50 border-gray-200 text-neutral-500 hover:bg-gray-100/50'}`}
                    >
                      Homme
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${gender === 'female' ? 'bg-[#9c1f35] text-white border-[#9c1f35] shadow-md' : 'bg-neutral-50 border-gray-200 text-neutral-500 hover:bg-gray-100/50'}`}
                    >
                      Femme
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Préfère rencontrer</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSeeking('male')}
                      className={`py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${seeking === 'male' ? 'bg-[#9c1f35] text-white border-[#9c1f35] shadow-md' : 'bg-neutral-50 border-gray-200 text-neutral-500 hover:bg-gray-100/50'}`}
                    >
                      Des Hommes
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeeking('female')}
                      className={`py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${seeking === 'female' ? 'bg-[#9c1f35] text-white border-[#9c1f35] shadow-md' : 'bg-neutral-50 border-gray-200 text-neutral-500 hover:bg-gray-100/50'}`}
                    >
                      Des Femmes
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeeking('both')}
                      className={`py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${seeking === 'both' ? 'bg-[#9c1f35] text-white border-[#9c1f35] shadow-md' : 'bg-neutral-50 border-gray-200 text-neutral-500 hover:bg-gray-100/50'}`}
                    >
                      Les Deux
                    </button>
                  </div>
                </div>
              </div>

              {/* Height Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Taille (Hauteur)</label>
                <input
                  type="text"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ex: 175 cm ou Je préfère ne pas le dire"
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                />
              </div>

              {/* School Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">École ou université</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Ex: Université de Cocody"
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                />
              </div>

              {/* Work / Emploi */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Intitulé du poste</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex: Ingénieur logiciel"
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ex: Tech Corp"
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                </div>
              </div>

              {/* Drinking / Alcool */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Alcool</label>
                <select
                  value={drinking}
                  onChange={(e) => setDrinking(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="À l'occasion">À l'occasion</option>
                  <option value="Jamais">Jamais</option>
                  <option value="Souvent">Souvent</option>
                  <option value="Non, je suis sobre">Non, je suis sobre</option>
                  <option value="Je préfère ne pas le dire">Je préfère ne pas le dire</option>
                </select>
              </div>

              {/* Smoking / Fumer */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Fumeur</label>
                <select
                  value={smoking}
                  onChange={(e) => setSmoking(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                  <option value="Parfois">Parfois</option>
                  <option value="Je préfère ne pas le dire">Je préfère ne pas le dire</option>
                </select>
              </div>

              {/* Kids / Enfants */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Enfants</label>
                <select
                  value={kids}
                  onChange={(e) => setKids(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="J'en voudrais un jour">J'en voudrais un jour</option>
                  <option value="J'en voudrais bientôt">J'en voudrais bientôt</option>
                  <option value="Je ne veux pas d'enfants">Je ne veux pas d'enfants</option>
                  <option value="J'ai déjà des enfants">J'ai déjà des enfants</option>
                  <option value="Je préfère ne pas le dire">Je préfère ne pas le dire</option>
                </select>
              </div>

              {/* Education Level / Études */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Niveau d'études</label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="Lycée">Lycée</option>
                  <option value="Diplôme universitaire">Diplôme universitaire</option>
                  <option value="En études supérieures">En études supérieures</option>
                  <option value="À l'université">À l'université</option>
                  <option value="Licence/Bachelor">Licence/Bachelor</option>
                  <option value="Je préfère ne pas le dire">Je préfère ne pas le dire</option>
                </select>
              </div>

              {/* Personality / Personnalité */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Personnalité</label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="Introverti">Introverti</option>
                  <option value="Extraverti">Extraverti</option>
                  <option value="Entre les deux">Entre les deux</option>
                  <option value="Je préfère ne pas le dire">Je préfère ne pas le dire</option>
                </select>
              </div>

              {/* Pets / Animaux */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Animaux</label>
                <select
                  value={pets}
                  onChange={(e) => setPets(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="Chat(s)">Chat(s)</option>
                  <option value="Chien(s)">Chien(s)</option>
                  <option value="Chats et chiens">Chats et chiens</option>
                  <option value="Autres">Autres</option>
                  <option value="Pas d'animaux">Pas d'animaux</option>
                  <option value="Je préfère ne pas le dire">Je préfère ne pas le dire</option>
                </select>
              </div>

              {/* Star Sign / Signe astrologique */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Signe astrologique</label>
                <select
                  value={starSign}
                  onChange={(e) => setStarSign(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="Aries">Aries</option>
                  <option value="Taurus">Taurus</option>
                  <option value="Gémeaux">Gémeaux</option>
                  <option value="Cancer">Cancer</option>
                  <option value="Leo">Leo</option>
                  <option value="Virgo">Virgo</option>
                  <option value="Libra">Libra</option>
                  <option value="Scorpio">Scorpio</option>
                  <option value="Sagittarius">Sagittarius</option>
                  <option value="Capricorn">Capricorn</option>
                  <option value="Aquarius">Aquarius</option>
                  <option value="Pisces">Pisces</option>
                  <option value="I'd rather not say">I'd rather not say</option>
                </select>
              </div>

              {/* Religion */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Religion</label>
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-800 outline-none focus:border-[#cd6d7d] transition-all appearance-none"
                >
                  <option value="">Sélectionner</option>
                  <option value="Agnostic">Agnostic</option>
                  <option value="Atheist">Atheist</option>
                  <option value="Buddhist">Buddhist</option>
                  <option value="Catholic">Catholic</option>
                  <option value="Christian">Christian</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Jain">Jain</option>
                  <option value="Jewish">Jewish</option>
                  <option value="Mormon">Mormon</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Zoroastrian">Zoroastrian</option>
                  <option value="Sikh">Sikh</option>
                  <option value="Spiritual">Spiritual</option>
                  <option value="Other">Other</option>
                  <option value="I'd rather not say">I'd rather not say</option>
                </select>
              </div>

              {/* Bio area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Biographie / Présentation</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Rédigez une présentation soignée. Qui êtes-vous ? Quels sont vos rêves, vos valeurs, et que recherchez-vous chez l'autre ?"
                  className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl p-4 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all resize-none"
                />
              </div>

              <hr className="border-gray-100" />

              {/* Interactive Interests Manager */}
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Gérer mes Intérêts & Loisirs ({interests.length}/8)</label>
                
                {/* Active capsules */}
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest: any, idx: number) => {
                    const isObj = typeof interest === 'object' && interest !== null;
                    const label = isObj ? (interest.label || interest.name || '') : String(interest);
                    const icon = isObj ? interest.icon : null;
                    return (
                      <span 
                        key={label || idx} 
                        className="bg-[#cd6d7d]/10 text-[#9c1f35] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#cd6d7d]/20 flex items-center hover:bg-[#cd6d7d]/15 transition"
                      >
                        {icon && <span className="mr-1">{icon}</span>}
                        <span>{label}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveInterest(interest)}
                          className="ml-2 hover:text-[#8f1e31] font-black text-xs leading-none bg-white rounded-full w-4 h-4 flex items-center justify-center border border-[#cd6d7d]/30"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                  {interests.length === 0 && (
                    <p className="text-gray-400 text-xs italic">Aucun intérêt spécifié. Ajoutez-en ci-dessous !</p>
                  )}
                </div>

                {/* Add Custom Input */}
                <div className="flex gap-2.5 max-w-md">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                    placeholder="Ajouter un loisir, plage, attieke..."
                    className="flex-1 bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    className="bg-[#cd6d7d] hover:bg-[#b55868] text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </button>
                </div>

                {/* Quick select presets */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Recommandés :</p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_INTERESTS.filter(i => !interests.some((existing: any) => (typeof existing === 'object' && existing !== null ? (existing.label || existing.name) : existing) === i)).slice(0, 10).map((interest) => (
                      <button
                        type="button"
                        key={interest}
                        onClick={() => handleAddPresetInterest(interest)}
                        className="bg-neutral-50 hover:bg-neutral-100 text-neutral-600 text-xs font-medium px-3 py-1.5 rounded-xl border border-gray-200 transition cursor-pointer"
                      >
                        + {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Actions Footer */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#9c1f35] hover:bg-[#83192c] text-white px-7 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition flex items-center shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-2" /> Enregistrer les modifications
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-300" id="user-profile-settings-container">
          {/* Main Security Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 space-y-8">
            <div className="border-b border-gray-100 pb-5">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
                <Settings className="w-6 h-6 mr-2 text-[#9c1f35]" /> Sécurité & Préférences
              </h2>
              <p className="text-xs text-neutral-400 mt-1">Ajustez vos options de connexion, chiffrement, notifications et visibilité publique.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Password update Form */}
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                <h3 className="text-base font-black text-[#9c1f35] flex items-center border-b border-gray-100 pb-2.5 uppercase tracking-wide">
                  <Lock className="w-4.5 h-4.5 mr-2" /> Changer mon mot de passe
                </h3>
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Mot de passe actuel</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-saisir le mot de passe"
                    className="w-full bg-neutral-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#cd6d7d] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center shadow-md cursor-pointer uppercase tracking-wider"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Modifier le mot de passe
                </button>
              </form>

              {/* Privacy Preferences Panel */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-[#9c1f35] flex items-center border-b border-gray-100 pb-2.5 uppercase tracking-wide mb-4">
                    <Shield className="w-4.5 h-4.5 mr-2" /> Confidentialité de Profil
                  </h3>

                  <div className="space-y-5">
                    {/* Incognito */}
                    <div className="flex items-start justify-between bg-neutral-50 p-4.5 rounded-2xl border border-gray-100/60">
                      <div className="flex-1 pr-4">
                        <label className="block text-xs font-black text-neutral-800 flex items-center uppercase tracking-wide">
                          Mode Incognito (Discrétion)
                          <span className="ml-2 bg-purple-500/10 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded-md">PREMIUM</span>
                        </label>
                        <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Visitez les profils en toute discrétion sans qu'ils ne reçoivent d'alertes.</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={incognito}
                          disabled={(!incognitoAvailable && !incognito) || privacyLoading || privacySaving}
                          onChange={(e) => {
                            if (e.target.checked && !incognitoAvailable) {
                              showToast("🔒 Le mode incognito en toute discrétion est réservé à Bavel Premium (non inclus dans Extra).", "info");
                              return;
                            }
                            setIncognito(e.target.checked);
                          }}
                          className="w-4.5 h-4.5 text-[#9c1f35] border-gray-300 rounded focus:ring-[#cd6d7d] accent-[#9c1f35] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Hide Quarter */}
                    <div className="flex items-start justify-between bg-neutral-50 p-4.5 rounded-2xl border border-gray-100/60">
                      <div className="flex-1 pr-4">
                        <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide">Masquer ma localisation</label>
                        <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Masque votre ville et votre distance approximative sur les profils publics.</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={hideDistance}
                          onChange={(e) => setHideDistance(e.target.checked)}
                          disabled={privacyLoading || privacySaving}
                          className="w-4.5 h-4.5 text-[#9c1f35] border-gray-300 rounded focus:ring-[#cd6d7d] accent-[#9c1f35] cursor-pointer disabled:cursor-wait disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex items-start justify-between bg-neutral-50 p-4.5 rounded-2xl border border-gray-100/60">
                      <div className="flex-1 pr-4">
                        <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide">Authentification à deux facteurs</label>
                        <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Cette protection n’est pas encore disponible. Aucun réglage local ne peut l’activer.</p>
                      </div>
                      <div className="shrink-0 rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                        Indisponible
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-neutral-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-neutral-800">Accès aux photos</p>
                      <p className="mt-1 text-[11px] leading-normal text-neutral-500">Ce panneau ne permet pas de choisir qui voit vos photos. Le niveau réel d’accès dépend des politiques Storage déployées.</p>
                    </div>
                    {privacyLoadError && <p role="alert" className="text-sm text-red-600">{privacyLoadError} Fermez puis rouvrez cette page pour réessayer.</p>}
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Notification settings panel */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-[#9c1f35] flex items-center border-b border-gray-100 pb-2.5 uppercase tracking-wide">
                <Bell className="w-4.5 h-4.5 mr-2" /> Alertes & Notifications
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-start space-x-3 bg-neutral-50 p-4 rounded-2xl border border-gray-150 cursor-pointer hover:bg-neutral-100/50 transition">
                  <input
                    type="checkbox"
                    checked={notifMatches}
                    onChange={(e) => setNotifMatches(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#9c1f35] border-gray-300 rounded focus:ring-[#cd6d7d] accent-[#9c1f35]"
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Matchs d'affinités</span>
                    <span className="text-[10px] text-neutral-400 leading-snug block mt-0.5">Être averti d'un intérêt mutuel</span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 bg-neutral-50 p-4 rounded-2xl border border-gray-150 cursor-pointer hover:bg-neutral-100/50 transition">
                  <input
                    type="checkbox"
                    checked={notifMessages}
                    onChange={(e) => setNotifMessages(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#9c1f35] border-gray-300 rounded focus:ring-[#cd6d7d] accent-[#9c1f35]"
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Nouveaux messages</span>
                    <span className="text-[10px] text-neutral-400 leading-snug block mt-0.5">Être alerté lors d'un nouveau chat</span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 bg-neutral-50 p-4 rounded-2xl border border-gray-150 cursor-pointer hover:bg-neutral-100/50 transition">
                  <input
                    type="checkbox"
                    checked={notifVisits}
                    onChange={(e) => setNotifVisits(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#9c1f35] border-gray-300 rounded focus:ring-[#cd6d7d] accent-[#9c1f35]"
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Visiteurs de profil</span>
                    <span className="text-[10px] text-neutral-400 leading-snug block mt-0.5">Être alerté des consultations</span>
                  </div>
                </label>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Bottom buttons panel with Danger zone deactivation */}
            <div className="flex justify-between items-center flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="text-red-500 hover:text-red-600 font-extrabold text-[11px] uppercase tracking-wider flex items-center px-3.5 py-2 rounded-xl hover:bg-red-50 transition cursor-pointer border border-transparent hover:border-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" /> 
                <span>Supprimer mon compte</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSaveAllSettings()}
                disabled={privacyLoading || !privacyLoaded || privacySaving}
                className="bg-[#9c1f35] hover:bg-[#83192c] text-white px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition flex items-center shadow-md cursor-pointer disabled:cursor-wait disabled:opacity-60"
              >
                <Save className="w-4 h-4 mr-2" /> 
                <span>{privacySaving ? 'Enregistrement…' : 'Enregistrer les préférences'}</span>
              </button>
            </div>
          </div>

          {/* Email Verification Modal */}
          {showEmailModal && (
            <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-[#9c1f35] to-[#cd6d7d] text-white p-6 relative">
                  <button 
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="absolute top-4 right-4 bg-black/10 hover:bg-black/20 text-white rounded-full p-1.5 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                      <Mail className="w-5 h-5 text-pink-200" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight">Email de Confiance</h3>
                      <p className="text-[10px] text-pink-100 font-semibold uppercase tracking-wider mt-0.5">Vérification de Sécurité</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-5">
                  
                  {/* Step 1: Request Code */}
                  {emailStep === 'request' && (
                    <div className="space-y-4 text-center animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#9c1f35] flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-gray-900">Vérifiez votre adresse email</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                          Confirmez votre adresse email pour sécuriser votre compte, recevoir vos alertes de match et obtenir le badge <span className="font-bold text-emerald-600">Email Certifié</span>.
                        </p>
                      </div>

                      <div className="text-left bg-neutral-50 p-4.5 rounded-2xl border border-gray-100 space-y-1.5">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Adresse de messagerie actuelle :</label>
                        <input
                          type="email"
                          disabled
                          value={email || user.email}
                          className="w-full bg-neutral-100 text-neutral-500 font-bold border border-gray-200 rounded-xl px-4 py-2.5 text-xs cursor-not-allowed outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSendEmailCode}
                        disabled={isSendingCode}
                        className="w-full bg-gradient-to-r from-[#9c1f35] to-[#cd6d7d] hover:from-[#83192c] hover:to-[#b34c5c] text-white py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition flex items-center justify-center space-x-2 shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isSendingCode ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Envoi du code...</span>
                          </>
                        ) : (
                          <span>Envoyer le code de sécurité</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Step 2: Verify email confirmation */}
                  {emailStep === 'verify' && (
                    <div className="space-y-4 text-center animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100 shadow-inner">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-gray-900">Confirmez votre adresse email</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Ouvrez le lien de confirmation envoyé à <span className="font-bold text-neutral-800">{email || user.email}</span>, puis revenez ici.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setEmailStep('request')}
                          className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                        >
                          Retour
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyEmailCode}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-100"
                        >
                          Confirmer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Success Screen */}
                  {emailStep === 'success' && (
                    <div className="space-y-4 text-center animate-in fade-in duration-300">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-100 shadow-lg relative">
                        <Check className="w-8 h-8 stroke-[4]" />
                        <div className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-25" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-emerald-900">Email Certifié avec Succès ! 🛡️</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                          Félicitations, votre adresse email a été confirmée ! Votre compte gagne un niveau de confiance supérieur.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowEmailModal(false)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition shadow-md shadow-emerald-100 cursor-pointer"
                      >
                        Terminer et Fermer
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* Simulated Deletion/Deactivation Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-5 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner border border-red-100">
                    <Power className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Zone de Danger</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Voulez-vous vraiment supprimer définitivement votre profil Bavel ? Cette action détruira vos chats, vos coups de cœur et vos photos privées de façon irréversible.
                  </p>
                </div>

                <div className="space-y-2 bg-neutral-50 p-4.5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider text-center">Écrivez le mot <span className="text-red-500 font-black">"supprimer"</span> pour valider :</p>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder="Saisir supprimer ici..."
                    className="w-full text-center bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 outline-none focus:border-red-500 transition-all uppercase tracking-wide"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowDeleteModal(false); setDeleteConfirmInput(''); }}
                    className="flex-1 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider text-gray-500 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                  >
                    Conserver
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="flex-1 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 transition cursor-pointer shadow-md shadow-red-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isDeletingAccount ? 'Suppression…' : 'Confirmer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showVerificationModal && (
            <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
                <ProfilePhotoVerification
                  onClose={() => setShowVerificationModal(false)}
                  onVerified={() => onUpdateUser({ ...user, is_verified: true, verified: true })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
