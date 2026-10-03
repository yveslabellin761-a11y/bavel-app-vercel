import React from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, FileText } from 'lucide-react';

export const AuthLegalModal: React.FC<{
  type: 'terms' | 'privacy';
  onClose: () => void;
}> = ({ type, onClose }) => {
  const isTerms = type === 'terms';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[210] flex items-center justify-center p-4"
    >
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full text-white relative space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            {isTerms ? (
              <FileText className="w-5 h-5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="text-base font-bold">
              {isTerms ? "Conditions d'Utilisation" : "Politique de Confidentialité"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 text-xs text-white/80 leading-relaxed pr-2 scrollbar-hide">
          {isTerms ? (
            <>
              <p>Welcome to Bavel. En utilisant Bavel, vous acceptez nos règles d'utilisation :</p>
              <ul className="list-disc pl-4 space-y-1 text-white/70">
                <li>Respect mutuel et courtoisie entre tous les membres.</li>
                <li>Profils authentiques uniquement (fausses identités interdites).</li>
                <li>Comportement inapproprié ou harcèlement entraînera la suspension immédiate du compte.</li>
                <li>L'âge minimum requis pour s'inscrire est de 18 ans.</li>
              </ul>
            </>
          ) : (
            <>
              <p>Protection de vos données personnelles sur Bavel :</p>
              <ul className="list-disc pl-4 space-y-1 text-white/70">
                <li>Vos données ne sont jamais vendues à des tiers.</li>
                <li>La géolocalisation sert uniquement à calculer les distances entre membres.</li>
                <li>Vos photos et messages sont cryptés et sécurisés.</li>
                <li>Vous pouvez supprimer votre compte et vos données à tout moment depuis vos réglages.</li>
              </ul>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#e20030] py-2.5 rounded-xl text-xs font-bold hover:bg-[#c10028] transition-all cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </motion.div>
  );
};
