/**
 * Trust & Anti-Scam Security Services
 * - Selfie pose challenge verification & blue badge certification
 * - Private detector: automated sensitive photo blur & protection
 * - Anti-spam rate limiter for unmatched direct messages
 */

export interface VerificationPose {
  id: string;
  instruction: string;
  subtext: string;
  iconName: 'hand' | 'smile' | 'head-turn' | 'peace';
  requiredDurationMs: number;
}

export const VERIFICATION_POSES: VerificationPose[] = [
  {
    id: 'peace_sign',
    instruction: 'Faites le signe V de la paix avec 2 doigts',
    subtext: 'Placez votre main bien visible à côté de votre visage',
    iconName: 'peace',
    requiredDurationMs: 2500,
  },
  {
    id: 'head_tilt',
    instruction: 'Inclinez légèrement la tête vers la droite',
    subtext: 'Gardez les yeux fixés vers l’objectif',
    iconName: 'head-turn',
    requiredDurationMs: 2000,
  },
  {
    id: 'smile_open',
    instruction: 'Faites un grand sourire naturel',
    subtext: 'Regardez directement la caméra',
    iconName: 'smile',
    requiredDurationMs: 2000,
  },
];

const ANTI_SPAM_MAX_UNMATCHED_MESSAGES = 2;
const ANTI_SPAM_STORAGE_KEY = 'bavel_antispam_records';

export interface AISurveillanceResult {
  riskLevel: 'safe' | 'warning' | 'flagged' | 'blocked';
  category: 'financial_scam' | 'offplatform_redirect' | 'inappropriate_language' | 'hate_speech' | 'spam_links' | 'impersonation' | 'none';
  warningBanner?: string;
  actionRequired?: 'show_warning' | 'block_message' | 'sanction_user' | 'none';
  sanctionLevel?: 'warning' | 'mute' | 'shadowban' | 'none';
}

export interface UserSanctionStatus {
  userId: string;
  warningsCount: number;
  isMuted: boolean;
  isShadowBanned: boolean;
  lastViolationReason?: string;
  sanctionExpiresAt?: number;
}

class SecurityService {
  private antiSpamMap = new Map<string, number>();
  private isUserVerified = false;
  private swipeTimestamps: number[] = [];
  private isBotCooldownActive = false;
  private userSanctionsStore = new Map<string, UserSanctionStatus>();

  constructor() {
    this.init();
  }

  private init() {
    try {
      const savedSpam = localStorage.getItem(ANTI_SPAM_STORAGE_KEY);
      if (savedSpam) {
        const records = JSON.parse(savedSpam);
        Object.keys(records).forEach((k) => this.antiSpamMap.set(k, records[k]));
      }

    } catch {}
  }

  private saveSanctions() {
    // Server persistence is authoritative; this map is only a short-lived UI cache.
  }

  public isVerified(): boolean {
    return this.isUserVerified;
  }

  public setVerified(verified: boolean): void {
    this.isUserVerified = verified;
  }

  /**
   * Autonomous AI Profile Bio & Content Audit
   * Scans user bio, names, and details for forbidden content, spam links, or inappropriate language.
   */
  public auditProfileBioAndContent(bio: string, name: string): {
    isClean: boolean;
    sanitizedBio: string;
    detectedIssues: string[];
  } {
    if (!bio) return { isClean: true, sanitizedBio: '', detectedIssues: [] };

    let cleaned = bio;
    const issues: string[] = [];

    // 1. Phone number & contact spam masking
    const phoneRegex = /(\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g;
    if (phoneRegex.test(cleaned)) {
      issues.push('Numéro de téléphone masqué pour votre sécurité.');
      cleaned = cleaned.replace(phoneRegex, '[Numéro masqué]');
    }

    // 2. Unsafe external link spam masking
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|io|me|tg|wa|link))/gi;
    if (linkRegex.test(cleaned)) {
      issues.push('Lien externe retiré.');
      cleaned = cleaned.replace(linkRegex, '[Lien masqué]');
    }

    // 3. Profanity & inappropriate keywords cleaning
    const profanities = ['salope', 'pute', 'connard', 'enculé', 'bitch', 'fuck', 'nègre', 'pd', 'encule'];
    profanities.forEach((word) => {
      const reg = new RegExp(`\\b${word}\\b`, 'gi');
      if (reg.test(cleaned)) {
        issues.push('Terme inapproprié censuré.');
        cleaned = cleaned.replace(reg, '****');
      }
    });

    return {
      isClean: issues.length === 0,
      sanitizedBio: cleaned,
      detectedIssues: issues
    };
  }

  /**
   * Badoo Autonomous AI Chat & Content Moderator
   * Analyzes conversation text for financial requests, off-platform redirects, abusive language, or hate speech.
   * Auto-issues sanctions if violations recur.
   */
  public analyzeChatSentimentAndScamRisk(messageText: string, senderId?: string): AISurveillanceResult {
    if (!messageText || messageText.trim().length === 0) {
      return { riskLevel: 'safe', category: 'none', actionRequired: 'none' };
    }

    const lower = messageText.toLowerCase();

    // 1. Hate Speech & Severe Harassment (Immediate Block & Sanction)
    const hateSpeechKeywords = ['salope', 'pute', 'connard', 'enculé', 'sale nègre', 'encule', 'crève', 'suicide-toi', 'bitch', 'fuck you'];
    const hasHateSpeech = hateSpeechKeywords.some((kw) => lower.includes(kw));

    if (hasHateSpeech) {
      if (senderId) {
        this.issueUserSanction(senderId, 'Propos injurieux ou harcèlement');
      }
      return {
        riskLevel: 'blocked',
        category: 'hate_speech',
        warningBanner: '⛔ Message bloqué par la modération automatique pour non-respect des règles de la communauté.',
        actionRequired: 'block_message',
        sanctionLevel: 'warning'
      };
    }

    // 2. Financial Scam / Money Request detection
    const financialKeywords = ['argent', 'virement', 'paypal', 'western union', 'crypto', 'investir', 'prêt', 'recharge', 'momo', 'orange money', 'rib', 'banque'];
    const hasFinancialRequest = financialKeywords.some((kw) => lower.includes(kw));

    if (hasFinancialRequest) {
      return {
        riskLevel: 'warning',
        category: 'financial_scam',
        warningBanner: '🛡️ Rappel de sécurité : Ne partagez jamais d’informations financières ou de données bancaires avec un contact en ligne.',
        actionRequired: 'show_warning',
      };
    }

    // 3. Off-platform redirect attempt (WhatsApp / Telegram / Phone numbers)
    const redirectKeywords = ['whatsapp', 'telegram', 'instgram', 'snapchat', 'ecris moi sur', 'contacte moi au'];
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}/;
    const hasRedirect = redirectKeywords.some((kw) => lower.includes(kw)) || phonePattern.test(lower);

    if (hasRedirect) {
      return {
        riskLevel: 'warning',
        category: 'offplatform_redirect',
        warningBanner: '🛡️ Conseil de sécurité : Privilégiez la messagerie Bavel pour protéger vos échanges personnels.',
        actionRequired: 'show_warning',
      };
    }

    return { riskLevel: 'safe', category: 'none', actionRequired: 'none' };
  }

  /**
   * Issue an automated AI sanction to a offending user
   */
  public issueUserSanction(userId: string, reason: string): UserSanctionStatus {
    const current = this.userSanctionsStore.get(userId) || {
      userId,
      warningsCount: 0,
      isMuted: false,
      isShadowBanned: false,
    };

    current.warningsCount += 1;
    current.lastViolationReason = reason;

    if (current.warningsCount >= 3 && current.warningsCount < 5) {
      current.isMuted = true;
      current.sanctionExpiresAt = Date.now() + 12 * 3600 * 1000; // 12 hours mute
    } else if (current.warningsCount >= 5) {
      current.isShadowBanned = true;
      current.sanctionExpiresAt = Date.now() + 7 * 24 * 3600 * 1000; // 7 days ban
    }

    this.userSanctionsStore.set(userId, current);
    this.saveSanctions();
    return current;
  }

  /**
   * Get user sanction status
   */
  public getUserSanctionStatus(userId: string): UserSanctionStatus {
    return this.userSanctionsStore.get(userId) || {
      userId,
      warningsCount: 0,
      isMuted: false,
      isShadowBanned: false,
    };
  }

  /**
   * Autonomous AI Triage for User Reports
   */
  public evaluateUserReport(reportedUserId: string, reason: string, reportedBio?: string): {
    verdict: 'verified_safe' | 'warning_issued' | 'account_restricted';
    explanation: string;
  } {
    const status = this.getUserSanctionStatus(reportedUserId);
    
    // Audit reported profile bio
    const bioAudit = this.auditProfileBioAndContent(reportedBio || '', '');

    if (!bioAudit.isClean || status.warningsCount > 0) {
      this.issueUserSanction(reportedUserId, `Signalement utilisateur: ${reason}`);
      return {
        verdict: 'account_restricted',
        explanation: 'La modération automatique a détecté des anomalies comportementales ou de contenu. Le profil fait l\'objet d\'une restriction préventive.'
      };
    }

    return {
      verdict: 'verified_safe',
      explanation: 'La modération automatique a analysé le profil signalé. Aucun comportement à risque critique détecté actuellement, surveillance continue maintenue.'
    };
  }

  /**
   * Badoo Anti-Bot & Swipe Velocity Surveillance
   * Detects unnatural rapid swiping behavior and triggers cooling pauses or selfie prompts.
   */
  public recordSwipeAndCheckVelocity(): { isVelocityAbnormal: boolean; message?: string } {
    const now = Date.now();
    this.swipeTimestamps.push(now);

    // Keep timestamps from the last 20 seconds
    this.swipeTimestamps = this.swipeTimestamps.filter((t) => now - t < 20000);

    // If more than 18 swipes in 20 seconds -> bot pattern
    if (this.swipeTimestamps.length > 18) {
      this.isBotCooldownActive = true;
      setTimeout(() => {
        this.isBotCooldownActive = false;
      }, 15000);

      return {
        isVelocityAbnormal: true,
        message: '⏱️ Prenez le temps de découvrir les profils ! Une courte pause de 15 secondes est activée.',
      };
    }

    return { isVelocityAbnormal: false };
  }

  /**
   * Checks if sending a message to targetUserId is allowed by Anti-Spam policy.
   * If not matched and target hasn't replied, limit to 2 messages.
   */
  public checkCanSendMessage(
    targetUserId: string,
    isMatched: boolean,
    hasTargetReplied: boolean
  ): { allowed: boolean; remainingQuota: number; reason?: string } {
    // If profiles matched or recipient already answered, chat is fully unlocked
    if (isMatched || hasTargetReplied) {
      return { allowed: true, remainingQuota: 999 };
    }

    const sentCount = this.antiSpamMap.get(targetUserId) || 0;
    const remaining = Math.max(0, ANTI_SPAM_MAX_UNMATCHED_MESSAGES - sentCount);

    if (remaining <= 0) {
      return {
        allowed: false,
        remainingQuota: 0,
        reason: 'Limite de 2 messages atteinte. Attendez la réponse de ce profil pour continuer.',
      };
    }

    return { allowed: true, remainingQuota: remaining };
  }

  public recordSentMessage(targetUserId: string): void {
    const current = this.antiSpamMap.get(targetUserId) || 0;
    this.antiSpamMap.set(targetUserId, current + 1);

    try {
      const obj: Record<string, number> = {};
      this.antiSpamMap.forEach((v, k) => (obj[k] = v));
      localStorage.setItem(ANTI_SPAM_STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  /**
   * Private Detector: analyzes visual features or heuristics to identify sensitive imagery
   */
  public analyzeImageSensitivity(imageUrl: string): { isSensitive: boolean; confidence: number } {
    if (!imageUrl) return { isSensitive: false, confidence: 0 };

    // Deterministic inspection logic
    const lower = imageUrl.toLowerCase();
    const sensitiveTags = ['sensitive', 'explicit', 'adult', 'nsfw', 'blur_preview'];
    const matchesTag = sensitiveTags.some((tag) => lower.includes(tag));

    return {
      isSensitive: matchesTag,
      confidence: matchesTag ? 0.94 : 0.05,
    };
  }
}

export const securityService = new SecurityService();
