/**
 * Geographic distance utilities for Worldwide cities (Badoo Global style)
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export const WORLDWIDE_CITIES_COORDINATES: Record<string, Coordinate> = {
  // Ivory Coast
  'abidjan': { lat: 5.3600, lng: -4.0083 },
  'yamoussoukro': { lat: 6.8276, lng: -5.2796 },
  'bouaké': { lat: 7.6931, lng: -5.0304 },
  'bouake': { lat: 7.6931, lng: -5.0304 },
  'san pedro': { lat: 4.7485, lng: -6.6363 },
  'korhogo': { lat: 9.4582, lng: -5.6295 },
  'man': { lat: 7.4125, lng: -7.5538 },
  'assinie': { lat: 5.1278, lng: -3.2844 },
  'grand-bassam': { lat: 5.2114, lng: -3.7388 },
  // France & Europe
  'paris': { lat: 48.8566, lng: 2.3522 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  'marseille': { lat: 43.2965, lng: 5.3698 },
  'bordeaux': { lat: 44.8378, lng: -0.5792 },
  'bruxelles': { lat: 50.8503, lng: 4.3517 },
  'genève': { lat: 46.2044, lng: 6.1432 },
  'geneve': { lat: 46.2044, lng: 6.1432 },
  'londres': { lat: 51.5074, lng: -0.1278 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  // West & Central Africa
  'dakar': { lat: 14.7167, lng: -17.4677 },
  'douala': { lat: 4.0511, lng: 9.7679 },
  'yaoundé': { lat: 3.8480, lng: 11.5021 },
  'yaounde': { lat: 3.8480, lng: 11.5021 },
  'lomé': { lat: 6.1372, lng: 1.2125 },
  'cotonou': { lat: 6.3654, lng: 2.4183 },
  'ouagadougou': { lat: 12.3714, lng: -1.5197 },
  'bamako': { lat: 12.6392, lng: -8.0029 },
  'conakry': { lat: 9.6412, lng: -13.5784 },
  'kinshasa': { lat: -4.4419, lng: 15.2663 },
  'libreville': { lat: 0.4162, lng: 9.4673 },
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'accra': { lat: 5.6037, lng: -0.1870 },
  // North Africa
  'casablanca': { lat: 33.5731, lng: -7.5898 },
  'alger': { lat: 36.7538, lng: 3.0588 },
  'tunis': { lat: 36.8065, lng: 10.1815 },
  // Americas & Rest of World
  'montréal': { lat: 45.5017, lng: -73.5673 },
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'são paulo': { lat: -23.5505, lng: -46.6333 },
};

/**
 * Calculates distance in km using the Haversine formula
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Returns the distance between two cities worldwide.
 * If they are the same city, returns a realistic inner-city distance (2km to 15km).
 */
export function getCityDistance(city1: string, city2: string, profileId?: string): number {
  if (!city1 || !city2) return 5;
  const c1 = city1.trim().toLowerCase();
  const c2 = city2.trim().toLowerCase();

  if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) {
    if (profileId) {
      const charSum = profileId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return (charSum % 12) + 2;
    }
    return 5;
  }

  const coord1 = WORLDWIDE_CITIES_COORDINATES[c1] || { lat: 48.8566, lng: 2.3522 }; // default Paris / Global
  const coord2 = WORLDWIDE_CITIES_COORDINATES[c2] || { lat: 14.7167, lng: -17.4677 };

  let dist = calculateHaversineDistance(coord1.lat, coord1.lng, coord2.lat, coord2.lng);

  if (profileId) {
    const charSum = profileId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    dist += (charSum % 10) - 5;
  }
  
  return Math.max(2, dist);
}

/**
 * Returns the distance from the user's live coordinates (if enabled) to a target profile's city.
 * If user coordinates are not available, falls back to city-to-city distance.
 */
export function getLiveDistance(
  userCoordinates: Coordinate | null,
  userCity: string,
  profileCity: string,
  profileId?: string
): number {
  if (userCoordinates) {
    const pCity = profileCity.trim().toLowerCase();
    const coord2 = WORLDWIDE_CITIES_COORDINATES[pCity] || { lat: 48.8566, lng: 2.3522 };
    let dist = calculateHaversineDistance(userCoordinates.lat, userCoordinates.lng, coord2.lat, coord2.lng);
    
    // Add stable perturbation to make it organic and consistent for each profile
    if (profileId) {
      const charSum = profileId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      dist += (charSum % 6) - 3;
    }
    return Math.max(1, Math.round(dist));
  }
  return getCityDistance(userCity, profileCity, profileId);
}
