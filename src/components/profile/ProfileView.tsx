import React, { useState, useEffect } from 'react';
import { 
  Heart, MessageSquare, Star, AlertCircle, Ban, ChevronLeft, Camera, 
  Check, Shield, Sparkles, User, MapPin, Briefcase, Calendar, 
  Compass, Eye, Award, Smile, RefreshCw, X, FileText, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { Profile, User as UserType } from '../../types';
import { getProfileImages } from '../../utils/profileImages';
import { getProfileIdNumber } from '../../utils/idGenerator';
import { authFetch } from '../../lib/authFetch';

interface ProfileViewProps {
  profile: Profile;
  currentUser: UserType;
  onBack: () => void;
  onLike: (profile: Profile) => void;
  onMessage: (profileId: string) => void;
  similarProfiles: Profile[];
  onSelectProfile?: (profile: Profile) => void;
  onToggleFavorite?: (id: string) => void;
  favoriteIds?: string[];
  likedIds?: string[];
  blacklistIds?: string[];
  onToggleBlacklist?: (id: string) => void;
  onSuperLike?: () => void;
}

export default function ProfileView({ 
  profile, 
  currentUser, 
  onBack, 
  onLike, 
  onMessage, 
  similarProfiles,
  onSelectProfile,
  onToggleFavorite,
  favoriteIds = [],
  likedIds = [],
  blacklistIds = [],
  onToggleBlacklist,
  onSuperLike
}: ProfileViewProps) {
  const [isSticky, setIsSticky] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const isUnlocked = false;
  const [toastText, setToastText] = useState<string | null>(null);

  const showToast = (msg: string, type?: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText(null);
    }, 3000);
  };
  const [showAbuseModal, setShowAbuseModal] = useState(false);
  const [abuseReason, setAbuseReason] = useState('');
  const [abuseSuccess, setAbuseSuccess] = useState(false);

  // AI Matching States
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<{score: number | null, reason: string} | null>(null);

  const handleAnalyzeMatch = async () => {
    setIsMatchLoading(true);
    try {
      const res = await authFetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile: currentUser, targetProfile: profile })
      });
      if (!res.ok) throw new Error(`Calcul de compatibilité indisponible (${res.status})`);
      const data = await res.json();
      setMatchAnalysis(data);
    } catch (e) {
      console.error("Match error", e);
      showToast("Le calcul de compatibilité est momentanément indisponible.", "error");
    } finally {
      setIsMatchLoading(false);
    }
  };

  // Get stable high-quality images for this profile
  const profileImages = getProfileImages(profile);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleReportAbuse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!abuseReason.trim()) return;
    setAbuseSuccess(true);
    setTimeout(() => {
      setShowAbuseModal(false);
      setAbuseSuccess(false);
      setAbuseReason('');
    }, 2000);
  };

  const renderComparisonRow = (
    label: string, 
    value1: string, 
    value2: string, 
    matchStatus: 'match' | 'no-match' | 'neutral' = 'neutral',
    icon?: React.ReactNode
  ) => {
    const statusBg = 
      matchStatus === 'match' 
        ? 'bg-green-50 border-green-200 text-green-800' 
        : matchStatus === 'no-match' 
          ? 'bg-red-50 border-red-200 text-red-800' 
          : 'bg-gray-50 border-gray-100 text-gray-700';

    return (
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr_1fr] border-b border-gray-100 hover:bg-gray-50/50 transition">
        {/* Label Column */}
        <div className="py-3 px-4 text-xs font-bold text-gray-700 flex items-center space-x-2 bg-gray-50/30">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span>{label}</span>
        </div>
        
        {/* Value 1 Column (Profile response) */}
        <div className="py-3 px-4 text-sm text-gray-800 flex items-center">
          <div className="flex items-center space-x-2 w-full">
            <span className="font-medium">{value1}</span>
            {matchStatus === 'match' && (
              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-auto">
                Compatible
              </span>
            )}
          </div>
        </div>
        
        {/* Value 2 Column (What they look for) */}
        <div className="py-3 px-4 text-sm text-gray-500 bg-gray-50/10 flex items-center border-t sm:border-t-0 border-gray-100">
          <span className="italic text-xs">{value2}</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full bg-slate-50/80 min-h-screen pb-24 relative" 
      id="profile-detail-root"
    >
      {/* Sticky Top Bar for scroll context */}
      <div className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-40 border-b border-gray-100 transition-all duration-300 ${isSticky ? 'translate-y-[60px] opacity-100 shadow-md' : '-translate-y-full opacity-0'}`}>
        <div className="w-full max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
             <img src={profile.avatarUrl} alt={profile.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-[#cd6d7d]/20" />
             <div>
               <div className="flex items-center space-x-1.5">
                 <h2 className="text-base font-bold text-gray-900 leading-none">{profile.name}</h2>
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
               </div>
               <p className="text-xs text-gray-500 mt-1">{profile.age} ans • {profile.city}</p>
             </div>
          </div>
          
          <div className="flex items-center space-x-2">
             <button 
               onClick={() => onLike(profile)} 
               className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-sm cursor-pointer ${likedIds.includes(profile.id) ? 'bg-rose-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
             >
               <Heart className={`w-4.5 h-4.5 ${likedIds.includes(profile.id) ? 'fill-current' : ''}`} />
             </button>
             <button 
               onClick={() => onMessage(profile.id)} 
               className="w-9 h-9 rounded-full bg-[#9c1f35] hover:bg-[#83192c] flex items-center justify-center text-white transition shadow-sm cursor-pointer"
             >
               <MessageSquare className="w-4.5 h-4.5" />
             </button>
          </div>
        </div>
      </div>

      {/* Back to Results Navigation */}
      <div className="w-full max-w-[1200px] mx-auto px-4 pt-6 pb-4">
        <button 
          onClick={onBack} 
          className="inline-flex items-center text-gray-600 hover:text-[#9c1f35] transition text-sm font-semibold cursor-pointer group"
        >
          <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" /> 
          Retour aux Résultats
        </button>
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-4 flex flex-col lg:flex-row gap-8 relative">
        
        {/* ================= LEFT COLUMN: Photos & Fast facts ================= */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-6">
          
          {/* High-end interactive photo container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="relative w-full aspect-[3/4] bg-neutral-900 overflow-hidden">
              <img 
                src={profileImages[activePhotoIndex]} 
                alt={profile.name} 
                className={`w-full h-full object-cover transition-all duration-700 ${!isUnlocked && activePhotoIndex > 0 ? 'blur-xl scale-110 opacity-70' : 'blur-0'}`} 
              />
              
              {/* Image indices navigation bullets */}
              <div className="absolute top-4 left-4 right-4 flex space-x-1.5 z-10">
                {profileImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`h-1.5 rounded-full flex-1 transition-all ${idx === activePhotoIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>

              {/* Blurred premium unlock overlay */}
              {!isUnlocked && activePhotoIndex > 0 && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center text-white z-20">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                    <Camera className="w-6 h-6 text-pink-200" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">Photos Privées</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed max-w-[280px]">
                    Le déverrouillage des photos privées n'est pas disponible. Aucune photo ne sera révélée sans autorisation réelle.
                  </p>
                </div>
              )}

              {/* Online/Offline indicator */}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1.5 z-10">
                <span className={`w-2 h-2 rounded-full ${profile.online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span>
                  {profile.online ? "En Ligne" : (() => {
                    const idNum = parseInt(profile.id.replace(/\D/g, '')) || 4;
                    const minutes = (idNum % 40) + 3;
                    return `il y a ${minutes} min`;
                  })()}
                </span>
              </div>
            </div>
            
            {/* Gallery Thumbnails List */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center space-x-3 overflow-x-auto">
              {profileImages.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${idx === activePhotoIndex ? 'border-[#9c1f35] scale-105 shadow-sm' : 'border-transparent hover:border-gray-300'} relative`}
                >
                  <img src={img} alt="miniature" className="w-full h-full object-cover" />
                  {!isUnlocked && idx > 0 && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-white/80" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Member Bio & Cherchant Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <h3 className="text-gray-900 text-base font-bold flex items-center mb-3">
                <Smile className="w-4.5 h-4.5 mr-2 text-[#9c1f35]" /> À mon sujet
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-pink-200 pl-3">
                "{profile.bio || "Pas de réponse"}"
              </p>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-gray-900 text-base font-bold flex items-center mb-3">
                <Compass className="w-4.5 h-4.5 mr-2 text-[#9c1f35]" /> Ma recherche idéale
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-800">
                  Je cherche : {profile.seeking === 'both' ? 'Femmes ou Hommes' : profile.seeking === 'male' ? 'Hommes' : profile.seeking === 'female' ? 'Femmes' : 'Non précisé'}
                </span>
                <br /><br />
                Recherche une personne sérieuse, attentionnée et sincère pour fonder une relation basée sur le respect, le partage et la complicité à long terme.
              </p>
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-gray-900 text-base font-bold mb-4 flex items-center">
              <Award className="w-4.5 h-4.5 mr-2 text-[#9c1f35]" /> Atouts & Traits de caractère
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {profile.personalityTraits && profile.personalityTraits.length > 0 ? (
                profile.personalityTraits.map((trait, idx) => (
                  <span 
                    key={idx} 
                    className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-100 flex items-center"
                  >
                    <Sparkles className="w-3 h-3 mr-1 text-purple-500" /> {trait}
                  </span>
                ))
              ) : (
                <>
                  <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">Souriante</span>
                  <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">Sociable</span>
                  <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">Romantique</span>
                </>
              )}
            </div>

            {profile.lifestyleTags && profile.lifestyleTags.length > 0 && (
              <div className="mt-5">
                <h3 className="text-gray-900 text-sm font-bold mb-3 flex items-center">
                  <Zap className="w-4 h-4 mr-1.5 text-yellow-500" /> Abidjan Vibes 🇨🇮
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.lifestyleTags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="bg-orange-50 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-orange-100 flex items-center shadow-sm"
                    >
                      <Sparkles className="w-3 h-3 mr-1 text-orange-400" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Premium Feature: Personalized Localized Icebreakers */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h3 className="text-gray-900 text-sm font-black flex items-center uppercase tracking-wide border-b border-gray-100 pb-2.5">
              <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600 mr-2">💬</span>
              Questions Complices & Icebreakers
            </h3>

            <div className="space-y-4">
              <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100 space-y-1.5 hover:bg-neutral-100/50 transition">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Mon dimanche idéal...</span>
                <p className="text-xs text-gray-700 leading-relaxed font-medium italic">
                  "Aller déguster un bon attiéké au poisson braisé bien pimenté avec vue sur la lagune Ébrié, puis finir par une douce marche relaxante sur la plage d'Assinie."
                </p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100 space-y-1.5 hover:bg-neutral-100/50 transition">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Ce que j'apprécie le plus chez mon partenaire...</span>
                <p className="text-xs text-gray-700 leading-relaxed font-medium italic">
                  "La sincérité, la loyauté absolue et la capacité de rire sincèrement des petits bonheurs simples de la vie quotidienne."
                </p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100 space-y-1.5 hover:bg-neutral-100/50 transition">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Ma plus grande passion...</span>
                <p className="text-xs text-gray-700 leading-relaxed font-medium italic">
                  "Cuisiner des plats traditionnels ivoiriens de fête, écouter des classiques de la rumba congolaise et du zouglou, et voyager vers de nouvelles cultures inspirantes."
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: Header, actions, detailed cards ================= */}
        <div className="flex-1 space-y-6">
          
          {/* Header Identity Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl from-[#cd6d7d]/10 to-transparent rounded-bl-full pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{profile.name}</h1>
                  
                  {/* Verified tag */}
                  <div className="flex items-center bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-100">
                    <Check className="w-3.5 h-3.5 text-green-600 mr-0.5 stroke-[3]" /> Vérifié Or
                  </div>

                  {/* Compatibility Badge */}
                  <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-md border border-white/10 flex items-center">
                    <Zap className="w-3 h-3 mr-1 fill-white text-white" /> {profile.matchPercentage || 92}% d'affinité
                  </div>
                  
                  {/* Trust Score Badge */}
                  {profile.trustScore && (
                    <div className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-black border border-emerald-100 flex items-center shadow-sm">
                      <Shield className="w-3 h-3 mr-1 text-emerald-500" /> Sincérité {profile.trustScore}%
                    </div>
                  )}
                </div>
                
                {/* Location with map pins */}
                <p className="text-sm font-semibold text-gray-600 flex items-center mb-4">
                  <MapPin className="w-4 h-4 text-rose-500 mr-1.5 shrink-0" />
                  {profile.age} ans • {profile.city}, {profile.neighborhood || profile.city}, Côte d'Ivoire
                </p>
                
                {/* ID & Connection Details */}
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
                  <div>
                    <span className="text-gray-400 font-medium block">ID UNIQUE</span>
                    <span className="font-bold text-gray-700">ID: {getProfileIdNumber(profile.id)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">STATUT DE CONNEXION</span>
                    <span className={`font-bold ${profile.online ? 'text-emerald-600' : 'text-gray-700'}`}>
                      {profile.online ? "Je suis en ligne" : (() => {
                        const idNum = parseInt(profile.id.replace(/\D/g, '')) || 4;
                        const minutes = (idNum % 40) + 3;
                        return `il y a ${minutes} minutes`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Actions block */}
              <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                <div className="flex flex-wrap items-center gap-2 w-full justify-center md:justify-end">
                  {/* Super Like Button */}
                  <button 
                    onClick={() => onSuperLike && onSuperLike()} 
                    className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-tr from-fuchsia-600 to-rose-500 hover:from-fuchsia-700 hover:to-rose-600 text-white shrink-0"
                    title="Super Like"
                  >
                    <Star className="w-5 h-5 fill-white" />
                  </button>

                  {/* Like Button */}
                  <button 
                    onClick={() => onLike(profile)} 
                    className={`h-12 px-6 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer flex-1 md:flex-none ${likedIds.includes(profile.id) ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                  >
                    <Heart className={`w-5 h-5 mr-2 ${likedIds.includes(profile.id) ? 'fill-current text-white' : 'text-rose-500'}`} />
                    {likedIds.includes(profile.id) ? 'Liké !' : 'Liker'}
                  </button>
                  
                  {/* Chat Button */}
                  <button 
                    onClick={() => onMessage(profile.id)} 
                    className="h-12 px-6 rounded-full bg-[#9c1f35] hover:bg-[#83192c] text-white flex items-center justify-center font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer flex-1 md:flex-none"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Discuter
                  </button>
                </div>
                
                {/* Secondary utilities (Favorite, Report, Block) */}
                <div className="flex space-x-4 pt-1 justify-center w-full md:w-auto text-gray-400">
                  <button 
                    onClick={() => onToggleFavorite && onToggleFavorite(profile.id)} 
                    className={`flex items-center space-x-1.5 text-xs font-bold transition hover:text-gray-700 cursor-pointer ${favoriteIds.includes(profile.id) ? 'text-yellow-500' : ''}`}
                    title="Favoris"
                  >
                    <Star className={`w-5 h-5 ${favoriteIds.includes(profile.id) ? 'fill-current' : ''}`} />
                    <span>Favoris</span>
                  </button>

                  <button 
                    onClick={() => onToggleBlacklist && onToggleBlacklist(profile.id)}
                    className={`flex items-center space-x-1.5 text-xs font-bold transition cursor-pointer ${blacklistIds.includes(profile.id) ? 'text-red-500 hover:text-red-600 font-black' : 'hover:text-red-600'}`}
                    title="Liste rouge / Bloquer"
                  >
                    <Ban className="w-5 h-5" />
                    <span>{blacklistIds.includes(profile.id) ? 'Bloqué (Débloquer)' : 'Liste rouge'}</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowAbuseModal(true)}
                    className="flex items-center space-x-1.5 text-xs font-bold hover:text-red-600 transition cursor-pointer"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span>Signaler</span>
                  </button>

                  <button 
                    onClick={() => {
                      showToast("Lien Safe Date généré ! Envoyez ce lien à un proche pour qu'il suive votre localisation et les infos du profil en temps réel. 🚨", "info");
                    }}
                    className="flex items-center space-x-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition cursor-pointer"
                    title="Partager un suivi de sécurité avec un proche pour votre Rencard IRL"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Safe Date</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analyse IA Section */}
          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl shadow-sm border border-fuchsia-100 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-fuchsia-200/50 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-200/50 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 text-lg font-black flex items-center">
                  <Zap className="w-5 h-5 mr-2 fill-fuchsia-600 text-fuchsia-600" /> Analyse de Compatibilité
                </h3>
                {matchAnalysis && (
                  <div className="bg-white px-3 py-1 rounded-full text-sm font-black text-fuchsia-700 shadow-sm border border-fuchsia-100 flex items-center">
                    {matchAnalysis.score === null ? 'Données insuffisantes' : `Score : ${matchAnalysis.score}%`}
                  </div>
                )}
              </div>
              
              {!matchAnalysis ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <p className="text-gray-600 text-sm mb-4 text-center max-w-md">Découvrez pourquoi vous et {profile.name} pourriez être un match parfait grâce à notre algorithme Bavel.</p>
                  <button 
                    onClick={handleAnalyzeMatch}
                    disabled={isMatchLoading}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold py-2.5 px-6 rounded-full shadow-md transition-all active:scale-95 flex items-center cursor-pointer disabled:opacity-70"
                  >
                    {isMatchLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isMatchLoading ? "Analyse en cours..." : "Lancer l'analyse d'affinité"}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-5 border border-fuchsia-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-gray-800 text-sm leading-relaxed font-medium">
                    {matchAnalysis.reason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Interests Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-gray-900 text-lg font-bold mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-[#9c1f35]" /> Mes Centres d'Intérêts
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {profile.interests && profile.interests.length > 0 ? (
                profile.interests.map((interest: any, idx: number) => {
                  const isObj = typeof interest === 'object' && interest !== null;
                  const label = isObj ? (interest.label || interest.name || '') : String(interest);
                  const icon = isObj ? interest.icon : null;
                  return (
                    <span 
                      key={idx} 
                      className="bg-[#cd6d7d]/10 text-[#9c1f35] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#cd6d7d]/20 hover:bg-[#cd6d7d]/20 transition cursor-default flex items-center space-x-1"
                    >
                      {icon && <span>{icon}</span>}
                      <span>{label}</span>
                    </span>
                  );
                })
              ) : (
                ['Musique', 'Cinéma', 'Voyages', 'Cuisine', 'Plage'].map((interest, idx) => (
                  <span 
                    key={idx} 
                    className="bg-[#cd6d7d]/10 text-[#9c1f35] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#cd6d7d]/20"
                  >
                    {interest}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Redesigned Comparison Matrix (Vue Rapide) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#9c1f35] to-[#cd6d7d] px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-bold">Matrice de Compatibilité (Vue Rapide)</h3>
                <p className="text-[11px] text-pink-100 mt-0.5">Comparez vos réponses avec ce qu'elle recherche chez un partenaire.</p>
              </div>
              <Award className="w-6 h-6 text-pink-200" />
            </div>

            <div className="p-0">
              {renderComparisonRow("Niveau d'études", "Licence / Master", "Pas de préférence particulière", "neutral", <User className="w-4 h-4" />)}
              {renderComparisonRow("Ayant des enfants", "Non, mais adore les enfants", "Pas de préférence particulière", "neutral", <User className="w-4 h-4" />)}
              {renderComparisonRow("Alcool", "Occasionnel (fêtes, dîners)", "Non-buveur ou occasionnel", "match", <Compass className="w-4 h-4" />)}
              {renderComparisonRow("Tabac", "Non-fumeur", "Strictement non-fumeur", "match", <Compass className="w-4 h-4" />)}
              {renderComparisonRow("Religion", "Chrétienne", "Pas de préférence", "neutral", <Compass className="w-4 h-4" />)}
              {renderComparisonRow("Profession", "Cadre / Entrepreneuse", "Pas de préférence", "neutral", <Briefcase className="w-4 h-4" />)}
            </div>

            {/* Compatibility Legend */}
            <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-end space-x-6 text-xs font-medium text-gray-500">
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-1.5 shadow-sm" />
                <span>Correspondance parfaite</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-gray-300 rounded-full mr-1.5 shadow-sm" />
                <span>Neutre / Sans préférence</span>
              </div>
            </div>
          </div>

          {/* More Details (Accordion style look) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            <h3 className="text-gray-900 text-lg font-bold pb-2 border-b border-gray-100">Informations Détaillées</h3>
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#9c1f35] tracking-wider uppercase">Style de vie & Valeurs</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400 block uppercase">État Civil</span>
                  <span className="text-sm font-semibold text-gray-800">Célibataire, jamais mariée</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400 block uppercase">Situation de vie</span>
                  <span className="text-sm font-semibold text-gray-800">Vit seule dans son appartement</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400 block uppercase">Langues parlées</span>
                  <span className="text-sm font-semibold text-gray-800">Français, Anglais (intermédiaire)</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400 block uppercase">Signe Astrologique</span>
                  <span className="text-sm font-semibold text-gray-800">Vierge ♍</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Safety Advice Card */}
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-amber-900">Conseil de Sécurité : Restez Vigilant</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Méfiez-vous des personnes qui demandent de l'argent ou des faveurs financières. N'envoyez jamais d'argent à des personnes rencontrées en ligne. Si un profil vous semble suspect ou vous demande de l'aide financière, signalez-le immédiatement.
              </p>
            </div>
          </div>

          {/* ================= SIMILAR PROFILES SECTION ================= */}
          <div className="pt-4">
            <h3 className="text-gray-900 text-xl font-bold mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-[#9c1f35]" /> Membres Similaires Disponibles
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarProfiles.slice(0, 4).map((p, idx) => (
                <div 
                  key={p.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-150 overflow-hidden relative cursor-pointer hover:shadow-md transition-all duration-300 group hover:-translate-y-1"
                  onClick={() => onSelectProfile && onSelectProfile(p)}
                >
                  <div className="relative h-44 overflow-hidden bg-neutral-100">
                    <img 
                      src={p.avatarUrl} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-fuchsia-300 border border-fuchsia-400/20 text-[10px] px-1.8 py-0.5 rounded-full font-black flex items-center shadow-md">
                      <Zap className="w-2.5 h-2.5 mr-0.5 fill-fuchsia-400 text-fuchsia-400" /> {p.matchPercentage || 90}%
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h4 className="font-bold text-xs text-gray-900 truncate group-hover:text-[#9c1f35] transition">{p.name}, {p.age}</h4>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{p.city}</p>
                    <span className="text-[10px] font-semibold text-[#cd6d7d] block mt-1">Dernière visite il y a {idx + 1}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Simulated Abuse Reporting Modal */}
      {showAbuseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-100">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" /> Signaler {profile.name}
              </h3>
              <button 
                onClick={() => { setShowAbuseModal(false); setAbuseReason(''); }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {abuseSuccess ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-bold text-gray-900">Signalement Envoyé</h4>
                <p className="text-xs text-gray-500">Merci de nous aider à garder Bavel sécurisé. Notre équipe étudiera ce profil sous 24h.</p>
              </div>
            ) : (
              <form onSubmit={handleReportAbuse} className="space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Veuillez spécifier la raison pour laquelle vous souhaitez signaler ce profil. L'équipe de modération de Bavel prendra les mesures nécessaires.
                </p>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Motif du signalement</label>
                  <select 
                    value={abuseReason} 
                    onChange={(e) => setAbuseReason(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-xs outline-none focus:border-red-500 focus:bg-white transition text-[#333]"
                  >
                    <option value="">-- Sélectionnez un motif --</option>
                    <option value="spam">Spam / Faux profil / Robot</option>
                    <option value="money">Demande d'argent / Arnaque</option>
                    <option value="abuse">Harcèlement / Comportement abusif</option>
                    <option value="inappropriate">Photos inappropriées</option>
                    <option value="other">Autre motif</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Commentaire additionnel</label>
                  <textarea 
                    rows={3}
                    placeholder="Détails supplémentaires..."
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-xs outline-none focus:border-red-500 focus:bg-white transition text-[#333] resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowAbuseModal(false); setAbuseReason(''); }}
                    className="flex-1 py-2 rounded text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!abuseReason}
                    className="flex-1 py-2 rounded text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
                  >
                    Soumettre le signalement
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {toastText && (
        <div className="fixed bottom-6 right-6 bg-[#9c1f35] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-rose-300/20 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5 z-50">
          <span>{toastText}</span>
        </div>
      )}

    </motion.div>
  );
}
