import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Sparkles, Shield, ChevronRight, Loader2, Zap } from 'lucide-react';
import { AuthError } from './shared/AuthError';

// ============================================
// 1. TYPES
// ============================================

export interface AuthMainProps {
  onEmail: () => void;
  onGoogle: () => void;
  isLoading: boolean;
  error: string | null;
  isGoogleLoading?: boolean;
  variant?: 'default' | 'compact' | 'full';
  showBranding?: boolean;
  showDivider?: boolean;
  className?: string;
}

export interface AuthButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant: 'primary' | 'secondary' | 'outline';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  badge?: string;
}

// ============================================
// 2. SOUS-COMPOSANTS
// ============================================

// 2.1 Auth Button
const AuthButton: React.FC<AuthButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  isLoading = false,
  variant = 'secondary',
  className = '',
  size = 'md',
  badge,
}) => {
  const variants = {
    primary: 'bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-black/20',
    secondary: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15',
    outline: 'bg-transparent border-2 border-white/30 text-white hover:bg-white/5 hover:border-white/50',
  };

  const sizes = {
    sm: 'py-2.5 px-3 text-xs',
    md: 'py-3.5 px-4 text-sm',
    lg: 'py-4 px-6 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        relative w-full rounded-2xl flex items-center justify-center space-x-3 
        transition-all duration-200 cursor-pointer
        ${variants[variant]}
        ${sizes[size]}
        ${className}
        ${(disabled || isLoading) ? 'opacity-60 cursor-not-allowed' : ''}
      `}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {icon}
          <span className="font-semibold">{label}</span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </>
      )}
      
      {badge && !isLoading && (
        <span className={`
          absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full
          bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg
          animate-pulse
        `}>
          {badge}
        </span>
      )}
    </motion.button>
  );
};

// 2.2 Divider
const Divider: React.FC<{ text?: string }> = ({ text = 'ou' }) => (
  <div className="relative flex items-center py-2">
    <div className="flex-1 border-t border-white/10" />
    <span className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">
      {text}
    </span>
    <div className="flex-1 border-t border-white/10" />
  </div>
);

// 2.3 Branding
const Branding: React.FC = () => (
  <div className="flex items-center justify-center space-x-2">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
      <Sparkles className="w-4 h-4 text-white" />
    </div>
    <span className="text-sm font-bold text-white/90 tracking-tight">Bavel</span>
    <span className="text-[10px] font-bold text-rose-400/70 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
      🇨🇮
    </span>
  </div>
);

// 2.4 Trust Badges
const TrustBadges: React.FC = () => (
  <div className="flex items-center justify-center space-x-4 text-[10px] text-white/40">
    <div className="flex items-center space-x-1.5">
      <Shield className="w-3 h-3 text-emerald-400" />
      <span>Sécurisé</span>
    </div>
    <div className="w-px h-3 bg-white/10" />
    <div className="flex items-center space-x-1.5">
      <div className="w-3 h-3 text-rose-400">🔒</div>
      <span>Confidentiel</span>
    </div>
    <div className="w-px h-3 bg-white/10" />
    <div className="flex items-center space-x-1.5">
      <div className="w-3 h-3 text-amber-400">✓</div>
      <span>Vérifié</span>
    </div>
  </div>
);

// 2.5 Loading Skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3 w-full">
    <div className="w-full h-12 rounded-2xl bg-white/5 animate-pulse" />
    <div className="w-full h-12 rounded-2xl bg-white/5 animate-pulse delay-150" />
    <div className="w-full h-12 rounded-2xl bg-white/5 animate-pulse delay-300" />
  </div>
);

// ============================================
// 3. COMPOSANT PRINCIPAL
// ============================================

export const AuthMain: React.FC<AuthMainProps> = ({
  onEmail,
  onGoogle,
  isLoading = false,
  error = null,
  isGoogleLoading = false,
  variant = 'default',
  showBranding = true,
  showDivider = true,
  className = '',
}) => {
  // ============================================
  // 3.1 VARIANTES
  // ============================================

  const variants = {
    default: {
      container: 'space-y-6',
      title: 'text-2xl',
      subtitle: 'text-xs',
    },
    compact: {
      container: 'space-y-4',
      title: 'text-xl',
      subtitle: 'text-[11px]',
    },
    full: {
      container: 'space-y-8',
      title: 'text-3xl',
      subtitle: 'text-sm',
    },
  };

  const currentVariant = variants[variant] || variants.default;

  // ============================================
  // 3.2 RENDU
  // ============================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`
        flex flex-col items-center justify-center 
        max-w-sm mx-auto w-full my-auto py-4
        ${className}
      `}
    >
      {/* ========================================== */}
      {/* BRANDING */}
      {/* ========================================== */}
      {showBranding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-4"
        >
          <Branding />
        </motion.div>
      )}

      {/* ========================================== */}
      {/* TITRE & SOUS-TITRE */}
      {/* ========================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-center space-y-2 mb-2"
      >
        <h1 className={`
          font-bold text-white tracking-tight
          ${currentVariant.title}
        `}>
          {variant === 'compact' ? 'Bienvenue' : 'Rencontres authentiques'}
        </h1>
        <p className={`
          text-white/70 max-w-[280px] mx-auto leading-relaxed
          ${currentVariant.subtitle}
        `}>
          {variant === 'compact' 
            ? 'Connectez-vous pour continuer' 
            : 'Trouvez des personnes réelles à proximité et commencez à discuter.'
          }
        </p>
      </motion.div>

      {/* ========================================== */}
      {/* ERREUR */}
      {/* ========================================== */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <AuthError message={error} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* BOUTONS */}
      {/* ========================================== */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`
            w-full 
            ${currentVariant.container}
          `}
        >
          {/* Google */}
          <AuthButton
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            }
            label="Continuer avec Google"
            onClick={onGoogle}
            disabled={isLoading || isGoogleLoading}
            isLoading={isGoogleLoading}
            variant="primary"
            size={variant === 'compact' ? 'sm' : 'md'}
            badge="Populaire"
          />

          {/* Divider */}
          {showDivider && <Divider />}

          {/* Email */}
          <AuthButton
            icon={<Mail className="w-5 h-5 text-rose-400" />}
            label="Continuer avec un e-mail"
            onClick={onEmail}
            disabled={isLoading}
            variant="secondary"
            size={variant === 'compact' ? 'sm' : 'md'}
          />

          {/* ========================================== */}
          {/* TRUST BADGES */}
          {/* ========================================== */}
          {variant !== 'compact' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-4"
            >
              <TrustBadges />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ========================================== */}
      {/* FOOTER TEXTE */}
      {/* ========================================== */}
      {variant !== 'compact' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] text-white/30 text-center mt-6 max-w-[280px] leading-relaxed"
        >
          En continuant, vous acceptez nos{' '}
          <button className="text-white/50 hover:text-white/80 underline transition-colors">
            Conditions d'utilisation
          </button>{' '}
          et notre{' '}
          <button className="text-white/50 hover:text-white/80 underline transition-colors">
            Politique de confidentialité
          </button>
        </motion.p>
      )}

      {/* ========================================== */}
      {/* ANIMATION D'ENTRÉE */}
      {/* ========================================== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
        className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none"
      >
        <div className="flex items-center space-x-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce delay-75" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce delay-150" />
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// 4. EXPORT PAR DÉFAUT
// ============================================

export default AuthMain;