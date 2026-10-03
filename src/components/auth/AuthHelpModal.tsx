import React from 'react';
import { motion } from 'motion/react';
import { X, HelpCircle, Shield, Mail } from 'lucide-react';

export const AuthHelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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

        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-[#e20030]" />
          <h3 className="text-base font-bold">Besoin d'aide pour la connexion ?</h3>
        </div>

        <div className="space-y-3 text-xs text-white/80 leading-relaxed">
          <div className="p-3 bg-white/5 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 font-semibold text-white">
              <Mail className="w-4 h-4 text-rose-400" />
              <span>Pas de compte ?</span>
            </div>
            <p className="text-[11px] text-white/60">
              Inscrivez-vous avec Google, Facebook ou votre adresse e-mail.
            </p>
          </div>

          <div className="p-3 bg-white/5 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 font-semibold text-white">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Sécurité des données</span>
            </div>
            <p className="text-[11px] text-white/60">
              Vos informations personnelles et photos restent strictement confidentielles.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#e20030] py-2.5 rounded-xl text-xs font-bold hover:bg-[#c10028] transition-all cursor-pointer"
        >
          Compris
        </button>
      </div>
    </motion.div>
  );
};
