/**
 * Engagement & Gamification Service
 * Calculates profile popularity gauges, manages quest incentives, and awards credits.
 */

import { UserQuest } from '../types';
import { authFetch } from '../lib/authFetch';


export interface PopularityMetrics {
  score: number; // 0 to 100
  level: 'low' | 'medium' | 'high' | 'star';
  label: string;
  dailyViews: number;
  matchRatePercent: number;
  topTip: string;
}

export const INITIAL_QUESTS: UserQuest[] = [
  {
    id: 'quest_photos',
    title: 'Ajouter 3 photos à votre profil',
    description: 'Ajoutez au moins 3 photos à votre profil.',
    rewardCredits: 30,
    isCompleted: false,
    actionKey: 'photos_3',
  },
  {
    id: 'quest_bio',
    title: 'Rédiger une bio (20 caractères minimum)',
    description: 'Décrivez vos passions en au moins 20 caractères.',
    rewardCredits: 20,
    isCompleted: false,
    actionKey: 'bio',
  },
  {
    id: 'quest_first_swipe',
    title: 'Faire vos 10 premiers swipes',
    description: 'Entraînez l’algorithme de compatibilité Bavel.',
    rewardCredits: 25,
    isCompleted: false,
    actionKey: 'first_swipe',
  },
];

class GamificationService {
  private quests: UserQuest[] = INITIAL_QUESTS;
  private popularityScore: number = 0;
  private listeners: (() => void)[] = [];

  constructor() {
    void this.loadFromServer();
  }

  private async loadFromServer() {
    try {
      const response = await authFetch('/api/gamification/quests');
      if (!response.ok) throw new Error(`Quêtes indisponibles (${response.status})`);
      const data = await response.json();
      if (Array.isArray(data.quests)) {
        this.quests = this.quests.map((quest) => ({
          ...quest,
          isCompleted: Boolean(data.quests.find((remote: any) => remote.id === quest.id)?.isCompleted)
        }));
        this.notify();
      }
    } catch (error) {
      console.error('Chargement des quêtes depuis Supabase impossible:', error);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getQuests(): UserQuest[] {
    return [...this.quests];
  }

  public getCompletedQuestsCount(): number {
    return this.quests.filter((q) => q.isCompleted).length;
  }

  public getProfileCompletenessPercent(): number {
    const total = this.quests.length;
    const completed = this.getCompletedQuestsCount();
    return Math.round((completed / total) * 100);
  }

  public async completeQuest(questId: string): Promise<{ completed: boolean; reason?: string }> {
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest || quest.isCompleted) return { completed: Boolean(quest?.isCompleted) };

    try {
      const response = await authFetch('/api/gamification/quest-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      const data = await response.json().catch(() => null);
      if (response.status === 409) return { completed: false, reason: data?.error };
      if (!response.ok) throw new Error(data?.error || `Réclamation impossible (${response.status}).`);
      quest.isCompleted = true;
      this.notify();
      return { completed: true };
    } catch (error) {
      console.error('Impossible de réclamer la récompense de quête:', error);
      return { completed: false, reason: 'Impossible de vérifier la quête pour le moment.' };
    }
  }

  public getPopularityMetrics(): PopularityMetrics {
    const currentScore = this.popularityScore;

    let level: PopularityMetrics['level'] = 'low';
    let label = 'Faible';
    let dailyViews = 0;
    let matchRatePercent = 0;
    let topTip = 'Ajoutez des photos récentes et complétez vos centres d’intérêt pour monter de rang.';

    if (currentScore >= 85) {
      level = 'star';
      label = 'Star du Moment 🌟';
      dailyViews = 0;
      matchRatePercent = 0;
      topTip = 'Votre profil est au sommet des swipes dans votre région !';
    } else if (currentScore >= 65) {
      level = 'high';
      label = 'Très Populaire 🔥';
      dailyViews = 0;
      matchRatePercent = 0;
      topTip = 'Activez un Boost de 30 min pour atteindre le statut Star et tripler vos matchs.';
    } else if (currentScore >= 40) {
      level = 'medium';
      label = 'Moyenne ⚡';
      dailyViews = 0;
      matchRatePercent = 0;
      topTip = 'Vérifiez votre profil par selfie pour rassurer vos interlocuteurs (+50 crédits).';
    }

    return {
      score: currentScore,
      level,
      label,
      dailyViews,
      matchRatePercent,
      topTip,
    };
  }
}

export const gamificationService = new GamificationService();
