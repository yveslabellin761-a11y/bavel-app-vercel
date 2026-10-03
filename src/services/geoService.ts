/**
 * Geospatial computation and real-time GPS location services.
 * Implements Haversine distance calculations and provides PostGIS / Redis Geo queries for backend indexing.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
}

export interface GeoLocationState {
  coords: Coordinates | null;
  loading: boolean;
  error: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
}

/**
 * Calculates accurate great-circle distance between two GPS coordinates in kilometers using the Haversine formula.
 */
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

/**
 * Generates a PostGIS query for nearby activities. Inputs are bounded before
 * interpolation because PostgreSQL does not accept bind parameters in this SQL template.
 */
export function generatePostGisRadiusQuery(lat: number, lon: number, radiusKm: number, limit = 50): string {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError('Latitude must be a finite number between -90 and 90.');
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new RangeError('Longitude must be a finite number between -180 and 180.');
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
    throw new RangeError('Radius must be a finite number greater than 0 and at most 500 km.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new RangeError('Limit must be an integer between 1 and 200.');
  }

  const radiusMeters = radiusKm * 1000;
  return `
    SELECT
      activity.id,
      extensions.ST_Distance(
        activity.location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(${lon}, ${lat}), 4326)::extensions.geography
      ) / 1000 AS distance_km
    FROM public.activities AS activity
    WHERE activity.location IS NOT NULL
      AND extensions.ST_DWithin(
      activity.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(${lon}, ${lat}), 4326)::extensions.geography,
      ${radiusMeters}
    )
    ORDER BY distance_km ASC
    LIMIT ${limit};
  `.trim();
}

/**
 * Generates Redis GEOSEARCH command string for high throughput in-memory location matching.
 */
export function generateRedisGeoCommand(lat: number, lon: number, radiusKm: number): string {
  return `GEOSEARCH user_locations FROMLONLAT ${lon} ${lat} BYRADIUS ${radiusKm} km WITHDIST WITHCOORD ASC`;
}

export const geoService = {
  getCurrentPosition: async (options?: PositionOptions): Promise<Coordinates> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      throw new Error("La géolocalisation n'est pas supportée par votre navigateur.");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed
          });
        },
        (err) => {
          let msg = "Impossible d'obtenir la position GPS.";
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Autorisation de localisation refusée.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Signal GPS introuvable.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Délai de géolocalisation dépassé.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
          ...options
        }
      );
    });
  },

  watchPosition: (
    onSuccess: (coords: Coordinates) => void,
    onError: (err: Error) => void,
    options?: PositionOptions
  ): (() => void) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      onError(new Error('Géolocalisation indisponible.'));
      return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onSuccess({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed
        });
      },
      (err) => onError(new Error(err.message)),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
        ...options
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  },

  calculateDistance: calculateHaversineDistanceKm,
  generatePostGisRadiusQuery,
  generateRedisGeoCommand
};
