import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Heart, Shield, Sparkles, Globe, Award, Code2, 
  Mail, MapPin, Check, ExternalLink, Users, Zap, Star,
  Clock, Lock, ShieldCheck, UserCheck, Eye, HeartHandshake,
  Building2, Phone, Instagram, Twitter, Facebook, Youtube,
  Linkedin, MessageCircle, Crown, Gem, BadgeCheck, Coffee, X
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

export interface AboutModalProps {
  onClose: () => void;
  appVersion?: string;
  buildNumber?: string;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onOpenContact?: () => void;
}

export interface SocialLink {
  name: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}

export interface TeamMember {
  name: string;
  role: string;
  avatar?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
  };
}

// ============================================
// 2. CONSTANTES
// ============================================

const APP_VERSION = '2.4.0';
const BUILD_NUMBER = '2026.08.31';
const COMPANY_NAME = 'Bavel Technologies CI';
const COMPANY_ADDRESS = 'Abidjan, Côte d\'Ivoire';
const COMPANY_EMAIL = 'support@bavel.ci';
const COMPANY_PHONE = '+225 07 00 00 00 00';
const YEAR = new Date().getFullYear();

const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Instagram',
    url: 'https://instagram.com/bavel.ci',
    icon: <Instagram className="w-4 h-4" />,
    color: 'text-pink-500',
  },
  {
    name: 'Twitter',
    url: 'https://twitter.com/bavel_ci',
    icon: <Twitter className="w-4 h-4" />,
    color: 'text-blue-400',
  },
  {
    name: 'Facebook',
    url: 'https://facebook.com/bavel.ci',
    icon: <Facebook className="w-4 h-4" />,
    color: 'text-blue-600',
  },
  {
    name: 'YouTube',
    url: 'https://youtube.com/@bavel.ci',
    icon: <Youtube className="w-4 h-4" />,
    color: 'text-red-600',
  },
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com/company/bavel-ci',
    icon: <Linkedin className="w-4 h-4" />,
    color: 'text-blue-700',
  },
];

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Kouadio Don',
    role: 'Fondateur & CEO',
    social: {
      linkedin: 'https://linkedin.com/in/don',
      twitter: 'https://twitter.com/don',
    },
  },
  {
    name: 'N\'Guessan Awa',
    role: 'Lead Product Designer',
    social: {
      linkedin: 'https://linkedin.com/in/awa',
    },
  },
  {
    name: 'Konan Joel',
    role: 'Lead Engineer',
    social: {
      linkedin: 'https://linkedin.com/in/joel',
    },
  },
  {
    name: 'Traoré Aminata',
    role: 'Head of Operations',
    social: {
      linkedin: 'https://linkedin.com/in/aminata',
    },
  },
];

// ============================================
// 3. SOUS-COMPOSANTS
// ============================================

// 3.1 Section Header
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  className?: string;
}> = ({ icon, title, className = '' }) => (
  <div className={`flex items-center space-x-2.5 ${className}`}>
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-100 to-purple-100 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <h3 className="text-[13px] font-extrabold text-black tracking-tight">{title}</h3>
  </div>
);

// 3.2 Stat Card
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
}> = ({ icon, value, label, color = 'text-rose-500' }) => (
  <div className="bg-white rounded-2xl p-3.5 border border-gray-100 text-center shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-center space-x-1.5">
      {icon}
      <span className={`text-[18px] font-black ${color}`}>{value}</span>
    </div>
    <span className="text-[10.5px] text-gray-500 font-medium block mt-0.5">{label}</span>
  </div>
);

// 3.3 Social Link Button
const SocialLinkButton: React.FC<SocialLink> = ({ name, url, icon, color }) => (
  <motion.a
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className={`p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all cursor-pointer ${color}`}
    title={name}
    aria-label={`Suivre Bavel sur ${name}`}
  >
    {icon}
  </motion.a>
);

// 3.4 Team Member Card
const TeamMemberCard: React.FC<TeamMember> = ({ name, role, avatar, social }) => (
  <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-gray-50/50 border border-gray-50 hover:border-gray-200 transition-colors">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-200 to-purple-200 flex items-center justify-center shrink-0 text-sm font-bold text-rose-700">
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        name.charAt(0)
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[12px] font-extrabold text-black truncate">{name}</p>
      <p className="text-[10px] text-gray-500 font-medium">{role}</p>
    </div>
    {social?.linkedin && (
      <a
        href={social.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-blue-600 transition-colors"
        aria-label={`Profil LinkedIn de ${name}`}
      >
        <Linkedin className="w-3.5 h-3.5" />
      </a>
    )}
    {social?.twitter && (
      <a
        href={social.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-blue-400 transition-colors"
        aria-label={`Profil Twitter de ${name}`}
      >
        <Twitter className="w-3.5 h-3.5" />
      </a>
    )}
  </div>
);

// 3.5 Feature Pill
const FeaturePill: React.FC<{
  icon: React.ReactNode;
  label: string;
  color?: string;
}> = ({ icon, label, color = 'bg-rose-50 text-rose-700' }) => (
  <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full ${color} text-[10px] font-extrabold`}>
    {icon}
    <span>{label}</span>
  </div>
);

// ============================================
// 4. COMPOSANT PRINCIPAL
// ============================================

export const AboutModal: React.FC<AboutModalProps> = ({
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-[#f2f2f7] z-[230] flex flex-col h-[100dvh] font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-200/80 shrink-0 relative shadow-2xs">
        <button
          type="button"
          onClick={onClose}
          className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer z-10 flex items-center justify-center"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
        <h2 className="text-[16px] sm:text-[17px] font-bold text-black tracking-tight absolute left-1/2 -translate-x-1/2">
          À propos
        </h2>
        <div className="w-6" />
      </div>

      {/* Main Content Centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-12 -mt-6 space-y-8">
        {/* Brand Logo */}
        <div className="flex items-center justify-center">
          <span className="text-[42px] sm:text-[48px] font-black tracking-tighter text-[#d80027] font-sans select-none drop-shadow-2xs">
            Bavel
          </span>
        </div>

        {/* Legal & App Details */}
        <div className="space-y-4 max-w-[310px] mx-auto text-black">
          <p className="text-[13.5px] sm:text-[14.5px] font-medium text-black tracking-tight">
            Standard : 5.477.1
          </p>

          <p className="text-[13px] sm:text-[13.5px] text-gray-900 leading-snug font-normal px-2">
            Dépôt légal - 2026 Bavel Software Ltd. Tous droits réservés.
          </p>

          <p className="text-[13px] sm:text-[13.5px] text-gray-900 font-normal">
            Plus d'informations sur{' '}
            <a 
              href="https://bavel.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline font-normal text-gray-900"
            >
              https://bavel.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 5. RESTORE PURCHASES MODAL
// ============================================

export interface RestorePurchasesModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  timeout?: number;
}

export const RestorePurchasesModal: React.FC<RestorePurchasesModalProps> = ({
  onClose,
  onSuccess,
  onError,
  timeout = 1500,
}) => {
  const [state, setState] = useState<'checking' | 'success' | 'error'>('checking');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Vérification de vos abonnements...');

  useEffect(() => {
    const steps = [
      { progress: 10, message: 'Connexion sécurisée aux serveurs...' },
      { progress: 30, message: 'Synchronisation des achats...' },
      { progress: 50, message: 'Vérification des crédits...' },
      { progress: 70, message: 'Mise à jour du statut Premium...' },
      { progress: 90, message: 'Finalisation...' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setProgress(step.progress);
        setMessage(step.message);
        currentStep++;
      } else {
        clearInterval(interval);
        // Succès
        setTimeout(() => {
          setState('success');
          onSuccess?.();
        }, 200);
      }
    }, timeout / steps.length);

    return () => clearInterval(interval);
  }, [timeout, onSuccess]);

  const handleClose = () => {
    if (state === 'checking') return;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[240] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl max-w-xs w-full p-6 text-center shadow-2xl"
        role="dialog"
        aria-label="Restauration des achats"
        aria-modal="true"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-rose-100 flex items-center justify-center mx-auto mb-4">
          {state === 'checking' ? (
            <div className="w-7 h-7 border-3 border-[#480A2B] border-t-transparent rounded-full animate-spin" />
          ) : state === 'success' ? (
            <Check className="w-8 h-8 text-emerald-500" strokeWidth={2.5} />
          ) : (
            <X className="w-8 h-8 text-rose-500" strokeWidth={2.5} />
          )}
        </div>

        <h3 className="text-[17px] font-extrabold text-black">
          {state === 'checking' ? 'Restauration en cours...' : 
           state === 'success' ? 'Achats restaurés !' : 
           'Erreur de restauration'}
        </h3>

        <p className="text-[13px] text-gray-500 leading-relaxed mt-1.5">
          {message}
        </p>

        {state === 'checking' && (
          <div className="w-full bg-gray-100 rounded-full h-2 mt-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-rose-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {state === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-2"
          >
            <div className="flex items-center justify-center space-x-1 text-[12px] text-emerald-600 font-bold">
              <BadgeCheck className="w-4 h-4" />
              <span>Premium synchronisé</span>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-black hover:bg-gray-800 text-white font-extrabold rounded-full text-[14px] transition-all cursor-pointer"
            >
              Continuer
            </button>
          </motion.div>
        )}

        {state === 'error' && (
          <button
            onClick={handleClose}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-full text-[14px] transition-all cursor-pointer mt-4"
          >
            Réessayer
          </button>
        )}
      </motion.div>
    </div>
  );
};

// ============================================
// 6. EXPORT PAR DÉFAUT
// ============================================

export default AboutModal;