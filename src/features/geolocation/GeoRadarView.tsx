import React, { useState, useMemo } from 'react';
import { MapPin, RefreshCw, SlidersHorizontal, AlertCircle, Radio } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { geoService } from '../../services/geoService';
import { Profile } from '../../types';
import { Badge } from '../../components/ui/badge';
import { useUX } from '../../context/UXContext';

interface GeoRadarViewProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
  onClose?: () => void;
}

export const GeoRadarView: React.FC<GeoRadarViewProps> = React.memo(({
  profiles,
  onSelectProfile,
  onClose,
}) => {
  const { coords, loading, error, fetchPosition } = useGeolocation({
    enableHighAccuracy: true,
    autoFetch: true,
  });

  const { triggerFeedback } = useUX();
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(15);

  // Only show distances when both the user's position and a profile's coordinates are known.
  const profilesWithDistance = useMemo(() => {
    if (!coords) return [];

    return profiles.flatMap((profile) => {
      const location = profile as Profile & { lat?: number | null; lon?: number | null };
      const latitude = location.lat;
      const longitude = location.lon;

      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return [];
      }

      return [{
        ...profile,
        calculatedDistance: geoService.calculateDistance(
          coords.latitude,
          coords.longitude,
          latitude,
          longitude
        ),
      }];
    });
  }, [profiles, coords]);

  // Filter profiles within radius
  const nearbyProfiles = useMemo(() => {
    return profilesWithDistance
      .filter((p) => p.calculatedDistance <= maxRadiusKm)
      .sort((a, b) => a.calculatedDistance - b.calculatedDistance);
  }, [profilesWithDistance, maxRadiusKm]);

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-white rounded-3xl p-4 sm:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-[#e20030] flex items-center justify-center border border-rose-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
              Radar de Proximité
              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/30">
                GPS Réel
              </Badge>
            </h2>
            <p className="text-xs text-neutral-400">
              {coords
                ? `Position: ${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}° (±${Math.round(coords.accuracy || 0)}m)`
                : 'Recherche de votre position...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              triggerFeedback('light');
              fetchPosition();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Rafraîchir la position GPS"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors text-xs font-bold"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Permission alert if denied */}
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Radius Slider Control */}
      <div className="bg-neutral-800/60 rounded-2xl p-4 my-3 border border-neutral-700/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
            Rayon de recherche
          </span>
          <span className="text-xs font-black text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            {maxRadiusKm} km
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={maxRadiusKm}
          onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
          className="w-full accent-[#e20030] cursor-pointer h-1.5 bg-neutral-700 rounded-lg appearance-none"
        />
        <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
          <span>1 km (Proche)</span>
          <span>25 km</span>
          <span>50 km (Région)</span>
        </div>
      </div>

      {/* Nearby Results List */}
      <div className="space-y-2 mt-1">
        <div className="flex justify-between items-center text-xs font-bold text-neutral-400 px-1">
          <span>{nearbyProfiles.length} profils trouvés dans un rayon de {maxRadiusKm} km</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {nearbyProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                triggerFeedback('light');
                onSelectProfile(p);
              }}
              className="flex items-center space-x-2.5 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 transition-colors text-left border border-neutral-700/40"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-700">
                {(p as any).img || (p as any).photos?.[0] ? (
                  <img
                    src={(p as any).img || (p as any).photos?.[0]}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center font-bold text-neutral-300">
                    {p.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black truncate">{p.name}, {p.age}</p>
                <p className="text-[10px] text-rose-400 font-medium flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {p.calculatedDistance.toFixed(1)} km
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

GeoRadarView.displayName = 'GeoRadarView';
