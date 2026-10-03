import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Écran de chargement réutilisable et adapté au mobile
export const LoadingScreen: React.FC<{ message?: string }> = ({ 
  message = "Vérification des droits d'accès..." 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] h-full p-6 text-center select-none">
    <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4 border border-purple-100 shadow-xs">
      <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
    </div>
    <h3 className="text-[16px] font-bold text-slate-900 mb-1">{message}</h3>
    <p className="text-[13px] text-slate-500 max-w-[260px] leading-relaxed">
      Sécurisation de la session et validation de votre rôle en cours...
    </p>
  </div>
);

// Modal d'accès refusé pour les utilisateurs non-administrateurs
export const AccessDeniedModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  requiredRole?: string;
}> = ({ isOpen, onClose, requiredRole = "Administrateur" }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl border border-rose-100 relative"
        >
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4 border border-rose-100 shadow-xs">
            <ShieldAlert className="w-7 h-7 stroke-[2.2]" />
          </div>

          <span className="text-[11px] font-extrabold tracking-wider uppercase text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 inline-block mb-2">
            Accès Refusé
          </span>

          <h3 className="text-[18px] font-black text-slate-900 mb-2">
            Espace {requiredRole} Strict
          </h3>

          <p className="text-[13px] text-slate-600 mb-6 leading-relaxed">
            Votre compte ne dispose pas des privilèges requis pour accéder au Back-Office d'administration.
          </p>

          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-[14px] shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'application</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// 🔒 1. Protecteur pour l'Espace Utilisateur Standard
export function UserProtectedRoute({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return fallback ? <>{fallback}</> : (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-slate-600" />
        </div>
        <h4 className="text-[16px] font-bold text-slate-900 mb-1">Connexion requise</h4>
        <p className="text-[13px] text-slate-500">Veuillez vous inscrire ou vous connecter pour accéder à cette page.</p>
      </div>
    );
  }

  return <>{children}</>;
}

// 🔐 2. Protecteur pour le Back-Office Administrateur (Strictement Admin)
export function AdminProtectedRoute({ 
  children, 
  onDenied 
}: { 
  children: React.ReactNode; 
  onDenied?: () => void;
}) {
  const { user, userRole, isAdmin, loading } = useAuth();
  const [deniedModalOpen, setDeniedModalOpen] = useState(false);

  if (loading) return <LoadingScreen message="Vérification des droits Administrateur..." />;

  const isAuthorized = isAdmin || userRole === 'admin';

  if (!isAuthorized) {
    return (
      <>
        <AccessDeniedModal 
          isOpen={true} 
          onClose={() => {
            setDeniedModalOpen(false);
            onDenied?.();
          }} 
          requiredRole="Administrateur"
        />
        <div className="p-8 text-center text-slate-500">
          <p>Accès restreint au Back-Office Bavel.</p>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
