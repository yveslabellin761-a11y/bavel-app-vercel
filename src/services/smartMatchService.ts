/**
 * Smart Match & Elo Desirability Scoring Service
 * + Best Photo A/B Testing Algorithm
 */

export interface PhotoAnalytics {
  photoUrl: string;
  impressions: number;
  rightSwipes: number;
  conversionRate: number; // 0 to 1
}

export interface EloProfileScore {
  userId: string;
  eloRating: number; // default 1200
  totalSwipesReceived: number;
  likesReceived: number;
  lastUpdated: string;
}

class SmartMatchService {
  private eloMap = new Map<string, EloProfileScore>();
  private photoAnalyticsMap = new Map<string, PhotoAnalytics[]>();

  constructor() {
  }

  /**
   * Get or initialize Elo rating for a user
   */
  public getEloScore(userId: string): EloProfileScore {
    if (!this.eloMap.has(userId)) {
      const initial: EloProfileScore = {
        userId,
        eloRating: 1200,
        totalSwipesReceived: 0,
        likesReceived: 0,
        lastUpdated: new Date().toISOString(),
      };
      this.eloMap.set(userId, initial);
    }
    return this.eloMap.get(userId)!;
  }

  /**
   * Record swipe interaction and update Elo rating
   */
  public recordSwipeEvent(targetUserId: string, isRightSwipe: boolean, swiperElo: number = 1200): EloProfileScore {
    const target = this.getEloScore(targetUserId);

    target.totalSwipesReceived += 1;
    if (isRightSwipe) {
      target.likesReceived += 1;
    }

    // Expected probability formula (Elo)
    const expectedScore = 1 / (1 + Math.pow(10, (swiperElo - target.eloRating) / 400));
    const actualScore = isRightSwipe ? 1 : 0;
    const kFactor = target.totalSwipesReceived < 30 ? 32 : 16;

    target.eloRating = Math.round(target.eloRating + kFactor * (actualScore - expectedScore));
    target.lastUpdated = new Date().toISOString();

    this.eloMap.set(targetUserId, target);
    return target;
  }

  /**
   * Ranks candidate profiles for smart matching based on Badoo shadow algorithm:
   * 1. Instant Match Gratification: Profiles that already liked the current user placed near top
   * 2. Novelty Boost: New registrants ("Vient de s'inscrire" / isNewUser) get boosted visibility
   * 3. Elo Similarity: Similar attractiveness score alignment
   */
  public rankProfilesForUser<T extends { id: string; name: string }>(
    currentUserId: string,
    candidates: T[],
    receivedLikeIds: (string | number)[] = []
  ): T[] {
    const userElo = this.getEloScore(currentUserId).eloRating;
    const receivedSet = new Set(receivedLikeIds.map(id => String(id)));

    return [...candidates].sort((a, b) => {
      const idA = String(a.id);
      const idB = String(b.id);

      // 1. Gratification Badoo : Les personnes qui ont déjà liké l'utilisateur apparaissent très tôt
      const likedA = receivedSet.has(idA);
      const likedB = receivedSet.has(idB);
      if (likedA && !likedB) return -1;
      if (!likedA && likedB) return 1;

      // 2. Boost de nouveauté Badoo : Les nouveaux inscrits ("Vient de s'inscrire")
      const isNewA = Boolean((a as any).isNewUser || (a as any).isNew || (a as any).tagline === "Vient de s'inscrire" || (a as any).relation === "Vient de s'inscrire");
      const isNewB = Boolean((b as any).isNewUser || (b as any).isNew || (b as any).tagline === "Vient de s'inscrire" || (b as any).relation === "Vient de s'inscrire");
      if (isNewA && !isNewB) return -1;
      if (!isNewA && isNewB) return 1;

      // 3. Proximité du score Elo Badoo
      const eloA = this.getEloScore(idA).eloRating;
      const eloB = this.getEloScore(idB).eloRating;

      const diffA = Math.abs(eloA - userElo);
      const diffB = Math.abs(eloB - userElo);

      return diffA - diffB;
    });
  }

  /**
   * Record impression for a user photo in A/B test
   */
  public recordPhotoImpression(userId: string, photoUrl: string): void {
    const list = this.photoAnalyticsMap.get(userId) || [];
    let item = list.find((p) => p.photoUrl === photoUrl);

    if (!item) {
      item = { photoUrl, impressions: 0, rightSwipes: 0, conversionRate: 0 };
      list.push(item);
    }

    item.impressions += 1;
    item.conversionRate = item.impressions > 0 ? item.rightSwipes / item.impressions : 0;

    this.photoAnalyticsMap.set(userId, list);
  }

  /**
   * Record right swipe / like for a specific photo
   */
  public recordPhotoLike(userId: string, photoUrl: string): void {
    const list = this.photoAnalyticsMap.get(userId) || [];
    let item = list.find((p) => p.photoUrl === photoUrl);

    if (!item) {
      item = { photoUrl, impressions: 1, rightSwipes: 1, conversionRate: 1 };
      list.push(item);
    } else {
      item.rightSwipes += 1;
      item.conversionRate = item.impressions > 0 ? item.rightSwipes / item.impressions : 0;
    }

    this.photoAnalyticsMap.set(userId, list);
  }

  /**
   * Best Photo Feature: Reorders user photos array so highest converting photo is #1
   */
  public optimizePhotoOrder(userId: string, photoUrls: string[]): { reorderedPhotos: string[]; bestPhotoUrl: string | null; bestRatePercent: number } {
    if (!photoUrls || photoUrls.length <= 1) {
      return { reorderedPhotos: photoUrls, bestPhotoUrl: photoUrls[0] || null, bestRatePercent: 0 };
    }

    const analytics = this.photoAnalyticsMap.get(userId) || [];

    const sorted = [...photoUrls].sort((a, b) => {
      const statsA = analytics.find((p) => p.photoUrl === a);
      const statsB = analytics.find((p) => p.photoUrl === b);

      const rateA = statsA && statsA.impressions >= 3 ? statsA.conversionRate : 0.5;
      const rateB = statsB && statsB.impressions >= 3 ? statsB.conversionRate : 0.5;

      return rateB - rateA;
    });

    const bestStats = analytics.find((p) => p.photoUrl === sorted[0]);
    const bestRatePercent = bestStats ? Math.round(bestStats.conversionRate * 100) : 50;

    return {
      reorderedPhotos: sorted,
      bestPhotoUrl: sorted[0],
      bestRatePercent,
    };
  }
}

export const smartMatchService = new SmartMatchService();
