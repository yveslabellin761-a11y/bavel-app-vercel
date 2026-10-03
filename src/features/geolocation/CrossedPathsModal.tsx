import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, Navigation, Heart, MessageCircle, X, Sparkles, Compass, Users } from 'lucide-react';
import { Profile } from '../../types';
import { useUX } from '../../context/UXContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface CrossedPathsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (profile: Profile) => void;
  profiles?: Profile[];
}

export interface EncountersCrossedPath {
  id: string;
  profile: Profile;
  timesCrossedToday: number;
  lastCrossedLocation: string;
  lastCrossedTime: string;
  distanceKm: number;
}

export const CrossedPathsModal: React.FC<CrossedPathsModalProps> = ({
  isOpen,
  onClose,
  onSelectProfile,
  profiles = []
}) => {
  const { triggerFeedback } = useUX();

  const encounters: EncountersCrossedPath[] = useMemo(() => {
    if (!profiles || profiles.length === 0) return [];
    return profiles.slice(0, 6).map((p, idx) => ({
      id: `cp_${p.id || idx}`,
      profile: p,
      timesCrossedToday: (idx % 3) + 1,
      lastCrossedLocation: p.city ? `À proximité de ${p.city}` : 'Dans votre zone',
      lastCrossedTime: idx === 0 ? 'Il y a 15 min' : `Il y a ${idx * 45} min`,
      distanceKm: Number(((idx + 1) * 0.4).toFixed(1))
    }));
  }, [profiles]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-neutral-900 text-white rounded-3xl p-5 shadow-2xl border border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-[#e20030] flex items-center justify-center border border-rose-500/30">
                <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '10s' }} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-1.5">
                  Croisés en Chemin
                  <Badge className="bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.2">
                    Badoo GPS
                  </Badge>
                </h3>
                <p className="text-[11px] text-neutral-400">Personnes croisées aujourd’hui dans la vraie vie</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of Crossed Paths */}
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 no-scrollbar my-2">
            {encounters.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                  <Compass className="w-6 h-6 text-[#e20030]" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Aucun croisement récent</h4>
                <p className="text-xs text-neutral-400 max-w-xs">
                  Activez votre localisation et déplacez-vous pour retrouver ici les membres que vous croisez au quotidien.
                </p>
              </div>
            ) : encounters.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  triggerFeedback('medium');
                  onSelectProfile(item.profile);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90 hover:border-rose-500/50 transition-all cursor-pointer flex items-center space-x-3 group"
              >
                {/* Profile Avatar with badge */}
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-neutral-700">
                  <img
                    src={item.profile.photos?.[0] || (item.profile as any).img}
                    alt={item.profile.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
                </div>

                {/* Content info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-white truncate">
                      {item.profile.name}, {item.profile.age}
                    </h4>
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      {item.timesCrossedToday}x croisé(e)s
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 font-medium flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{item.lastCrossedLocation}</span>
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      {item.lastCrossedTime}
                    </span>
                    <span className="text-neutral-300 font-bold">À {item.distanceKm} km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Info Banner */}
          <div className="pt-2 shrink-0">
            <Button
              onClick={onClose}
              className="w-full h-11 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
            >
              Fermer
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
