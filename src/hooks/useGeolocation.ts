import { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinates, geoService } from '../services/geoService';

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  autoFetch?: boolean;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { enableHighAccuracy = true, autoFetch = true, watch = false } = options;

  const [coords, setCoords] = useState<Coordinates | null>(() => {
    try {
      const saved = localStorage.getItem('bavel_last_coords');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown');
  const unwatchRef = useRef<(() => void) | null>(null);

  // Check permission query if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setPermission(status.state);
          status.onchange = () => setPermission(status.state);
        })
        .catch(() => setPermission('unknown'));
    }
  }, []);

  const fetchPosition = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newCoords = await geoService.getCurrentPosition({ enableHighAccuracy });
      setCoords(newCoords);
      try {
        localStorage.setItem('bavel_last_coords', JSON.stringify(newCoords));
      } catch {}
      return newCoords;
    } catch (err: any) {
      setError(err.message || 'Erreur de géolocalisation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [enableHighAccuracy]);

  useEffect(() => {
    if (autoFetch && !coords) {
      fetchPosition();
    }

    if (watch) {
      unwatchRef.current = geoService.watchPosition(
        (newCoords) => {
          setCoords(newCoords);
          try {
            localStorage.setItem('bavel_last_coords', JSON.stringify(newCoords));
          } catch {}
        },
        (err) => setError(err.message),
        { enableHighAccuracy }
      );
    }

    return () => {
      if (unwatchRef.current) {
        unwatchRef.current();
      }
    };
  }, [autoFetch, watch, fetchPosition, enableHighAccuracy]);

  const getDistanceTo = useCallback(
    (targetLat: number, targetLon: number): number | null => {
      if (!coords) return null;
      return geoService.calculateDistance(
        coords.latitude,
        coords.longitude,
        targetLat,
        targetLon
      );
    },
    [coords]
  );

  return {
    coords,
    loading,
    error,
    permission,
    fetchPosition,
    getDistanceTo,
  };
}
