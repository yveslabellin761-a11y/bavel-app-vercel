import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, Shield, ShieldCheck, ShieldAlert, Lock, Smartphone, Laptop, 
  Key, RefreshCw, CheckCircle2, AlertTriangle, UserCheck, Eye, EyeOff, Radio,
  LogOut, Bell, History, Info
} from 'lucide-react';
import { triggerHaptic } from '../../utils/audio';
import { authFetch } from '../../lib/authFetch';

interface SecurityDashboardModalProps {
  onClose: () => void;
  userEmail?: string;
}

export function SecurityDashboardModal({ onClose, userEmail = 'utilisateur@lovel.ci' }: SecurityDashboardModalProps) {
  const [loading, setLoading] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [antiScamShield, setAntiScamShield] = useState(true);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [revoking, setRevoking] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    triggerHaptic('light');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchSecurityData = async () => {
    try {
      const res = await authFetch('/api/security/audit');
      const data = await res.json();
      if (data?.data) {
        setTwoFactor(Boolean(data.data.twoFactorEnabled));
        setAntiScamShield(Boolean(data.data.antiScamShield));
        setActiveSessions(data.data.activeSessions || []);
        setSecurityLogs(data.data.securityLogs || []);
      }
    } catch (e) {
      console.warn('Failed to load security audit from API:', e);
      showToast('Journal de sécurité indisponible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleToggle2FA = async () => {
    const nextState = !twoFactor;
    setTwoFactor(nextState);
    showToast(nextState ? 'Double authentification activée' : 'Double authentification désactivée');
    try {
      const response = await authFetch('/api/security/2fa/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, enabled: nextState })
      });
      if (!response.ok) throw new Error('Sauvegarde 2FA impossible');
      await fetchSecurityData();
    } catch (e) {
      setTwoFactor(!nextState);
      showToast('Impossible de sauvegarder la 2FA');
    }
  };

  const handleToggleShield = async () => {
    const nextState = !antiScamShield;
    setAntiScamShield(nextState);
    showToast(nextState ? 'Bouclier anti-brouteurs activé' : 'Bouclier anti-brouteurs désactivé');
    try {
      const response = await authFetch('/api/security/anti-scam-shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, enabled: nextState })
      });
      if (!response.ok) throw new Error('Sauvegarde du bouclier impossible');
    } catch (e) {
      setAntiScamShield(!nextState);
      showToast('Impossible de sauvegarder le bouclier anti-arnaque');
    }
  };

  const handleRevokeOthers = async () => {
    setRevoking(true);
    triggerHaptic('medium');
    try {
      const response = await authFetch('/api/security/revoke-others', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      if (!response.ok) throw new Error('Révocation impossible');
      setActiveSessions(prev => prev.filter(s => s.isCurrent));
      showToast('Toutes les autres sessions ont été révoquées avec succès');
      fetchSecurityData();
    } catch (e) {
      showToast('Impossible de révoquer les autres sessions');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f4f5f8] z-[230] flex flex-col h-[100dvh] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 pb-3 px-4 bg-white border-b border-gray-100 shrink-0 relative">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer z-10"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
        <div className="flex items-center space-x-1.5 absolute left-1/2 -translate-x-1/2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-[16px] font-bold text-black tracking-tight">Centre de Sécurité</h2>
        </div>
        <div className="w-6" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12 scrollbar-hide">
        {/* Security Health Score Banner */}
        <div className="bg-gradient-to-br from-[#111] to-[#2a2a2a] text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-[20px]">🛡️</span>
              <span className="text-[14px] font-black tracking-wide uppercase text-emerald-400">Score de Protection : 100%</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
              Sécurisé
            </div>
          </div>
          <h3 className="text-[17px] font-extrabold text-white leading-snug mb-1">
            Votre compte est blindé contre les attaques
          </h3>
          <p className="text-[12.5px] text-gray-300 leading-relaxed font-normal">
            Chiffrement SSL 256 bits, filtrage des brouteurs en temps réel, et protection contre les connexions non autorisées.
          </p>
        </div>

        {/* Section 1: Anti-Scam Shield */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[14.5px] font-extrabold text-black">Bouclier Anti-Brouteurs</h4>
                <p className="text-[11.5px] text-gray-500">Bloque automatiquement les demandes d'argent suspectes</p>
              </div>
            </div>
            <button
              onClick={handleToggleShield}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-hidden shrink-0 ${
                antiScamShield ? 'bg-[#30d158]' : 'bg-[#e9e9eb]'
              }`}
            >
              <div
                className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                  antiScamShield ? 'translate-x-[22px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 2: Two-Factor Authentication */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[14.5px] font-extrabold text-black">Double Authentification (2FA)</h4>
                <p className="text-[11.5px] text-gray-500">Code de vérification sécurisé à chaque nouvelle connexion</p>
              </div>
            </div>
            <button
              onClick={handleToggle2FA}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative duration-200 focus:outline-hidden shrink-0 ${
                twoFactor ? 'bg-[#30d158]' : 'bg-[#e9e9eb]'
              }`}
            >
              <div
                className={`w-[27px] h-[27px] rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                  twoFactor ? 'translate-x-[22px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 3: Active Connected Devices */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-gray-700" />
              <h4 className="text-[14px] font-extrabold text-black">Appareils et sessions actives</h4>
            </div>
            {activeSessions.length > 1 && (
              <button
                onClick={handleRevokeOthers}
                disabled={revoking}
                className="text-[11.5px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {revoking ? 'Fermeture...' : 'Déconnecter les autres'}
              </button>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-start justify-between p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="flex items-start space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center mt-0.5">
                    {session.isCurrent ? <Smartphone className="w-4 h-4 text-emerald-600" /> : <Laptop className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[13px] font-bold text-black">{session.device}</span>
                      {session.isCurrent && (
                        <span className="text-[9.5px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm">
                          Cet appareil
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{session.location} • IP: {session.ip}</p>
                    <p className="text-[10px] text-gray-400">Actif : {session.lastActive}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Security Incident & Audit Log */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-2.5">
            <History className="w-4 h-4 text-gray-700" />
            <h4 className="text-[14px] font-extrabold text-black">Journal d'audit de sécurité</h4>
          </div>

          <div className="space-y-2 pt-1">
            {securityLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="flex items-start space-x-2.5 text-left p-2 rounded-xl bg-gray-50/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-black leading-snug">{log.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} • IP {log.ip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-6 left-4 right-4 bg-black text-white text-xs font-bold py-3 px-4 rounded-xl shadow-xl flex items-center space-x-2 z-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
