type ProfileLike = Record<string, any>;

const normalize = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLocaleLowerCase('fr-FR') : '';

function values(profile: ProfileLike, ...keys: string[]): Set<string> {
  const result = new Set<string>();
  for (const key of keys) {
    const value = profile[key];
    const entries = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[;,]/) : [];
    for (const entry of entries) {
      const item = normalize(
        entry && typeof entry === 'object'
          ? (entry as ProfileLike).label || (entry as ProfileLike).name
          : entry
      );
      if (item) result.add(item);
    }
  }
  return result;
}

function number(profile: ProfileLike, ...keys: string[]): number | null {
  for (const key of keys) {
    const raw = profile[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const candidate = Number(raw);
    if (Number.isFinite(candidate)) return candidate;
  }
  return null;
}

function distanceKm(a: ProfileLike, b: ProfileLike): number | null {
  const lat1 = number(a, 'latitude', 'lat');
  const lon1 = number(a, 'longitude', 'lon', 'lng');
  const lat2 = number(b, 'latitude', 'lat');
  const lon2 = number(b, 'longitude', 'lon', 'lng');
  if ([lat1, lon1, lat2, lon2].some((coordinate) => coordinate === null)) return null;
  if (Math.abs(lat1!) > 90 || Math.abs(lat2!) > 90 || Math.abs(lon1!) > 180 || Math.abs(lon2!) > 180) return null;
  const radians = (degree: number) => degree * Math.PI / 180;
  const deltaLat = radians(lat2! - lat1!);
  const deltaLon = radians(lon2! - lon1!);
  const aValue = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1!)) * Math.cos(radians(lat2!)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(aValue), Math.sqrt(1 - aValue));
}

function compatibleIntent(first: ProfileLike, second: ProfileLike): boolean | null {
  const firstIntent = normalize(first.seeking || first.lookingFor || first.relation);
  const secondIntent = normalize(second.seeking || second.lookingFor || second.relation);
  if (!firstIntent || !secondIntent) return null;
  return firstIntent === secondIntent;
}

function calculateCompatibility(first: ProfileLike, second: ProfileLike) {
  const firstInterests = values(first, 'interests', 'passions', 'tags', 'lifestyleTags');
  const secondInterests = values(second, 'interests', 'passions', 'tags', 'lifestyleTags');
  const sharedInterests = [...firstInterests].filter((interest) => secondInterests.has(interest));
  const interestScore = firstInterests.size && secondInterests.size
    ? sharedInterests.length / new Set([...firstInterests, ...secondInterests]).size
    : null;

  const intentMatch = compatibleIntent(first, second);
  const firstCity = normalize(first.city || first.location);
  const secondCity = normalize(second.city || second.location);
  const locationScore = firstCity && secondCity
    ? Number(firstCity === secondCity)
    : distanceKm(first, second) !== null
      ? Math.max(0, 1 - distanceKm(first, second)! / 100)
      : null;
  const firstAge = number(first, 'age');
  const secondAge = number(second, 'age');
  const ageScore = firstAge !== null && secondAge !== null
    ? Math.max(0, 1 - Math.abs(firstAge - secondAge) / 20)
    : null;

  const signals = [
    { key: 'interests', weight: 0.5, score: interestScore },
    { key: 'intent', weight: 0.25, score: intentMatch === null ? null : Number(intentMatch) },
    { key: 'location', weight: 0.15, score: locationScore },
    { key: 'age', weight: 0.1, score: ageScore },
  ].filter((signal): signal is { key: string; weight: number; score: number } => signal.score !== null);
  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const score = totalWeight
    ? Math.round(100 * signals.reduce((sum, signal) => sum + signal.weight * signal.score, 0) / totalWeight)
    : null;

  return {
    score,
    sharedInterests: sharedInterests.map((interest) => interest),
    breakdown: Object.fromEntries(signals.map((signal) => [signal.key, Math.round(signal.score * 100)])),
  };
}

const preferenceFeatureNames = ['interests', 'intent', 'location', 'age', 'profileCompleteness'] as const;
type PreferenceFeatures = number[];
type PreferenceSample = { features: PreferenceFeatures; label: 0 | 1 };

function extractPreferenceFeatures(user: ProfileLike, candidate: ProfileLike): PreferenceFeatures {
  const compatibility = calculateCompatibility(user, candidate);
  const completenessFields = ['bio', 'city', 'occupation', 'job', 'studies', 'personality', 'interests', 'photos'];
  const completedFields = completenessFields.filter((field) => {
    const value = candidate[field];
    return Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
  }).length;
  const scores = preferenceFeatureNames.slice(0, 4).map((key) => {
    const score = compatibility.breakdown[key];
    return typeof score === 'number' ? score / 100 : 0;
  });
  const observedSignals = preferenceFeatureNames.slice(0, 4).map((key) =>
    Number(typeof compatibility.breakdown[key] === 'number')
  );
  return [...scores, completedFields / completenessFields.length, ...observedSignals];
}

function trainPreferenceModel(samples: PreferenceSample[]) {
  const positiveCount = samples.filter((sample) => sample.label === 1).length;
  const negativeCount = samples.length - positiveCount;
  if (samples.length < 12 || positiveCount < 3 || negativeCount < 3) return null;

  const featureCount = samples[0]?.features.length || 0;
  const weights = new Array(featureCount + 1).fill(0);
  const positiveWeight = samples.length / (2 * positiveCount);
  const negativeWeight = samples.length / (2 * negativeCount);
  const sigmoid = (value: number) => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, value))));

  for (let epoch = 0; epoch < 300; epoch += 1) {
    const gradients = new Array(weights.length).fill(0);
    for (const sample of samples) {
      const prediction = sigmoid(weights[0] + sample.features.reduce(
        (sum, feature, index) => sum + feature * weights[index + 1], 0
      ));
      const classWeight = sample.label === 1 ? positiveWeight : negativeWeight;
      const error = (prediction - sample.label) * classWeight;
      gradients[0] += error;
      sample.features.forEach((feature, index) => {
        gradients[index + 1] += error * feature;
      });
    }
    const learningRate = 0.2 / samples.length;
    weights[0] -= learningRate * gradients[0];
    for (let index = 1; index < weights.length; index += 1) {
      weights[index] -= learningRate * (gradients[index] + 0.05 * weights[index]);
    }
  }

  return {
    sampleSize: samples.length,
    positiveCount,
    negativeCount,
    predict(features: PreferenceFeatures) {
      return sigmoid(weights[0] + features.reduce(
        (sum, feature, index) => sum + feature * weights[index + 1], 0
      ));
    },
  };
}

export function rankProfiles(user: ProfileLike, candidates: ProfileLike[], interactions: ProfileLike = {}) {
  const history = Array.isArray(interactions.behavioralHistory)
    ? interactions.behavioralHistory as Array<{ eventType: string; profile: ProfileLike }>
    : [];
  const interactionCounts = new Map<string, { liked: number; passed: number }>();
  for (const event of history) {
    const interests = values(event.profile || {}, 'interests', 'passions', 'tags', 'lifestyleTags');
    const weight = event.eventType === 'superlike' ? 1.5
      : event.eventType === 'like' ? 1
        : event.eventType === 'pass' ? -0.5
          : 0;
    for (const interest of interests) {
      const counts = interactionCounts.get(interest) || { liked: 0, passed: 0 };
      if (weight > 0) counts.liked += weight;
      if (weight < 0) counts.passed += Math.abs(weight);
      interactionCounts.set(interest, counts);
    }
  }
  const positiveInteractions = history.filter((event) =>
    event.eventType === 'like' || event.eventType === 'superlike'
  ).length;
  const canPersonalize = history.length >= 3 && positiveInteractions >= 2 && interactionCounts.size > 0;
  const scoringProfiles = interactions.scoringProfiles && typeof interactions.scoringProfiles === 'object'
    ? interactions.scoringProfiles as Record<string, ProfileLike>
    : {};
  const trainingSamples: PreferenceSample[] = history.flatMap((event) => {
    if (!['like', 'superlike', 'pass'].includes(event.eventType)) return [];
    return [{
      features: extractPreferenceFeatures(user, event.profile || {}),
      label: event.eventType === 'pass' ? 0 : 1,
    }];
  });
  const model = trainPreferenceModel(trainingSamples);

  const excludedIds = new Set([
    ...(Array.isArray(interactions.likedIds) ? interactions.likedIds : []),
    ...(Array.isArray(interactions.passedIds) ? interactions.passedIds : []),
  ].map(String));

  return candidates
    .filter((candidate) => candidate?.id !== undefined && !excludedIds.has(String(candidate.id)))
    .map((candidate) => {
      const scoringProfile = scoringProfiles[String(candidate.id)] || candidate;
      const match = calculateCompatibility(user, scoringProfile);
      const name = typeof candidate.name === 'string' ? candidate.name : 'ce profil';
      const shared = match.sharedInterests;
      const candidateInterests = values(scoringProfile, 'interests', 'passions', 'tags', 'lifestyleTags');
      const observedSignals = [...candidateInterests]
        .map((interest) => interactionCounts.get(interest))
        .filter((counts): counts is { liked: number; passed: number } => Boolean(counts));
      const personalizationScore = canPersonalize && observedSignals.length
        ? Math.round(observedSignals.reduce((sum, counts) =>
          sum + (counts.liked + 1) / (counts.liked + counts.passed + 2), 0
        ) / observedSignals.length * 100)
        : null;
      const modelScore = model
        ? Math.round(model.predict(extractPreferenceFeatures(user, scoringProfile)) * 100)
        : null;
      const rankingScore = modelScore !== null
        ? modelScore
        : match.score === null
          ? personalizationScore
          : personalizationScore === null
            ? match.score
            : Math.round(match.score * 0.85 + personalizationScore * 0.15);
      const reason = match.score === null
        ? 'Ajoutez des informations de profil pour calculer une compatibilité pertinente.'
        : shared.length
          ? `Centres d’intérêt communs : ${shared.slice(0, 3).join(', ')}.${model ? ' Le classement est personnalisé selon vos interactions enregistrées.' : personalizationScore === null ? '' : ' Le classement tient aussi compte de vos interactions récentes.'}`
          : 'Score calculé à partir des informations de profil disponibles.';
      const suggestedIcebreaker = shared.length
        ? `J’ai vu qu’on aime tous les deux ${shared[0]} : qu’est-ce qui te plaît le plus ?`
        : null;

      return {
        ...candidate,
        aiMatchScore: match.score,
        aiPersonalizationScore: modelScore ?? personalizationScore,
        aiRankingScore: rankingScore,
        aiRankingMethod: model ? 'personalized-logistic-regression' : 'profile-rules-cold-start',
        aiModelSampleSize: model?.sampleSize ?? 0,
        aiBadge: match.score === null ? 'Données insuffisantes' : shared.length ? 'Centres d’intérêt communs' : 'Compatibilité calculée',
        aiReason: reason,
        sharedPoints: shared,
        serverDrivenUIConfig: {
          cardVariant: rankingScore !== null && rankingScore >= 75 ? 'rose_glow' : 'standard_premium',
          compatibilityGaugeColor: '#e20030',
          triggerBadge: shared.length ? `${shared.length} intérêt${shared.length > 1 ? 's' : ''} commun${shared.length > 1 ? 's' : ''}` : null,
          suggestedIcebreaker,
        },
      };
    })
    .sort((first, second) => (second.aiRankingScore ?? -1) - (first.aiRankingScore ?? -1));
}

export function matchProfiles(user: ProfileLike, target: ProfileLike) {
  const result = calculateCompatibility(user, target);
  const name = typeof target.name === 'string' ? target.name : 'ce profil';
  const common = result.sharedInterests;
  return {
    score: result.score,
    badge: result.score === null ? 'Données insuffisantes' : common.length ? 'Centres d’intérêt communs' : 'Compatibilité calculée',
    reason: result.score === null
      ? 'Les profils ne contiennent pas encore assez d’informations communes pour calculer une compatibilité.'
      : common.length
        ? `Vous partagez ${common.slice(0, 3).join(', ')} avec ${name}.`
        : 'Score calculé à partir des informations de profil disponibles.',
    breakdown: result.breakdown,
    sharedPoints: common,
    icebreakers: common.length ? [`J’ai vu qu’on aime tous les deux ${common[0]} : qu’est-ce qui te plaît le plus ?`] : [],
  };
}

const financialPatterns = /\b(orange money|mtn money|wave|moov money|moneygram|western union|paypal|rib|virement|crypto|bitcoin|usdt|pcs|neosurf|recharge|envoie(?:[- ]moi)?\s+(?:de\s+)?l'argent|transf(?:ère|ere)\s+de\s+l'argent)\b/i;
const abusePatterns = /\b(raciste|homophobe|pédé|pute|salope|connard|connasse|fdp|bâtard|va\s+te\s+faire|je\s+vais\s+te)\b/i;
const externalContactPatterns = /\b(whatsapp|telegram|snapchat|instagram|instgram|wa\.me|t\.me)\b|(?:\+|00)?\d[\d\s().-]{7,}\d|https?:\/\/|www\./i;

export function moderateText(text: string) {
  const financial = financialPatterns.test(text);
  const abuse = abusePatterns.test(text);
  const offPlatform = externalContactPatterns.test(text);
  const categories = [
    ...(financial ? ['financial_solicitation', 'scam'] : []),
    ...(abuse ? ['abuse'] : []),
    ...(offPlatform ? ['offplatform_redirect'] : []),
  ];

  return {
    isSafe: categories.length === 0,
    isRude: abuse,
    category: financial ? 'financial_solicitation' : abuse ? 'insult' : offPlatform ? 'offplatform_redirect' : 'none',
    categories,
    severity: financial || abuse ? 'high' : offPlatform ? 'medium' : 'none',
    reason: categories.length ? 'Signaux nécessitant une vérification selon les règles de sécurité.' : '',
    suggestedReformulation: abuse ? 'Bonjour, je souhaite échanger dans le respect.' : '',
  };
}

function tokens(value: string): string[] {
  return normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
}

export function searchProfiles(query: string, profiles: ProfileLike[]) {
  const queryTokens = [...new Set(tokens(query))];
  if (queryTokens.length === 0) return { matchedIds: [], reasoning: 'Saisissez un critère de recherche.' };

  const ranked = profiles.map((profile) => {
    const searchable = [
      profile.name,
      profile.bio,
      profile.occupation,
      profile.city,
      profile.location,
      ...(Array.isArray(profile.interests) ? profile.interests : []),
      ...(Array.isArray(profile.passions) ? profile.passions : []),
      ...(Array.isArray(profile.tags) ? profile.tags : []),
    ].filter((value) => typeof value === 'string').join(' ');
    const profileTokens = new Set(tokens(searchable));
    const matches = queryTokens.filter((token) => profileTokens.has(token));
    return { id: profile.id, score: matches.length / queryTokens.length };
  }).filter((item) => item.id !== undefined && item.score > 0)
    .sort((first, second) => second.score - first.score);

  return {
    matchedIds: ranked.map((profile) => profile.id),
    reasoning: ranked.length
      ? `Résultats classés selon les mots-clés réellement présents dans les profils (${queryTokens.length} critère${queryTokens.length > 1 ? 's' : ''}).`
      : 'Aucun profil ne contient les mots-clés recherchés dans les informations disponibles.',
  };
}

export function generateBioSuggestions(input: ProfileLike) {
  const interests = [...values(input, 'interests', 'passions')].slice(0, 3);
  const occupation = typeof input.occupation === 'string' ? input.occupation.trim() : '';
  const traits = [...values(input, 'traits', 'personality')].slice(0, 2);
  const interestText = interests.length ? interests.join(', ') : '';
  const traitsText = traits.length ? traits.join(' et ') : '';
  const occupationText = occupation ? ` Je travaille comme ${occupation}.` : '';
  const interestSentence = interestText ? ` J’aime ${interestText}.` : '';
  const traitSentence = traitsText ? ` On me décrit comme ${traitsText}.` : '';

  const bios = [
    {
      version: 'Courte',
      text: [traitsText, interestText ? `Passionné(e) par ${interestText}` : '', occupation ? `${occupation}` : 'À la recherche de belles conversations'].filter(Boolean).join(' · '),
    },
    {
      version: 'Conviviale',
      text: `Ici pour faire connaissance et partager de bons moments.${interestSentence}${traitSentence}`,
    },
    {
      version: 'Directe',
      text: `Je souhaite rencontrer quelqu’un avec qui échanger simplement et sincèrement.${occupationText}${interestSentence}`,
    },
  ];

  return { bios };
}

export function generateIcebreakers(user: ProfileLike, target: ProfileLike) {
  const compatibility = calculateCompatibility(user, target);
  const name = typeof target.name === 'string' && target.name.trim() ? target.name.trim() : null;
  const starters = compatibility.sharedInterests.slice(0, 3).map((interest) =>
    `J’ai vu qu’on aime tous les deux ${interest} : qu’est-ce qui te plaît le plus ?`
  );
  const bioTokens = typeof target.bio === 'string' ? tokens(target.bio) : [];
  const bioTopic = bioTokens.find((token) => token.length >= 5);
  if (bioTopic) starters.push(`Tu évoques ${bioTopic} dans ta bio. Tu aimerais m’en dire plus ?`);
  if (starters.length === 0) {
    starters.push(name
      ? `Bonjour ${name}, qu’aimes-tu faire pendant ton temps libre ?`
      : 'Bonjour, qu’aimes-tu faire pendant ton temps libre ?');
  }
  return [...new Set(starters)].slice(0, 3);
}

export function coachConversation(history: unknown, target: ProfileLike = {}) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      coachAdvice: 'Commencez par une question ouverte et respectueuse, liée aux informations que la personne a choisi de partager.',
      suggestedReplies: [],
      funQuestion: null,
    };
  }
  const latest = history[history.length - 1] as ProfileLike;
  const content = String(latest?.content || latest?.text || '').trim();
  if (!content) {
    return { coachAdvice: 'Le dernier message ne contient pas de texte exploitable.', suggestedReplies: [], funQuestion: null };
  }
  const safeSnippet = content.length > 100 ? `${content.slice(0, 97)}…` : content;
  const name = typeof target.name === 'string' ? target.name.trim() : '';
  const greeting = name ? `${name}, ` : '';
  return {
    coachAdvice: 'Répondez à un détail du dernier message, sans supposer d’informations qui n’y figurent pas.',
    suggestedReplies: [
      `Merci de m’en parler. Qu’est-ce qui t’a le plus marqué dans « ${safeSnippet} » ?`,
      `Je vois 😊 Tu aimerais m’en dire un peu plus ?`,
      `C’est intéressant. Comment as-tu découvert ça ?`,
    ],
    funQuestion: `${greeting}qu’est-ce qui te ferait passer une très bonne journée ?`,
  };
}

export function analyzeBehavior(metrics: ProfileLike) {
  const swipesPerMinute = number(metrics, 'swipesPerMinute');
  const identicalMessagesSent = number(metrics, 'identicalMessagesSent');
  const accountAgeHours = number(metrics, 'accountAgeHours');
  if (swipesPerMinute === null && identicalMessagesSent === null && accountAgeHours === null) {
    return {
      isBotOrSpammer: false,
      confidenceScore: 0,
      behaviorType: 'insufficient_data',
      recommendedAction: 'review',
      explanation: 'Données insuffisantes : aucune conclusion automatisée ne peut être tirée.',
    };
  }
  const rapidSwiping = swipesPerMinute !== null && swipesPerMinute >= 45;
  const repeatedMessages = identicalMessagesSent !== null && identicalMessagesSent >= 5;
  const newAccount = accountAgeHours !== null && accountAgeHours < 24;
  const hasMultipleSignals = Number(rapidSwiping) + Number(repeatedMessages) >= 2;
  const suspicious = hasMultipleSignals || (repeatedMessages && newAccount);
  return {
    isBotOrSpammer: suspicious,
    confidenceScore: suspicious ? 70 : rapidSwiping || repeatedMessages ? 40 : 15,
    behaviorType: suspicious ? repeatedMessages ? 'spammer' : 'frenetic_swiper' : 'inconclusive',
    recommendedAction: suspicious ? 'review' : 'allow',
    explanation: suspicious
      ? 'Plusieurs indicateurs d’activité inhabituelle sont présents; une revue humaine est recommandée.'
      : 'Les données transmises ne suffisent pas à établir un comportement automatisé.',
  };
}

export function assessProfileRisk(input: ProfileLike) {
  const flags = Array.isArray(input.securityFlags) ? input.securityFlags : [];
  const riskFactors: string[] = [];
  if (input.verificationStatus === 'verified' || input.isVerified === true || input.verified === true) {
    riskFactors.push('Profil vérifié par le système de vérification');
  }
  if (flags.length) riskFactors.push(...flags.map((flag: unknown) => `Signal de sécurité déclaré : ${String(flag)}`));
  const verificationKnown = input.verificationStatus !== undefined
    || input.isVerified !== undefined
    || input.verified !== undefined;
  const hasSignals = flags.length > 0 || verificationKnown;
  return {
    riskScore: hasSignals ? Math.min(100, Math.max(0, flags.length * 25 - (riskFactors.length === 1 && riskFactors[0].startsWith('Profil vérifié') ? 10 : 0))) : null,
    riskCategory: hasSignals ? flags.length >= 3 ? 'high' : flags.length ? 'review' : 'no_flags_reported' : 'insufficient_data',
    trustBadge: null,
    keyFactors: riskFactors,
    explanation: 'Évaluation limitée aux signaux fournis; elle ne certifie ni l’identité ni la fiabilité d’une personne.',
  };
}

export function assessDeceptionSignals(input: ProfileLike) {
  const signals: string[] = [];
  const accountAgeHours = number(input, 'accountAgeHours');
  const outboundSwipes24h = number(input, 'outboundSwipes24h') || 0;
  const financialMessages7d = number(input, 'financialMessages7d') || 0;
  const repeatedMessageRatio7d = number(input, 'repeatedMessageRatio7d') || 0;
  const textMessageCount7d = number(input, 'textMessageCount7d') || 0;
  const distinctPendingReports30d = number(input, 'distinctPendingReports30d') || 0;
  const blocksReceived30d = number(input, 'blocksReceived30d') || 0;
  let riskScore = 0;

  if (accountAgeHours !== null && accountAgeHours < 72 && outboundSwipes24h >= 50) {
    riskScore += 25;
    signals.push('Activité de swipe élevée sur un compte récent');
  }
  if (textMessageCount7d >= 8 && repeatedMessageRatio7d >= 0.6) {
    riskScore += 25;
    signals.push('Envoi fréquent de messages fortement répétitifs');
  }
  if (financialMessages7d > 0) {
    riskScore += Math.min(35, financialMessages7d * 20);
    signals.push('Sollicitation financière repérée dans des messages récents');
  }
  if (distinctPendingReports30d >= 3) {
    riskScore += 15;
    signals.push('Plusieurs signalements récents sont en attente de revue');
  }
  if (blocksReceived30d >= 5) {
    riskScore += 10;
    signals.push('Plusieurs blocages récents par des membres différents');
  }

  const independentSignals = signals.length;
  const recommendedAction = riskScore >= 45 && independentSignals >= 2
    ? 'human_review'
    : riskScore >= 25
      ? 'monitor'
      : 'no_action';

  return {
    riskScore: Math.min(100, riskScore),
    riskCategory: riskScore >= 60 ? 'high' : riskScore >= 25 ? 'review' : 'low',
    recommendedAction,
    isFake: null,
    isBlocked: false,
    signals,
    explanation: 'Score heuristique fondé sur des signaux comportementaux; il ne prouve pas une fraude et ne bloque jamais automatiquement un compte.',
  };
}

export function compareQuizAnswers(userAnswers: ProfileLike, targetAnswers: ProfileLike) {
  const questionKeys = ['1', '2', '3'];
  const answered = questionKeys.filter((key) =>
    typeof userAnswers?.[key] === 'string' && userAnswers[key].trim()
    && typeof targetAnswers?.[key] === 'string' && targetAnswers[key].trim()
  );
  if (answered.length === 0) {
    return { score: null, comment: 'Répondez aux questions tous les deux pour comparer vos réponses.' };
  }
  const matches = answered.filter((key) => normalize(userAnswers[key]) === normalize(targetAnswers[key])).length;
  const score = Math.round(matches / answered.length * 100);
  return {
    score,
    comment: `${matches} réponse${matches === 1 ? '' : 's'} identique${matches === 1 ? '' : 's'} sur ${answered.length} question${answered.length === 1 ? '' : 's'} comparée${answered.length === 1 ? '' : 's'}. Ce résultat décrit uniquement vos réponses au quiz.`,
  };
}

export function answerFaq(question: string, category?: string) {
  const terms = tokens(question);
  const has = (...keywords: string[]) => keywords.some((keyword) => terms.some((term) => tokens(keyword).includes(term)));
  if (has('selfie', 'badge', 'vérifié', 'verification', 'vérification', 'biométrique')) {
    return {
      answer: '**La vérification de profil est momentanément indisponible.** Bavel n’envoie pas de selfie et n’attribue pas de badge tant que son moteur de vérification n’est pas prêt.',
      category: 'Profil & Vérification',
      suggestedQuestions: ['Comment modifier mon profil ?', 'Comment signaler un profil ?', 'Comment protéger mon compte ?'],
      action: null,
    };
  }
  if (has('photo', 'intime', 'nsfw', 'flouter', 'sensible')) {
    return {
      answer: '**L’analyse automatique des images n’est pas activée.** Les photos ne sont pas déclarées comme analysées par l’IA; signalez tout contenu inapproprié via les outils de signalement.',
      category: 'Sécurité & Modération',
      suggestedQuestions: ['Comment signaler un message ?', 'Comment bloquer un profil ?', 'Comment protéger mes informations ?'],
      action: null,
    };
  }
  if (has('match', 'like', 'likes', 'coeur', 'cœur', 'découvrir')) {
    return {
      answer: 'Dans **Découvrir**, vous pouvez consulter les profils et envoyer un like. Un match est créé lorsque les deux personnes se sont likées.',
      category: 'Matchs & Découverte',
      suggestedQuestions: ['Comment modifier mes filtres ?', 'Comment envoyer un message ?', 'Comment bloquer un profil ?'],
      action: { label: 'Ouvrir Découvrir', type: 'open_discover' },
    };
  }
  if (has('crédit', 'crédits', 'paiement', 'payer', 'recharge', 'remboursement')) {
    return {
      answer: 'Les tarifs et moyens de paiement disponibles sont affichés dans **Recharger**. Vérifiez le récapitulatif avant de confirmer un achat. Bavel ne promet pas de crédit gratuit ou de remboursement automatique.',
      category: 'Crédits & Paiements',
      suggestedQuestions: ['Où consulter mes crédits ?', 'Comment contacter le support ?', 'Comment gérer mon abonnement ?'],
      action: { label: 'Voir les crédits', type: 'buy_credits' },
    };
  }
  if (has('sécurité', 'securite', 'signaler', 'bloquer', 'abus', 'harcèlement', 'harcelement')) {
    return {
      answer: 'Utilisez **Signaler** ou **Bloquer** depuis le profil ou la conversation concernée. En cas de danger immédiat, contactez les services d’urgence locaux.',
      category: 'Sécurité',
      suggestedQuestions: ['Comment signaler un message ?', 'Comment bloquer un profil ?', 'Comment protéger mes informations ?'],
      action: null,
    };
  }
  if (has('message', 'messagerie', 'conversation', 'chat', 'appels', 'appel', 'vidéo', 'video')) {
    return {
      answer: 'Vous pouvez discuter avec vos matchs dans **Discussions**. Les appels en direct ne sont pas confirmés comme disponibles par cette aide; vérifiez les commandes visibles dans l’application.',
      category: 'Messagerie',
      suggestedQuestions: ['Comment faire un match ?', 'Comment signaler une conversation ?', 'Comment bloquer un profil ?'],
      action: null,
    };
  }
  return {
    answer: `Je n’ai pas trouvé de réponse vérifiée à cette question${category ? ` dans la catégorie « ${category} »` : ''}. Consultez les rubriques d’aide ou contactez le support Bavel.`,
    category: 'Aide Bavel',
    suggestedQuestions: ['Comment faire un match ?', 'Comment modifier mon profil ?', 'Comment signaler un problème ?'],
    action: null,
  };
}
