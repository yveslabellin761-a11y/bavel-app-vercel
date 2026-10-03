type ProfileRecord = Record<string, any>;

const PUBLIC_DETAIL_KEYS = new Set([
  'height',
  'children',
  'alcohol',
  'education',
  'personality',
  'pets',
  'religion',
  'zodiac',
  'languages',
  'relation',
  'sexuality',
  'smoking',
  'prompts',
  'promptQuestion',
  'promptAnswer'
]);

function toPublicDetails(details: unknown): Record<string, unknown> | string[] {
  if (Array.isArray(details)) {
    return details.filter((value): value is string => typeof value === 'string').map(value => value.slice(0, 240));
  }
  if (!details || typeof details !== 'object') return {};

  const publicDetails: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (!PUBLIC_DETAIL_KEYS.has(key)) continue;
    if (key === 'prompts' && Array.isArray(value)) {
      const prompts = value
        .filter((prompt): prompt is Record<string, unknown> =>
          Boolean(prompt) && typeof prompt === 'object' && !Array.isArray(prompt)
        )
        .map(prompt => ({
          question: typeof prompt.question === 'string' ? prompt.question.slice(0, 240) : '',
          answer: typeof prompt.answer === 'string' ? prompt.answer.slice(0, 500) : ''
        }))
        .filter(prompt => prompt.question && prompt.answer);
      if (prompts.length) publicDetails[key] = prompts;
    } else if (typeof value === 'string') {
      publicDetails[key] = value.slice(0, 240);
    }
  }
  return publicDetails;
}

export function toPublicProfile(
  profile: ProfileRecord,
  options: {
    showOnlineStatus?: boolean;
    showDistance?: boolean;
  } = {}
) {
  const photos = Array.isArray(profile.photos)
    ? profile.photos.filter((photo: unknown): photo is string => typeof photo === 'string' && photo.length > 0)
    : [];
  const showOnlineStatus = options.showOnlineStatus !== false;
  const showDistance = options.showDistance !== false;
  const lastActiveAt = typeof profile.last_active_at === 'string'
    ? profile.last_active_at
    : null;
  const lastActiveTimestamp = lastActiveAt ? Date.parse(lastActiveAt) : Number.NaN;
  const now = Date.now();
  const isRecentlyActive = Number.isFinite(lastActiveTimestamp) &&
    lastActiveTimestamp <= now &&
    lastActiveTimestamp >= now - 90_000;
  const isOnline = Boolean(profile.is_online ?? profile.isOnline) && isRecentlyActive;
  const publicProfile: Record<string, unknown> = {
    id: String(profile.id),
    user_id: String(profile.id),
    name: profile.name || 'Membre',
    age: profile.age,
    gender: profile.gender,
    city: showDistance ? profile.city || '' : '',
    location: showDistance ? profile.city || '' : '',
    country: profile.country || '',
    country_code: profile.country_code || '',
    bio: profile.bio || '',
    job: profile.job || '',
    studies: profile.studies || '',
    alcohol: profile.alcohol || '',
    personality: profile.personality || '',
    zodiac: profile.zodiac || '',
    pets: profile.pets || '',
    photos,
    img: photos[0] || '',
    avatarUrl: profile.avatar_url || photos[0] || '',
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    details: toPublicDetails(profile.details),
    key_question: profile.key_question || '',
    verified: Boolean(profile.is_verified),
    is_verified: Boolean(profile.is_verified),
    createdAt: profile.created_at || null
  };

  if (showOnlineStatus) {
    publicProfile.online = isOnline;
    publicProfile.is_online = isOnline;
    publicProfile.last_active_at = lastActiveAt;
  }

  if (showDistance && typeof profile.distanceKm === 'number' && Number.isFinite(profile.distanceKm)) {
    const roundedDistanceKm = Math.round(profile.distanceKm / 5) * 5;
    publicProfile.distanceKm = roundedDistanceKm;
    publicProfile.distanceText = roundedDistanceKm === 0
      ? 'à moins de 5 km'
      : `à environ ${roundedDistanceKm} km`;
  } else if (showDistance && typeof profile.distanceText === 'string') {
    publicProfile.distanceText = profile.distanceText;
  }

  for (const key of [
    'isNewUser',
    'tagline',
    'bavelAiScore',
    'bavelAiReason',
    'bavelAiIcebreaker',
    'bavelAiShared',
    'compatibility_score',
    'shared_interests'
  ]) {
    if (key in profile) publicProfile[key] = profile[key];
  }

  return publicProfile;
}
