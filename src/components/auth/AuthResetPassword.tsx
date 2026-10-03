import React from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, X, Check, ArrowRight } from 'lucide-react';
import { AuthError } from './shared/AuthError';

interface AuthResetPasswordProps {
  email: string;
  setEmail: (val: string) => void;
  step: 'request' | 'email_sent' | 'enter_new_password' | 'done';
  setStep?: (step: 'request' | 'email_sent' | 'enter_new_password' | 'done') => void;
  newPassword?: string;
  setNewPassword?: (val: string) => void;
  confirmNewPassword?: string;
  setConfirmNewPassword?: (val: string) => void;
  requestReset: () => void;
  updatePassword?: () => void;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export const AuthResetPassword: React.FC<AuthResetPasswordProps> = ({
  email,
  setEmail,
  step,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  requestReset,
  updatePassword,
  isLoading,
  error,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[210] flex items-center justify-center p-4"
    >
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-white relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold">Réinitialisation du mot de passe</h3>

        <AuthError message={error} />

        {step === 'request' && (
          <div className="space-y-4">
            <p className="text-xs text-white/70">
              Saisissez votre e-mail pour recevoir un lien de réinitialisation.
            </p>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#e20030]"
              />
            </div>
            <button
              onClick={requestReset}
              disabled={isLoading}
              className="w-full bg-[#e20030] font-bold py-3 px-4 rounded-xl text-sm hover:bg-[#c10028] transition-all cursor-pointer"
            >
              Envoyer le lien
            </button>
          </div>
        )}

        {step === 'email_sent' && (
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold">E-mail envoyé !</p>
            <p className="text-xs text-white/70">
              Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-white/10 py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-white/20 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {step === 'enter_new_password' && (
          <div className="space-y-3">
            <p className="text-xs text-white/70">Saisissez votre nouveau mot de passe.</p>
            <input
              type="password"
              value={newPassword || ''}
              onChange={(e) => setNewPassword?.(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white"
            />
            <input
              type="password"
              value={confirmNewPassword || ''}
              onChange={(e) => setConfirmNewPassword?.(e.target.value)}
              placeholder="Confirmer le nouveau mot de passe"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white"
            />
            <button
              onClick={updatePassword}
              disabled={isLoading}
              className="w-full bg-[#e20030] font-bold py-3 px-4 rounded-xl text-sm cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-3 py-2">
            <p className="text-sm font-semibold text-emerald-400">Mot de passe mis à jour !</p>
            <button
              onClick={onClose}
              className="w-full bg-white/10 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/20 cursor-pointer"
            >
              Continuer
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
