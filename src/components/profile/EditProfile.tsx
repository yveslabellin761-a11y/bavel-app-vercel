import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, FileText, Save, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import AvatarUpload from './AvatarUpload';

interface EditProfileProps {
  onClose?: () => void;
  onProfileUpdated?: (profile: { username: string; age: number | null; bio: string; avatar_url?: string }) => void;
}

export default function EditProfile({ onClose, onProfileUpdated }: EditProfileProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // États pour les champs du profil
  const [username, setUsername] = useState('');
  const [age, setAge] = useState<string>('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // 1. Récupérer l'utilisateur connecté
    const getUserData = async () => {
      setFetching(true);
      try {
        if (supabase) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            setUser(currentUser);
            await fetchProfile(currentUser.id);
          }
        } else {
          // Fallback local storage
          const localUserStr = localStorage.getItem('bavel_auth_user') || localStorage.getItem('bavel_profile_user');
          if (localUserStr) {
            const parsed = JSON.parse(localUserStr);
            setUser(parsed);
            setUsername(parsed.name || parsed.username || '');
            setAge(parsed.age ? String(parsed.age) : '');
            setBio(parsed.bio || '');
            setAvatarUrl(parsed.avatar_url || (parsed.photos && parsed.photos[0]) || '');
          }
        }
      } catch (err: any) {
        console.warn('Erreur getUserData:', err);
      } finally {
        setFetching(false);
      }
    };

    getUserData();
  }, []);

  // 2. RÉCUPÉRER LES DONNÉES DU PROFIL (SELECT avec .single())
  const fetchProfile = async (userId: string) => {
    try {
      if (!supabase || !isSupabaseConfigured) return;

      const { data, error, status } = await supabase
        .from('profiles')
        .select('username, age, bio, avatar_url, photos')
        .eq('id', userId)
        .single(); // Récupère un seul objet

      if (error && status !== 406) {
        return;
      }

      if (data) {
        setUsername(data.username || '');
        setAge(data.age ? String(data.age) : '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || (data.photos && data.photos[0]) || '');
      }
    } catch (error: any) {
      console.warn(`Chargement profil notice: ${error.message || error}`);
    }
  };

  // 3. METTRE À JOUR LE PROFIL (UPSERT)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!username.trim()) {
      setFeedback({ type: 'error', text: 'Le pseudo est obligatoire.' });
      return;
    }

    try {
      setLoading(true);

      const parsedAge = age ? parseInt(age, 10) : null;
      const updates: any = {
        id: user?.id || 'current_user_id',
        username: username.trim(),
        age: parsedAge,
        bio: bio.trim(),
        avatar_url: avatarUrl || undefined,
        updated_at: new Date().toISOString(),
      };

      if (supabase && isSupabaseConfigured && user?.id) {
        const { error } = await supabase
          .from('profiles')
          .upsert(updates);

        if (error) throw error;
      }

      // Synchroniser également dans le stockage local
      const existing = JSON.parse(localStorage.getItem('bavel_profile_user') || '{}');
      const updatedLocal = {
        ...existing,
        name: username.trim(),
        username: username.trim(),
        age: parsedAge || existing.age || 25,
        bio: bio.trim(),
        avatar_url: avatarUrl || existing.avatar_url
      };
      if (avatarUrl) {
        updatedLocal.photos = [avatarUrl, ...(existing.photos || []).filter((p: string) => p !== avatarUrl)];
      }
      localStorage.setItem('bavel_profile_user', JSON.stringify(updatedLocal));

      setFeedback({ type: 'success', text: 'Profil mis à jour avec succès !' });
      onProfileUpdated?.({ username: username.trim(), age: parsedAge, bio: bio.trim(), avatar_url: avatarUrl });
    } catch (error: any) {
      setFeedback({ type: 'error', text: `Erreur de mise à jour: ${error.message || error}` });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full max-w-sm mx-auto p-8 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-7 h-7 animate-spin text-purple-600 mb-3" />
        <p className="text-sm text-gray-500 font-medium">Chargement de votre profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-sm mx-auto p-6 bg-white rounded-3xl shadow-xl border border-gray-100 text-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-gray-900 mb-1">Non connecté</h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-4">Veuillez vous connecter pour voir et modifier votre profil.</p>
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 sm:p-6 bg-white rounded-3xl shadow-xl border border-gray-100 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 text-center pr-2">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Modifier mon profil
          </h2>
          <p className="text-xs text-slate-500">Mise à jour directe Supabase</p>
        </div>
      </div>

      {/* Feedback message */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-3 rounded-2xl mb-4 text-xs sm:text-sm flex items-start space-x-2.5 font-medium leading-snug ${
              feedback.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            )}
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Upload (Supabase Storage) */}
      <AvatarUpload 
        user={user} 
        avatarUrl={avatarUrl} 
        onUploadSuccess={(url) => setAvatarUrl(url)} 
      />

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        {/* Pseudo */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pseudo :
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Votre prénom ou pseudo"
              className="w-full pl-10 pr-3.5 py-3 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors min-h-[44px]"
            />
          </div>
        </div>

        {/* Âge */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Âge :
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="number"
              min="18"
              max="99"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ex: 26"
              className="w-full pl-10 pr-3.5 py-3 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors min-h-[44px]"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ma bio / Description :
          </label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez-nous de vous, vos passions, ce que vous recherchez..."
              rows={4}
              className="w-full pl-10 pr-3.5 py-3 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save className="w-4.5 h-4.5" />
              <span>Sauvegarder le profil</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
