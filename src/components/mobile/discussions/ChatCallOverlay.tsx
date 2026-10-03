import React from 'react';
import { motion } from 'motion/react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface ChatCallOverlayProps {
  profile: any;
  call: { type: 'audio' | 'video'; status: string; duration: number };
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  callDuration: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export const ChatCallOverlay: React.FC<ChatCallOverlayProps> = ({
  profile,
  call,
  localVideoRef,
  callDuration,
  isMuted,
  onToggleMute,
  onEndCall,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col items-center justify-between p-8"
    >
      <div className="flex flex-col items-center mt-12 space-y-4">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
          <img src={profile.img || profile.photos?.[0]} alt={profile.name} className="w-full h-full object-cover" />
        </div>
        <h2 className="text-2xl font-bold">{profile.name}</h2>
        <p className="text-sm font-medium text-slate-400">
          {call.type === 'video' ? 'Appel vidéo' : 'Appel vocal'} • {formatTime(callDuration)}
        </p>
      </div>

      {call.type === 'video' && (
        <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl my-auto">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center space-x-6 mb-8">
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full transition-colors ${
            isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={onEndCall}
          className="p-5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </motion.div>
  );
};
