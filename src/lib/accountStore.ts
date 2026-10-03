export function isCompletedProfile(profile: any): boolean {
  if (!profile) return false;
  if (profile.onboardingCompleted === true) return true;
  const hasName = Boolean(profile.name && profile.name.trim() && profile.name !== 'Membre' && profile.name !== 'Guest');
  const hasDetails = Boolean(
    profile.gender ||
      profile.birthday ||
      profile.city ||
      profile.bio ||
      profile.age ||
      profile.purpose ||
      profile.height ||
      profile.job ||
      profile.studies ||
      (profile.details && Object.values(profile.details).some((v) => Boolean(v)))
  );
  return hasName && hasDetails;
}
