/**
 * Utilities used by the encounters UI to display trustworthy location data.
 */
export const cleanCity = (location?: string, city?: string): string => {
  if (city && city.trim()) return city.split(',')[0].trim();
  if (!location) return 'Emplacement indisponible';
  return location.split(',')[0].trim() || 'Emplacement indisponible';
};

export const calculateHaversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistanceBadge = (distanceKm: number): string => {
  if (!Number.isFinite(distanceKm)) return 'Distance indisponible';
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round((distanceKm * 1000) / 10) * 10);
    return `à ~${meters} m`;
  }
  return `à ~${Math.round(distanceKm)} km`;
};

export const getProfileDistanceInfo = (
  profile: any,
  userCoords?: { latitude: number; longitude: number } | null
): { distanceKm: number; text: string } => {
  if (
    Number.isFinite(userCoords?.latitude) &&
    Number.isFinite(userCoords?.longitude) &&
    Number.isFinite(profile?.latitude) &&
    Number.isFinite(profile?.longitude)
  ) {
    const distanceKm = calculateHaversineKm(
      userCoords.latitude,
      userCoords.longitude,
      profile.latitude,
      profile.longitude
    );
    return { distanceKm, text: formatDistanceBadge(distanceKm) };
  }

  if (typeof profile?.distanceKm === 'number' && Number.isFinite(profile.distanceKm)) {
    return {
      distanceKm: profile.distanceKm,
      text: formatDistanceBadge(profile.distanceKm),
    };
  }

  return { distanceKm: Number.POSITIVE_INFINITY, text: 'Distance indisponible' };
};
