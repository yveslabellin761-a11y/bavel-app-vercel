import React from 'react';
import { ChevronLeft, ChevronRight, Phone, Video, MoreHorizontal, Heart, MapPin, Check } from 'lucide-react';

interface ChatHeaderProps {
  profile: any;
  onBack: () => void;
  onFullProfile: () => void;
  onMoreMenu?: () => void;
  onCall: (type: 'audio' | 'video') => void;
  allowVoiceCall?: boolean;
  allowVideoCall?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  profile,
  onBack,
  onFullProfile,
  onMoreMenu,
  onCall,
  allowVoiceCall = true,
  allowVideoCall = true,
}) => {
  const photos = profile.photos || (profile.img ? [profile.img] : []);
  const mainPhoto = profile.img || photos[0] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500';

  return (
    <div className="bg-white shrink-0 z-10 border-b border-gray-100/80 shadow-xs">
      {/* Top Action Bar */}
      <div className="pt-10 pb-2 px-4 flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          aria-label="Retour"
        >
          <ChevronLeft className="w-8 h-8 text-black" strokeWidth={2.2} />
        </button>

        <div className="flex items-center space-x-5">
          {allowVoiceCall && (
            <button 
              onClick={() => onCall('audio')} 
              className="p-1 text-black hover:opacity-75 transition-opacity active:scale-95"
              aria-label="Appel vocal"
            >
              <Phone className="w-6 h-6 text-black" strokeWidth={2.2} />
            </button>
          )}
          {allowVideoCall && (
            <button 
              onClick={() => onCall('video')} 
              className="p-1 text-black hover:opacity-75 transition-opacity active:scale-95"
              aria-label="Appel vidéo"
            >
              <Video className="w-7 h-7 text-black" strokeWidth={2.2} />
            </button>
          )}
          <button 
            onClick={onMoreMenu} 
            className="p-1 text-black hover:opacity-75 transition-opacity active:scale-95"
            aria-label="Plus d'options"
          >
            <MoreHorizontal className="w-7 h-7 text-black" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Profile Card Banner (Exact match with IMG_4380.PNG) */}
      <div 
        onClick={onFullProfile}
        className="px-4 py-3 bg-white flex items-center space-x-3.5 cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
      >
        {/* Photos Thumbnail Stack */}
        <div className="relative flex items-center shrink-0">
          {/* Slight left sliver photo preview if 2+ photos */}
          {photos.length > 1 && (
            <div className="w-2.5 h-[80px] rounded-l-xl bg-gray-200 overflow-hidden opacity-60 -mr-1 shrink-0">
              <img src={photos[1]} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {/* Main Photo Card */}
          <div className="w-[82px] h-[92px] rounded-2xl overflow-hidden shadow-xs border border-gray-200/60 shrink-0 bg-gray-100">
            <img 
              src={mainPhoto} 
              alt={profile.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Profile Info Text */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
          {/* Heart + Verified + Name, Age */}
          <div className="flex items-center space-x-1.5 flex-wrap">
            <div className="w-[22px] h-[22px] bg-[#E20030] rounded-full flex items-center justify-center shrink-0 shadow-xs">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>

            {Boolean(profile?.verified === true || profile?.isVerified === true || profile?.is_verified === true || profile?.isPhotoVerified === true) && (
              <span className="w-5 h-5 rounded-full bg-[#0084ff] text-white flex items-center justify-center shrink-0 shadow-xs" title="Profil vérifié par photo">
                <Check className="w-3 h-3 stroke-[3.5]" />
              </span>
            )}

            <h2 className="text-[20px] font-bold text-black tracking-tight truncate leading-tight flex items-center space-x-1.5">
              <span>{profile.name}{profile.age ? `, ${profile.age}` : ''}</span>
              {(profile.online !== false && profile.isOnline !== false) && (
                <span className="w-2.5 h-2.5 bg-[#2ad546] rounded-full shrink-0 shadow-xs" title="En ligne" />
              )}
            </h2>
          </div>

          {/* Location City Name */}
          <p className="text-[14px] font-bold text-black truncate mt-1">
            {profile.location || profile.city || "Martigné-sur-Mayenne"}
          </p>

          {/* Emplacement with Pin */}
          <div className="flex items-center space-x-1 text-[13px] text-black font-medium mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
            <span>Emplacement</span>
          </div>

          {/* Date */}
          <p className="text-[12px] text-gray-400 font-normal mt-0.5">
            {profile.matchDate || "20 août 2026"}
          </p>
        </div>

        {/* Far Right Chevron Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-1" strokeWidth={2.2} />
      </div>
    </div>
  );
};

