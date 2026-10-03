import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { updatePassword, getSupabase } from '../../lib/supabase';

interface ResetPasswordModalProps {
  onComplete: () => void;
}

export function ResetPasswordModal({ onComplete }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas');
      return;
    }
    
    setErrorMsg('');
    setIsLoading(true);

    const res = await updatePassword(newPassword);
    
    setIsLoading(false);
    
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setIsSuccess(true);
      // Clean up the URL hash so it doesn't trigger again
      window.location.hash = '';
      
      // Sign out immediately so user can log in with new password
      const client = getSupabase();
      if (client) {
        await client.auth.signOut();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 z-[9999] select-none font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[360px] bg-gradient-to-b from-[#1a0836] to-[#0d021c] p-6 rounded-[28px] shadow-2xl border border-white/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/10 blur-3xl pointer-events-none" />

        {isSuccess ? (
          <div className="flex flex-col items-center text-center py-6 relative z-10">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Mot de passe modifié !</h2>
            <p className="text-white/60 mb-6 text-sm">
              Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
            </p>
            <button 
              onClick={onComplete}
              className="w-full py-3.5 rounded-2xl font-bold text-[15px] bg-white text-black shadow-lg"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            
            <h2 className="text-xl font-bold text-white text-center mb-1">Nouveau mot de passe</h2>
            <p className="text-white/60 text-center text-sm mb-6">
              Veuillez saisir votre nouveau mot de passe ci-dessous.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] px-3 py-2 rounded-xl text-center">
                  {errorMsg}
                </div>
              )}

              <div>
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3.5 rounded-xl text-[15px] placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3.5 rounded-xl text-[15px] placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-white text-black shadow-lg mt-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoading ? 'Modification...' : 'Enregistrer'}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
