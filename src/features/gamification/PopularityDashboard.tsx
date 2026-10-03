import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Flame, 
  Eye, 
  Heart, 
  Zap, 
  Sparkles, 
  Lightbulb, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  gamificationService, 
  PopularityMetrics 
} from '../../services/gamificationService';
import { useUX } from '../../context/UXContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface PopularityDashboardProps {
  onOpenBoost: () => void;
  onOpenQuests?: () => void;
  city?: string;
}

export const PopularityDashboard: React.FC<PopularityDashboardProps> = ({
  onOpenBoost,
  onOpenQuests,
  city,
}) => {
  const { triggerFeedback } = useUX();
  const [metrics, setMetrics] = useState<PopularityMetrics>(
    gamificationService.getPopularityMetrics()
  );

  useEffect(() => {
    const unsub = gamificationService.subscribe(() => {
      setMetrics(gamificationService.getPopularityMetrics());
    });
    return unsub;
  }, []);

  const getGaugeColor = () => {
    if (metrics.score >= 80) return 'from-amber-400 to-rose-500 text-amber-400';
    if (metrics.score >= 60) return 'from-rose-500 to-indigo-500 text-rose-400';
    return 'from-blue-500 to-teal-400 text-blue-400';
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-[#e20030] flex items-center justify-center border border-rose-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
              Popularité du Profil
              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-300 border-rose-500/30">
                Temps Réel
              </Badge>
            </h3>
            <p className="text-[11px] text-neutral-400">Score d'attractivité et portée</p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerFeedback('medium');
            onOpenBoost();
          }}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-[#e20030] hover:opacity-90 active:scale-95 text-xs font-black flex items-center gap-1 shadow-md shadow-rose-600/25 transition-transform"
        >
          <Flame className="w-3.5 h-3.5 fill-white" />
          Booster
        </button>
      </div>

      {/* Main Gauge & Score */}
      <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Statut</span>
          <h4 className="text-xl font-black text-white mt-0.5">{metrics.label}</h4>
          <p className="text-xs text-neutral-300 mt-1">
            Votre profil est vu par <strong className="text-rose-400">~{metrics.dailyViews} personnes / jour</strong>
          </p>
        </div>

        {/* Circular / Radial Visual representation */}
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="5"
              className="text-neutral-800"
              fill="transparent"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="url(#gaugeGradient)"
              strokeWidth="5"
              strokeDasharray={175.9}
              strokeDashoffset={175.9 - (175.9 * metrics.score) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#e20030" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-sm font-black font-mono">{metrics.score}%</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/40">
          <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1 mb-0.5">
            <Eye className="w-3 h-3 text-blue-400" />
            Vues de profil
          </span>
          <p className="text-lg font-black text-white">{metrics.dailyViews}</p>
          <span className="text-[9px] text-neutral-400 font-bold">Données calculées par Bavel</span>
        </div>

        <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/40">
          <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1 mb-0.5">
            <Heart className="w-3 h-3 text-rose-400" />
            Taux de Match
          </span>
          <p className="text-lg font-black text-white">{metrics.matchRatePercent}%</p>
          <span className="text-[9px] text-neutral-400 font-bold">
            {city ? `Dans ${city}` : 'Localisation non définie'}
          </span>
        </div>
      </div>

      {/* Algorithmic Tip */}
      <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-start space-x-2.5">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
            {metrics.topTip}
          </p>
          {onOpenQuests && (
            <button
              onClick={() => {
                triggerFeedback('light');
                onOpenQuests();
              }}
              className="text-[10px] font-bold text-rose-400 hover:underline flex items-center gap-0.5 mt-1"
            >
              Voir mes quêtes & récompenses
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
