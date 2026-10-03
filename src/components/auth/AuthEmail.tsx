import React from 'react';
import { motion } from 'motion/react';
import { Mail, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { EmailTab } from '../../types';
import { AuthInput } from './shared/AuthInput';
import { AuthButton } from './shared/AuthButton';
import { PasswordStrength } from './shared/PasswordStrength';

interface AuthEmailProps {
  tab: EmailTab;
  onTabChange: (tab: EmailTab) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (confirm: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  onSubmit: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onForgotPassword: () => void;
  isLoading: boolean;
  error: string | null;
}

export const AuthEmail: React.FC<AuthEmailProps> = ({
  tab,
  onTabChange,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  rememberMe,
  setRememberMe,
  onSubmit,
  onForgotPassword,
  isLoading,
  error,
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-[340px] mx-auto flex flex-col"
    >
      {/* Email Tab Switcher */}
      <div className="flex bg-white/10 p-1 rounded-xl mb-4 border border-white/10">
        {(['login', 'signup'] as EmailTab[]).map((tabOption) => (
          <button
            key={tabOption}
            onClick={() => { onTabChange(tabOption); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              tab === tabOption
                ? 'bg-white text-slate-900 shadow'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {tabOption === 'login' ? 'Se connecter' : 'S\'inscrire'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthInput
          type="email"
          label="Adresse e-mail"
          placeholder="nom@exemple.com"
          value={email}
          onChange={setEmail}
          autoFocus
        />

        <AuthInput
          type={showPassword ? 'text' : 'password'}
          label="Mot de passe"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-white/60 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        {tab === 'signup' && (
          <>
            <AuthInput
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirmation du mot de passe"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={setConfirmPassword}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            
            {password && <PasswordStrength password={password} />}
          </>
        )}

        {tab === 'login' && (
          <div className="flex items-center justify-between text-xs sm:text-[13px] pt-1">
            <label className="flex items-center space-x-2 cursor-pointer text-white/90 hover:text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/30 bg-white/10 text-purple-500 focus:ring-0 w-4 h-4 accent-purple-500 cursor-pointer"
              />
              <span>Se souvenir de moi</span>
            </label>

            <button
              type="button"
              onClick={onForgotPassword}
              className="text-purple-300 hover:text-purple-200 font-medium hover:underline transition-colors cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col space-y-2 text-rose-300 text-xs sm:text-sm font-medium bg-rose-500/15 p-3 rounded-xl border border-rose-500/30"
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes("inscrire") && tab === 'login' && (
              <button
                type="button"
                onClick={() => {
                  onTabChange('signup');
                }}
                className="text-white bg-rose-500/40 hover:bg-rose-500/60 border border-rose-500/50 rounded-lg py-1.5 px-3 font-bold text-xs transition-colors mt-1 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>S'inscrire maintenant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}

        <AuthButton
          type="submit"
          label={tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
          isLoading={isLoading}
          disabled={isLoading}
          fullWidth
          variant="primary"
        />
      </form>
    </motion.div>
  );
};