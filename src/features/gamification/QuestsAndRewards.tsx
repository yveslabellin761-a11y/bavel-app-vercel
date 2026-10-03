import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Coins, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Camera, 
  Image, 
  FileText, 
  MapPin, 
  Flame,
  X
} from 'lucide-react';
import { 
  gamificationService, 
  INITIAL_QUESTS 
} from '../../services/gamificationService';
import { UserQuest } from '../../types';
import { useUX } from '../../context/UXContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface QuestsAndRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction?: (actionKey: UserQuest['actionKey']) => void;
}

export const QuestsAndRewardsModal: React.FC<QuestsAndRewardsModalProps> = ({
  isOpen,
  onClose,
  onTriggerAction,
}) => {
  const { triggerFeedback, playSound } = useUX();
  const [quests, setQuests] = useState<UserQuest[]>(gamificationService.getQuests());
  const [completionPercent, setCompletionPercent] = useState(
    gamificationService.getProfileCompletenessPercent()
  );
  const [questMessage, setQuestMessage] = useState('');

  useEffect(() => {
    const unsub = gamificationService.subscribe(() => {
      setQuests(gamificationService.getQuests());
      setCompletionPercent(gamificationService.getProfileCompletenessPercent());
    });
    return unsub;
  }, []);

  const getQuestIcon = (actionKey: UserQuest['actionKey']) => {
    switch (actionKey) {
      case 'selfie_verify':
        return Camera;
      case 'photos_3':
        return Image;
      case 'bio':
        return FileText;
      case 'location':
        return MapPin;
      case 'first_swipe':
        return Flame;
      default:
        return Sparkles;
    }
  };

  const handleQuestClick = async (quest: UserQuest) => {
    triggerFeedback('medium');
    if (!quest.isCompleted) {
      setQuestMessage('');
      const result = await gamificationService.completeQuest(quest.id);
      if (!result.completed) {
        setQuestMessage(result.reason || 'Effectuez cette action puis réclamez votre récompense.');
        if (quest.actionKey === 'bio' || quest.actionKey === 'photos_3' || quest.actionKey === 'selfie_verify') {
          onTriggerAction?.(quest.actionKey);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-neutral-900 text-white rounded-3xl p-6 shadow-2xl border border-neutral-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Quêtes & Récompenses</h3>
                <p className="text-[11px] text-neutral-400">Gagnez des crédits en optimisant votre profil</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Completion Progress Bar */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-neutral-300">Complétion du Profil</span>
              <span className="font-black text-amber-400">{completionPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
              />
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">
              Un profil complété à 100% multiplie vos chances de match par 3.
            </p>
          </div>

          {/* Quests List */}
          {questMessage && (
            <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {questMessage}
            </p>
          )}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {quests.map((quest) => {
              const Icon = getQuestIcon(quest.actionKey);
              return (
                <div
                  key={quest.id}
                  onClick={() => handleQuestClick(quest)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    quest.isCompleted
                      ? 'bg-neutral-950/60 border-neutral-800/80 opacity-75'
                      : 'bg-neutral-800/80 border-neutral-700/80 hover:bg-neutral-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        quest.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {quest.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          quest.isCompleted ? 'text-neutral-400 line-through' : 'text-white'
                        }`}
                      >
                        {quest.title}
                      </h4>
                      <p className="text-[10px] text-neutral-400 line-clamp-1">{quest.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Badge
                      className={`text-[10px] font-black ${
                        quest.isCompleted
                          ? 'bg-neutral-800 text-neutral-400'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      <Coins className="w-3 h-3 mr-1" />+{quest.rewardCredits}
                    </Badge>
                    {!quest.isCompleted && <ChevronRight className="w-4 h-4 text-neutral-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Close CTA */}
          <div className="pt-4">
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
