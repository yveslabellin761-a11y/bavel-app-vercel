import React, { useEffect, useState } from 'react';
import { Camera, Loader2, User as UserIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  deleteUploadedProfilePhotoFromSupabase,
  isSupabaseConfigured,
  supabase,
  updateProfilePhotosInSupabase,
  uploadProfilePhotoToSupabase
} from '../../lib/supabase';
import { getProfilePhotoStoragePath } from '../../lib/profilePhotoUrls';

const MAX_PROFILE_PHOTOS = 8;
const MAX_PROFILE_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface AvatarUploadProps {
  user: {
    id: string;
    email?: string;
    [key: string]: any;
  } | null;
  avatarUrl?: string;
  onUploadSuccess?: (url: string) => void;
}

export default function AvatarUpload({ user, avatarUrl, onUploadSuccess }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | undefined>(avatarUrl);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCurrentAvatar(avatarUrl || undefined);
  }, [avatarUrl]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let uploadedPath: string | undefined;
    try {
      setUploading(true);
      setFeedback(null);

      const file = event.target.files?.[0];
      if (!file) throw new Error('Sélectionnez une image à téléverser.');
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error('Format non pris en charge. Utilisez JPG, PNG ou WebP.');
      }
      if (file.size > MAX_PROFILE_PHOTO_BYTES) {
        throw new Error('La photo ne doit pas dépasser 10 Mio.');
      }
      if (!user?.id) throw new Error('Utilisateur non connecté.');
      if (!isSupabaseConfigured) throw new Error('La connexion Supabase est requise pour enregistrer une photo.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('photos')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      const existingPhotos = Array.isArray(profile.photos) ? profile.photos.filter(Boolean) : [];
      if (existingPhotos.length > MAX_PROFILE_PHOTOS) {
        throw new Error('Votre galerie dépasse la limite autorisée. Supprimez des photos avant de la modifier.');
      }

      const oldPrimaryPath = getProfilePhotoStoragePath(existingPhotos[0] || '');
      const uploaded = await uploadProfilePhotoToSupabase(file, user.id, 0);
      uploadedPath = uploaded.path;
      const nextPhotos = [
        uploaded.path,
        ...existingPhotos.filter((photo: string) => getProfilePhotoStoragePath(photo) !== uploaded.path)
      ].slice(0, MAX_PROFILE_PHOTOS);

      await updateProfilePhotosInSupabase(user.id, nextPhotos);
      uploadedPath = undefined;
      setCurrentAvatar(uploaded.url);
      setFeedback({ type: 'success', text: 'Photo de profil mise à jour.' });
      onUploadSuccess?.(uploaded.url);
      if (oldPrimaryPath && !nextPhotos.some(photo => getProfilePhotoStoragePath(photo) === oldPrimaryPath)) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(oldPrimaryPath);
        } catch (cleanupError) {
          console.error('Échec du nettoyage de l’ancienne photo principale :', cleanupError);
          setFeedback({
            type: 'error',
            text: 'Photo mise à jour, mais le nettoyage de l’ancienne image a échoué.'
          });
        }
      }
    } catch (error) {
      if (uploadedPath) {
        try {
          await deleteUploadedProfilePhotoFromSupabase(uploadedPath);
        } catch (cleanupError) {
          console.error('Échec du nettoyage de la photo de profil non enregistrée :', cleanupError);
        }
      }
      const message = error instanceof Error ? error.message : "Erreur lors de l'envoi de la photo.";
      console.error('Erreur upload avatar:', error);
      setFeedback({ type: 'error', text: message });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center my-3">
      <div className="relative group mb-3">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-3 border-purple-600/30 bg-slate-100 shadow-md flex items-center justify-center relative">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Avatar de profil"
              className="w-full h-full object-cover"
              onError={() => setCurrentAvatar(undefined)}
            />
          ) : (
            <div className="w-full h-full bg-slate-200 text-slate-400 flex flex-col items-center justify-center">
              <UserIcon className="w-10 h-10 sm:w-12 sm:h-12" />
              <span className="text-[11px] font-semibold mt-0.5">Aucune</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin mb-1 text-purple-300" />
              <span className="text-[10px] font-bold">Envoi...</span>
            </div>
          )}
        </div>

        <label
          htmlFor="avatar-upload-input"
          className="absolute bottom-0 right-0 w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all border-2 border-white min-h-[32px] min-w-[32px]"
          title="Changer la photo"
        >
          <Camera className="w-4 h-4" />
        </label>
      </div>

      <label
        htmlFor="avatar-upload-input"
        className={`inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer min-h-[44px] ${
          uploading ? 'opacity-70 pointer-events-none' : ''
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Téléversement...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>Changer la photo</span>
          </>
        )}
        <input
          id="avatar-upload-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={uploadAvatar}
          disabled={uploading}
          className="hidden"
        />
      </label>

      <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 text-center">
        JPG, PNG ou WebP (max. 10 Mio)
      </p>

      {feedback && (
        <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 ${
          feedback.type === 'error'
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {feedback.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
}
