import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Lock, LogIn, UserPlus, LogOut, Trash2, 
  AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, ShieldAlert
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AuthProfileManagerProps {
  onClose?: () => void;
  onSuccess?: (user: any) => void;
}

export default function AuthProfileManager({ onClose, onSuccess }: AuthProfileManagerProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Pour l'inscription du profil
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Vérifier si un utilisateur est déjà connecté au chargement
  useEffect(() => {
    let isMounted = true;

    if (supabase) {
      // 1. Récupérer la session existante
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      });

      // 2. Écouter les changements d'état d'authentification
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    } else {
      // Fallback local session si Supabase n'est pas configuré
      try {
        const localUser = localStorage.getItem('bavel_auth_user');
        if (localUser) {
          setUser(JSON.parse(localUser));
        }
      } catch (e) {
        console.error("Erreur de lecture de la session locale:", e);
      }
    }
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
  };

  // 1. INSCRIPTION D'UN NOUVEAU PROFIL
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      showNotification('error', 'Veuillez renseigner votre email et mot de passe.');
      return;
    }

    if (password.length < 6) {
      showNotification('error', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      if (!supabase || !isSupabaseConfigured) {
        showNotification('error', 'Le service d’authentification n’est pas configuré. Réessayez plus tard.');
        return;
      }

      // Inscription dans Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: username.trim() || email.split('@')[0] }, // Stocke le pseudo dans auth.users
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        showNotification('error', `Erreur d'inscription : ${error.message}`);
      } else {
        showNotification('success', 'Inscription réussie ! Vérifiez vos emails si la confirmation est activée.');
        if (data?.user) {
          setUser(data.user);
          onSuccess?.(data.user);
        }
      }
    } catch (err: any) {
      showNotification('error', err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  // 2. CONNEXION D'UN PROFIL EXISTANT
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      showNotification('error', 'Veuillez saisir votre email et mot de passe.');
      return;
    }

    setLoading(true);

    try {
      if (!supabase || !isSupabaseConfigured) {
        showNotification('error', 'Le service d’authentification n’est pas configuré. Réessayez plus tard.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        showNotification('error', `Erreur de connexion : ${error.message}`);
      } else {
        showNotification('success', 'Connexion réussie !');
        if (data?.user) {
          setUser(data.user);
          onSuccess?.(data.user);
        }
      }
    } catch (err: any) {
      showNotification('error', err.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  // 3. DÉCONNEXION
  const handleSignOut = async () => {
    setLoading(true);
    setMessage(null);

    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          showNotification('error', error.message);
        } else {
          setUser(null);
          showNotification('info', 'Vous avez été déconnecté.');
        }
      } else {
        localStorage.removeItem('bavel_auth_user');
        setUser(null);
        showNotification('info', 'Vous avez été déconnecté.');
      }
    } catch (err: any) {
      showNotification('error', err.message || "Erreur de déconnexion.");
    } finally {
      setLoading(false);
    }
  };

  // 4. SUPPRESSION DE COMPTE
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte et vos données ?");
    if (!confirmDelete) return;

    setLoading(true);
    setMessage(null);

    try {
      if (supabase && user?.id) {
        // Option recommandée sans backend : Supprimer les données publiques du profil
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        if (profileError) {
          showNotification('error', `Erreur lors de la suppression des données : ${profileError.message}`);
          setLoading(false);
          return;
        }

        // Nettoyage des interactions
        await supabase.from('messages').delete().or(`sender_id.eq.${user.id}`);
        await supabase.from('likes').delete().or(`user_id.eq.${user.id},target_id.eq.${user.id}`);
        await supabase.from('matches').delete().or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`);

        // Déconnexion forcée après suppression des données publiques
        await supabase.auth.signOut();
      }

      // Nettoyage local
      localStorage.removeItem('bavel_auth_user');
      localStorage.removeItem('bavel_profile_user');
      setUser(null);
      showNotification('success', 'Votre profil a été supprimé avec succès.');
    } catch (err: any) {
      showNotification('error', err.message || "Erreur lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-4 sm:p-6 bg-white rounded-3xl shadow-xl border border-gray-100 text-slate-900 font-sans">
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          {user ? 'Mon Profil Supabase' : 'Espace Membre'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {user ? 'Gérez vos accès et données' : 'Connectez-vous ou créez votre compte'}
        </p>
      </div>

      {/* Notifications Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-3 rounded-2xl mb-4 text-xs sm:text-sm flex items-start space-x-2.5 font-medium leading-snug ${
              message.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}
          >
            {message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            )}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!user ? (
        <div>
          {/* Switcher Mode */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => { setMode('signin'); setMessage(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setMessage(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
            {/* Pseudo (pour inscription) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pseudo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ex: Alex"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bouton d'action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-purple-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chargement...</span>
                </>
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Se connecter</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>S'inscrire</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Carte utilisateur */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-base shrink-0">
                {(user.user_metadata?.display_name || user.email || 'U')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 font-medium">Connecté en tant que</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user.user_metadata?.display_name || user.email}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Bouton de déconnexion */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-sm rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 text-amber-700" />}
            <span>Se déconnecter</span>
          </button>

          <div className="border-t border-slate-200 pt-3">
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl mb-3 flex items-start space-x-2 text-[11px] text-rose-700 leading-snug">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>
                La suppression supprime vos photos, messages, likes et données du profil public Supabase.
              </span>
            </div>

            {/* Bouton suppression de compte */}
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={loading}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-60 text-white font-bold text-sm rounded-2xl shadow-md shadow-rose-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Supprimer mon compte définitivement</span>
            </button>
          </div>
        </div>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer"
        >
          Fermer
        </button>
      )}
    </div>
  );
}
