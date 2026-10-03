import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  ArrowLeft,
  Check,
  Lock,
  ShieldCheck,
  Sparkles,
  Globe,
  ChevronRight,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  CheckCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import {
  signUpWithEmail,
  signInWithEmail,
  resetPasswordForEmail,
  signInWithGoogle,
  signInWithFacebook,
  signInWithPasskey
} from '../../lib/supabase';
import { isCompletedProfile } from '../../lib/accountStore';
import { getApiUrl } from '../../lib/apiUrl';

interface LoginScreenProps {
  initialAuthError?: string;
  onLoginSuccess: (userData?: {
    name?: string;
    email?: string;
    phone?: string;
    isGoogle?: boolean;
    isNewUser?: boolean;
    savedProfile?: any;
    savedPhotos?: string[];
  }) => void;
  onRegisterStart?: (userData: { email?: string; name?: string }) => void;
}

type AuthMode = 'main' | 'email';
type EmailTab = 'login' | 'signup';

export function LoginScreen({ initialAuthError, onLoginSuccess, onRegisterStart }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('main');
  const [emailTab, setEmailTab] = useState<EmailTab>('login');

  // Email State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bavel_remember_me') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleNativeOAuthCallback = (event: Event) => {
      const detail = (event as CustomEvent<{ error: string | null }>).detail;
      setGoogleAccountLoading(false);
      setIsLoading(false);
      if (detail?.error) setErrorMsg(detail.error);
    };
    window.addEventListener('bavel:native-oauth-callback', handleNativeOAuthCallback);
    return () => window.removeEventListener('bavel:native-oauth-callback', handleNativeOAuthCallback);
  }, []);

  // Forgot Password State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'email_sent' | 'done' | 'enter_new_password'>('request');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Email Confirmation State
  const [showEmailSent, setShowEmailSent] = useState(false);

  // Auto-restore saved email if "Remember Me" was enabled
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('bavel_remember_me');
      const savedEmail = localStorage.getItem('bavel_remember_email');
      if (savedRemember === 'true' && savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (e) {
      console.error('Erreur de restauration des identifiants sauvegardés:', e);
    }
  }, []);

  // Facebook OAuth is handled by Supabase; AuthProvider consumes the returned session.
  const handleFacebookLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithFacebook();
      if (result.error) {
        setErrorMsg(result.error);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur lors de la connexion Facebook:', error);
      setErrorMsg('Erreur lors de la connexion Facebook');
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPasskey();
      if (result.error) setErrorMsg(result.error);
    } catch (error) {
      console.error('Erreur lors de la connexion avec une clé d’accès:', error);
      setErrorMsg('Connexion par clé d’accès impossible. Vérifiez la configuration Passkeys de Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-white/20', textColor: 'text-white/40' };
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 8) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 25;

    if (score <= 25) return { score: 25, label: 'Faible', color: 'bg-rose-500', textColor: 'text-rose-400' };
    if (score === 50) return { score: 50, label: 'Moyen', color: 'bg-amber-500', textColor: 'text-amber-400' };
    if (score === 75) return { score: 75, label: 'Fort', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
    return { score: 100, label: 'Excellent', color: 'bg-emerald-400', textColor: 'text-emerald-300' };
  };

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleAccountLoading, setGoogleAccountLoading] = useState(false);
  useEffect(() => {
    if (initialAuthError) setErrorMsg(initialAuthError);
  }, [initialAuthError]);

  // Auto-detect reset-password token from URL (e.g. /reset-password?token=... or ?resetToken=...)
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryToken = urlParams.get('token') || urlParams.get('resetToken') || urlParams.get('reset_token');

      // Check path /reset-password/TOKEN
      let pathToken = '';
      if (window.location.pathname.includes('/reset-password/')) {
        pathToken = window.location.pathname.split('/reset-password/')[1];
      }

      // Check hash (Supabase recovery link)
      let hashToken = '';
      if (window.location.hash.includes('type=recovery')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        hashToken = hashParams.get('access_token') || '';
      }

      const activeToken = queryToken || pathToken || hashToken;
      if (activeToken) {
        setResetToken(activeToken);
        setResetStep('enter_new_password');
        setShowForgotPasswordModal(true);
        // Clean URL history
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (e) {
      console.error('Erreur de détection du token de réinitialisation:', e);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleAccountLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMsg(res.error);
      }
      setGoogleAccountLoading(false);
    } catch (err: any) {
      setGoogleAccountLoading(false);
      console.error('Erreur Google Auth:', err);
      setErrorMsg('Erreur lors de la connexion Google.');
    }
  };

  // Submit Email Form (Supabase Auth 100% real implementation)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Adresse e-mail valide requise');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (emailTab === 'signup' && password !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    if (emailTab === 'signup') {
      // Ask the server; the browser must not retain or consult a profile index by email.
      let serverCheck: any = null;
      try {
        const checkRes = await fetch(getApiUrl('/api/auth/check-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        serverCheck = await checkRes.json();
      } catch (e) {
        console.warn('Check email error:', e);
      }

      const existingProfile = serverCheck?.profile || null;
      if (serverCheck?.exists || (existingProfile && isCompletedProfile(existingProfile))) {
        setIsLoading(false);
        setErrorMsg(
          "Un compte existe déjà avec cette adresse e-mail. Vous avez été redirigé vers l'onglet Connexion pour vous connecter."
        );
        setEmailTab('login');
        return;
      }

      // 1. Call server registration endpoint
      try {
        const res = await signUpWithEmail(email, password);
        setIsLoading(false);

        if (res.error) {
          setErrorMsg(res.error);
          if (res.error.includes('possède déjà un compte')) {
            setEmailTab('login');
          }
          return;
        }

        // If user exists but session is null, email confirmation is required
        if (res.data?.user && !res.data?.session) {
          setShowEmailSent(true);
          return;
        }

        if (onRegisterStart) {
          onRegisterStart({ email, name: '' });
        } else {
          onLoginSuccess({ name: '', email, isNewUser: true });
        }
      } catch (regErr: any) {
        setIsLoading(false);
        setErrorMsg("Erreur lors de l'inscription.");
      }
    } else {
      try {
        const res = await signInWithEmail(email, password);
        setIsLoading(false);

        if (res.error) {
          if (
            res.error.toLowerCase().includes('invalid login') ||
            res.error.toLowerCase().includes('credentials') ||
            res.error.toLowerCase().includes('password')
          ) {
            setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre mot de passe et réessayer.');
            return;
          }
          setErrorMsg(res.error);
          return;
        }

        if (rememberMe) {
          localStorage.setItem('bavel_remember_me', 'true');
          localStorage.setItem('bavel_remember_email', email);
        } else {
          localStorage.removeItem('bavel_remember_me');
          localStorage.removeItem('bavel_remember_email');
        }

        const userCreatedName = res.data?.user?.user_metadata?.name || res.data?.user?.user_metadata?.full_name || '';

        onLoginSuccess({
          name: userCreatedName,
          email,
          isNewUser: false,
          savedProfile: null,
          savedPhotos: []
        });
      } catch (srvErr) {
        setIsLoading(false);
        setErrorMsg('Erreur lors de la connexion.');
      }
    }
  };

  // Submit Password Reset Request (Supabase Auth 100% real implementation)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      setErrorMsg('Adresse e-mail valide requise.');
      return;
    }
    setIsResetLoading(true);
    setResetSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await resetPasswordForEmail(resetEmail);
      setIsResetLoading(false);

      if (res.success) {
        setResetStep('email_sent');
      } else {
        setErrorMsg(res.error || 'Erreur lors de la réinitialisation');
      }
    } catch (e: any) {
      setIsResetLoading(false);
      setErrorMsg('Erreur inattendue');
    }
  };

  // (handleResetPasswordSubmit has been moved to ResetPasswordModal handled by MobileApp)

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-0 md:p-4 select-none font-sans overflow-hidden">
      {/* Mobile Shell Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full md:max-w-[370px] md:max-h-[740px] bg-gradient-to-b from-[#120326] via-[#1a0836] to-[#0d021c] text-white md:rounded-[36px] shadow-2xl flex flex-col justify-between relative overflow-hidden border border-white/10 mobile-scale"
      >
        {/* Ambient Animated Glows */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/30 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-64 h-64 bg-rose-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-violet-800/25 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="pt-16 px-4 flex items-center justify-between z-10">
          {mode !== 'main' ? (
            <button
              onClick={() => {
                setErrorMsg('');
                setMode('main');
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white/90"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHelpModal(true)}
              aria-label="Ouvrir l’aide"
              className="min-h-[44px] text-[11px] font-semibold text-white/80 hover:text-white px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 transition-all flex items-center space-x-1 hover:bg-white/15"
            >
              <Globe className="w-3 h-3 text-purple-300" aria-hidden="true" />
              <span>Aide</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-center px-5 py-3 z-10 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {/* MODE: MAIN */}
            {mode === 'main' && (
              <motion.div
                key="mode-main"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center w-full"
              >
                {/* Brand Logo */}
                <div className="relative mb-3 text-center">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="inline-block"
                  >
                    <h1 className="text-[36px] font-zapfino electric-text drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] leading-normal pb-4 pt-2 text-center">
                      Bavel
                    </h1>
                  </motion.div>
                </div>

                <p className="text-xs font-medium text-white/80 text-center mb-10 max-w-[260px] leading-relaxed">
                  Là où les vraies histoires commencent
                </p>

                {/* Primary Action Buttons */}
                <div className="w-full max-w-[300px] space-y-2.5">
                  {/* 1. Email */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setErrorMsg('');
                      setMode('email');
                    }}
                    disabled={isLoading}
                    className="min-h-[44px] w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-2.5 border border-white/15 backdrop-blur-md transition-all"
                  >
                    <Mail className="w-4 h-4 text-rose-300" aria-hidden="true" />
                    <span>Continuer avec E-mail</span>
                  </motion.button>

                  {/* Connexion par passkey Supabase */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePasskeyLogin}
                    disabled={isLoading}
                    className="min-h-[44px] w-full py-2.5 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-2.5 shadow-md shadow-purple-900/20 transition-all border border-purple-400/20"
                  >
                    <KeyRound className="w-4 h-4 text-purple-200" aria-hidden="true" />
                    <span>Se connecter avec une clé d’accès</span>
                  </motion.button>

                  {/* 5. Google */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || googleAccountLoading}
                    className="min-h-[44px] w-full py-2.5 px-4 bg-white text-slate-900 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2.5 shadow-md shadow-black/20 hover:bg-slate-50 transition-all disabled:opacity-70 cursor-pointer"
                  >
                    {googleAccountLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continuer avec Google</span>
                      </>
                    )}
                  </motion.button>

                  {/* 6. Facebook */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFacebookLogin}
                    disabled={isLoading}
                    className="min-h-[44px] w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-2.5 shadow-md shadow-blue-900/20 transition-all disabled:opacity-70 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Connexion via Facebook</span>
                  </motion.button>
                </div>

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="mt-4 max-w-[300px] w-full flex items-center space-x-2 text-rose-300 text-[11px] font-medium bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/30"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* MODE: EMAIL */}
            {mode === 'email' && (
              <motion.div
                key="mode-email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-[300px] mx-auto flex flex-col"
              >
                {showEmailSent ? (
                  <div className="bg-purple-500/15 border border-purple-500/30 p-4 rounded-2xl text-white text-xs space-y-4 mb-2 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 blur-2xl pointer-events-none" />

                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto border border-purple-500/30 relative z-10 shadow-lg">
                      <Mail className="w-6 h-6 text-purple-300" />
                    </div>

                    <div className="text-center relative z-10 space-y-1.5">
                      <h4 className="font-bold text-white text-sm">Vérifie ta boîte mail</h4>
                      <p className="text-[11.5px] text-white/80 leading-relaxed">
                        Un lien de confirmation vient d'être envoyé à<br />
                        <strong className="text-purple-300 font-bold block mt-0.5">{email}</strong>
                      </p>
                    </div>

                    <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-[11px] text-white/70 space-y-2 relative z-10">
                      <p className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">Clique sur le lien reçu pour activer ton compte.</span>
                      </p>
                      <p className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">Vérifie tes spams si tu ne le vois pas.</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowEmailSent(false)}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border border-white/10 relative z-10"
                    >
                      Retour
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Email Tab Switcher */}
                    <div className="flex bg-white/10 p-0.5 rounded-lg mb-4 border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailTab('login');
                          setErrorMsg('');
                        }}
                        className={`min-h-[44px] flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          emailTab === 'login' ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Se connecter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailTab('signup');
                          setErrorMsg('');
                        }}
                        className={`min-h-[44px] flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          emailTab === 'signup' ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        S'inscrire
                      </button>
                    </div>

                    <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                      <div>
                        <label
                          htmlFor="bavel-login-email"
                          className="block text-[11px] font-semibold text-white/80 mb-1"
                        >
                          Adresse e-mail
                        </label>
                        <input
                          id="bavel-login-email"
                          name="email"
                          type="email"
                          placeholder="nom@exemple.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="username webauthn"
                          spellCheck={false}
                          className="min-h-[44px] w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-xs placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="bavel-login-password"
                          className="block text-[11px] font-semibold text-white/80 mb-1"
                        >
                          Mot de passe
                        </label>
                        <div className="relative">
                          <input
                            id="bavel-login-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={emailTab === 'login' ? 'current-password' : 'new-password'}
                            className="min-h-[44px] w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-xs placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-400 pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white"
                          >
                            {showPassword ? (
                              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      {emailTab === 'signup' && (
                        <div>
                          <label
                            htmlFor="bavel-confirm-password"
                            className="block text-[11px] font-semibold text-white/80 mb-1"
                          >
                            Confirmation du mot de passe
                          </label>
                          <div className="relative">
                            <input
                              id="bavel-confirm-password"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="min-h-[44px] w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-xs placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-400 pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              aria-label={
                                showConfirmPassword
                                  ? 'Masquer la confirmation du mot de passe'
                                  : 'Afficher la confirmation du mot de passe'
                              }
                              className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {emailTab === 'login' && (
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <label className="min-h-[44px] flex items-center space-x-1.5 cursor-pointer text-white/80 hover:text-white">
                            <input
                              type="checkbox"
                              name="rememberMe"
                              checked={rememberMe}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setRememberMe(isChecked);
                                try {
                                  if (isChecked && email) {
                                    localStorage.setItem('bavel_remember_me', 'true');
                                    localStorage.setItem('bavel_remember_email', email);
                                  } else if (!isChecked) {
                                    localStorage.removeItem('bavel_remember_me');
                                    localStorage.removeItem('bavel_remember_email');
                                  }
                                } catch (err) {
                                  console.error('Erreur de sauvegarde Se souvenir de moi:', err);
                                }
                              }}
                              className="rounded border-white/30 bg-white/10 text-purple-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-purple-500 cursor-pointer"
                            />
                            <span>Se souvenir de moi</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setResetEmail(email);
                              setResetSuccessMsg('');
                              setResetStep('request');
                              setShowForgotPasswordModal(true);
                            }}
                            className="min-h-[44px] text-purple-300 hover:text-purple-200 font-medium hover:underline transition-colors cursor-pointer"
                          >
                            Mot de passe oublié ?
                          </button>
                        </div>
                      )}

                      {errorMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          role="alert"
                          className="flex flex-col space-y-1.5 text-rose-400 text-[11px] font-medium bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20"
                        >
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{errorMsg}</span>
                          </div>
                          {errorMsg.toLowerCase().includes('inscrire') && emailTab === 'login' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEmailTab('signup');
                                setErrorMsg('');
                              }}
                              className="text-white bg-rose-500/30 hover:bg-rose-500/50 border border-rose-500/40 rounded-md py-1 px-2.5 font-bold text-[10.5px] transition-colors mt-1 flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <span>S'inscrire maintenant</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </motion.div>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        aria-busy={isLoading}
                        className="min-h-[44px] w-full py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-rose-900/30 transition-all disabled:opacity-70 mt-2"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>{emailTab === 'login' ? 'Se connecter' : 'Créer mon compte'}</span>
                        )}
                      </motion.button>
                    </form>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Legal & Terms */}
        <div className="pb-15 px-10 mt-10 text-center text-[10px] text-white/50 z-10 space-y-1.5">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Vos données personnelles sont protégées</span>
          </p>
          <p className="leading-normal">
            En continuant, vous acceptez nos{' '}
            <button
              onClick={() => setShowLegalModal('terms')}
              className="text-white/80 font-semibold underline hover:text-white"
            >
              Conditions d'utilisation
            </button>{' '}
            et notre{' '}
            <button
              onClick={() => setShowLegalModal('privacy')}
              className="text-white/80 font-semibold underline hover:text-white"
            >
              Confidentialité
            </button>
            .
          </p>
        </div>

        {/* Help Modal */}
        <AnimatePresence>
          {showHelpModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 p-6 flex flex-col justify-between text-white"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Centre d'aide & Assistance
                  </h3>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-white/80">
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <p className="font-semibold text-white mb-1">Connexion sociale sécurisée</p>
                    <p>Google ne partage jamais votre mot de passe avec notre application.</p>
                  </div>
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <p className="font-semibold text-white mb-1">Protection de la vie privée</p>
                    <p>Votre géolocalisation exacte n'est jamais divulguée aux autres membres.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm"
              >
                Fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legal Modal */}
        <AnimatePresence>
          {showLegalModal && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 p-6 flex flex-col justify-between text-white"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    {showLegalModal === 'terms' ? 'Conditions Générales' : 'Politique de Confidentialité'}
                  </h3>
                  <button
                    onClick={() => setShowLegalModal(null)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs text-white/70 space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                  <p>
                    Bienvenue sur Bavel. La confidentialité et la sécurité de nos membres sont nos priorités absolues.
                  </p>
                  <p>
                    1. Respect et Bienveillance : Tout comportement malveillant ou déplacé entraînera la suspension
                    immédiate du compte.
                  </p>
                  <p>
                    2. Modération Automatique & Humaine : Les photos et messages sont protégés afin de garantir un
                    environnement sain et sécurisé.
                  </p>
                  <p>
                    3. Contrôle des données : Vous pouvez supprimer ou exporter vos données personnelles à tout moment
                    depuis vos réglages.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowLegalModal(null)}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl font-bold text-sm"
              >
                J'ai compris
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password Reset Modal */}
        <AnimatePresence>
          {showForgotPasswordModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 p-5 flex items-center justify-center"
            >
              <div className="w-full max-w-[310px] bg-[#1a0836] text-white rounded-2xl p-5 shadow-2xl border border-white/15 flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white">Réinitialisation</span>
                  </div>
                  <button
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/70 transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-white/70 mb-4">
                  Saisis ton adresse e-mail pour recevoir un lien de réinitialisation de ton mot de passe.
                </p>

                {resetStep === 'done' ? (
                  <div className="bg-emerald-500/15 border border-emerald-500/30 p-3.5 rounded-xl text-emerald-300 text-xs font-medium space-y-3 mb-1 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto border border-emerald-500/40">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Mot de passe réinitialisé !</h4>
                      <p className="text-[11.5px] text-emerald-200/90 leading-relaxed">
                        {resetSuccessMsg ||
                          'Votre nouveau mot de passe a été enregistré avec succès. Vous pouvez maintenant vous connecter.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPasswordModal(false);
                        setResetStep('request');
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                    >
                      <span>Se connecter maintenant</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : resetStep === 'email_sent' ? (
                  <div className="bg-purple-500/15 border border-purple-500/30 p-3.5 rounded-xl text-white text-xs space-y-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto border border-purple-500/30">
                      <Mail className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-white text-xs mb-1">E-mail de confirmation envoyé</h4>
                      <p className="text-[11px] text-white/70 leading-relaxed">
                        Un lien de sécurité unique a été envoyé à{' '}
                        <strong className="text-purple-300 font-semibold">{resetEmail}</strong>.
                      </p>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 text-[11px] text-white/80 space-y-1.5">
                      <p className="flex items-center space-x-1.5 text-purple-200 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Vérifiez votre boîte de réception ou vos spams.</span>
                      </p>
                      <p className="flex items-center space-x-1.5 text-purple-200 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Cliquez sur le lien reçu par mail pour autoriser la saisie.</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="bavel-reset-email" className="block text-[11px] font-semibold text-white/80 mb-1">
                        Adresse e-mail du compte
                      </label>
                      <input
                        id="bavel-reset-email"
                        name="email"
                        type="email"
                        placeholder="nom@exemple.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        autoComplete="email"
                        spellCheck={false}
                        className="min-h-[44px] w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-xs placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>

                    {errorMsg && (
                      <div className="text-[11px] text-rose-300 bg-rose-500/20 border border-rose-500/30 p-2 rounded-lg flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isResetLoading || !resetEmail}
                      className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-purple-900/40 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isResetLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Envoyer le lien de réinitialisation</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
