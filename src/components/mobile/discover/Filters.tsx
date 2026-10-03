import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map as MapIcon, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil
} from 'lucide-react';
import { User } from '../../../types';
import { WORLD_LOCATIONS } from '../../../data/worldCities';
import { authFetch } from '../../../lib/authFetch';

export function LocationPickerSheet({
  currentLocation,
  onClose,
  onSelectLocation
}: {
  currentLocation?: string;
  onClose: () => void;
  onSelectLocation: (location: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<{ name: string; region?: string; country: string; displayName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const query = searchQuery.trim().toLowerCase();

  // Real-time worldwide geocoding search across all cities in the world
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setOnlineResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const fetchGeo = async () => {
      try {
        const photonRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=8&lang=fr`,
          { signal: controller.signal }
        );
        if (photonRes.ok) {
          const data = await photonRes.json();
          if (data && data.features && data.features.length > 0) {
            const parsed = data.features
              .map((f: any) => {
                const props = f.properties || {};
                const name = props.name || props.city || props.town || props.village;
                const country = props.country || '';
                const state = props.state || props.county || '';
                if (!name) return null;
                const displayName = country ? `${name}, ${country}` : name;
                return {
                  name,
                  region: state,
                  country,
                  displayName
                };
              })
              .filter(Boolean);

            const uniqueMap = new Map();
            parsed.forEach((item: any) => {
              if (!uniqueMap.has(item.displayName.toLowerCase())) {
                uniqueMap.set(item.displayName.toLowerCase(), item);
              }
            });

            setOnlineResults(Array.from(uniqueMap.values()));
            setIsLoading(false);
            return;
          }
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }

      // Fallback to Nominatim open geocoding API
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=8&accept-language=fr`,
          { signal: controller.signal }
        );
        if (nomRes.ok) {
          const data = await nomRes.json();
          const parsed = data.map((item: any) => {
            const parts = item.display_name.split(',').map((s: string) => s.trim());
            const name = parts[0];
            const country = parts[parts.length - 1];
            return {
              name,
              country,
              displayName: `${name}, ${country}`
            };
          });
          const uniqueMap = new Map();
          parsed.forEach((item: any) => {
            if (!uniqueMap.has(item.displayName.toLowerCase())) {
              uniqueMap.set(item.displayName.toLowerCase(), item);
            }
          });
          setOnlineResults(Array.from(uniqueMap.values()));
        }
      } catch (e: any) {
        // Silent catch
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchGeo, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const filteredCities = WORLD_LOCATIONS.filter(city => {
    if (!query) return true;
    return (
      city.name.toLowerCase().includes(query) ||
      city.region.toLowerCase().includes(query) ||
      city.country.toLowerCase().includes(query)
    );
  });

  const dynamicSuggestions = useMemo(() => {
    if (!query) return [];
    const trimmed = searchQuery.trim();
    const suggestions: { name: string; subtitle?: string }[] = [];

    // Always include exact typed query first
    suggestions.push({
      name: trimmed,
      subtitle: 'Ville ou pays dans le monde'
    });

    if (!trimmed.includes(',')) {
      suggestions.push({ name: `${trimmed}, France`, subtitle: 'Ville en France' });
      suggestions.push({ name: `${trimmed}, Côte d'Ivoire`, subtitle: 'Ville en Côte d\'Ivoire' });
      suggestions.push({ name: `${trimmed}, Sénégal`, subtitle: 'Ville au Sénégal' });
      suggestions.push({ name: `${trimmed}, Canada`, subtitle: 'Ville au Canada' });
      suggestions.push({ name: `${trimmed}, Belgique`, subtitle: 'Ville en Belgique' });
      suggestions.push({ name: `${trimmed}, Suisse`, subtitle: 'Ville en Suisse' });
    }

    return suggestions;
  }, [searchQuery, query]);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      className="fixed inset-0 bg-white z-[200] flex flex-col pt-10 h-[100dvh]"
    >
      {/* Search Header */}
      <div className="px-4 py-3 flex items-center space-x-3 border-b border-gray-100 shrink-0">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" strokeWidth={2.5} />
          </div>
          <input
            type="text"
            autoFocus
            placeholder="Saisir n'importe quelle ville ou pays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F5F7] rounded-full py-2.5 pl-9 pr-10 text-[14.5px] font-medium text-black placeholder-gray-400 outline-none focus:ring-1 focus:ring-black"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
            >
              <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-black font-semibold text-[14.5px] px-1 cursor-pointer"
        >
          Annuler
        </button>
      </div>

      {/* Location List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-gray-100">
        {!searchQuery && (
          <button
            onClick={() => onSelectLocation(currentLocation || 'Emplacement actuel')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-black shrink-0">
                <Navigation className="w-4 h-4 fill-black text-black" style={{ transform: 'rotate(45deg)' }} />
              </div>
              <div>
                <div className="text-[14.5px] font-bold text-black">Emplacement actuel</div>
                <div className="text-[12.5px] text-gray-500 font-normal">{currentLocation || 'Détecté automatiquement'}</div>
              </div>
            </div>
            {(!currentLocation || currentLocation.includes('Emplacement actuel')) && (
              <Check className="w-4 h-4 text-[#e20030]" strokeWidth={3} />
            )}
          </button>
        )}

        {!searchQuery && (
          <div className="px-4 py-2 bg-gray-50/70 border-y border-gray-100">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Villes populaires</span>
          </div>
        )}

        {/* Local matching cities */}
        {filteredCities.map((city, idx) => {
          const displayName = (city as any).isCurrent
            ? `Emplacement actuel (${city.name})`
            : `${city.name}, ${city.country}`;
          const isSelected = currentLocation === displayName || currentLocation === `${city.name}, ${city.region}, ${city.country}`;

          return (
            <button
              key={`local-${idx}`}
              onClick={() => onSelectLocation(displayName)}
              className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                  <MapPin className="w-4 h-4" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[14.5px] font-semibold text-black">{city.name}</div>
                  <div className="text-[12px] text-gray-500">{city.region ? `${city.region}, ${city.country}` : city.country}</div>
                </div>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-[#e20030]" strokeWidth={3} />
              )}
            </button>
          );
        })}

        {/* Real-time World Geocoding Online Results */}
        {searchQuery && onlineResults.length > 0 && (
          <>
            <div className="px-4 py-2 bg-gray-50/70 border-y border-gray-100 flex items-center justify-between">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Résultats monde réel</span>
              {isLoading && <span className="text-[11px] text-[#e20030] font-semibold animate-pulse">Recherche...</span>}
            </div>
            {onlineResults.map((item, idx) => {
              if (filteredCities.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                return null;
              }
              const isSelected = currentLocation === item.displayName;
              return (
                <button
                  key={`online-${idx}`}
                  onClick={() => onSelectLocation(item.displayName)}
                  className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-[#e20030] shrink-0">
                      <MapPin className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-[14.5px] font-semibold text-black">{item.name}</div>
                      <div className="text-[12px] text-gray-500">{item.country ? (item.region ? `${item.region}, ${item.country}` : item.country) : 'Localisation internationale'}</div>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-[#e20030]" strokeWidth={3} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* Dynamic Fallback Suggestions */}
        {searchQuery && (
          <>
            <div className="px-4 py-2 bg-gray-50/70 border-y border-gray-100 flex items-center justify-between">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Suggestions pour "{searchQuery}"</span>
              {isLoading && onlineResults.length === 0 && (
                <span className="text-[11px] text-[#e20030] font-semibold animate-pulse">Recherche dans le monde...</span>
              )}
            </div>
            {dynamicSuggestions.map((sug, idx) => {
              if (
                filteredCities.some(c => c.name.toLowerCase() === sug.name.toLowerCase()) ||
                onlineResults.some(o => o.displayName.toLowerCase() === sug.name.toLowerCase())
              ) {
                return null;
              }
              return (
                <button
                  key={`sug-${idx}`}
                  onClick={() => onSelectLocation(sug.name)}
                  className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                      <Search className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-[14.5px] font-semibold text-black">{sug.name}</div>
                      {sug.subtitle && <div className="text-[12px] text-gray-500">{sug.subtitle}</div>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              );
            })}
          </>
        )}
      </div>
    </motion.div>
  );
}

export function HeightFilterSheet({
  currentValue,
  onClose,
  onSave
}: {
  currentValue?: string;
  onClose: () => void;
  onSave: (val: string) => void;
}) {
  const MIN_H = 140;
  const MAX_H = 220;

  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

  const parseCurrent = (): [number, number] => {
    if (!currentValue || currentValue === 'Tous' || currentValue === 'Peu importe') {
      return [MIN_H, MAX_H];
    }
    if (currentValue.startsWith('Moins de ')) {
      const match = currentValue.match(/\d+/);
      const max = match ? parseInt(match[0]) : MAX_H;
      return [MIN_H, max];
    }
    if (currentValue.startsWith('Plus de ')) {
      const match = currentValue.match(/\d+/);
      const min = match ? parseInt(match[0]) : MIN_H;
      return [min, MAX_H];
    }
    if (currentValue.includes(' et ') || currentValue.includes(' - ')) {
      const matches = currentValue.match(/\d+/g);
      if (matches && matches.length >= 2) {
        return [parseInt(matches[0]), parseInt(matches[1])];
      }
    }
    return [MIN_H, MAX_H];
  };

  const [range, setRange] = useState<[number, number]>(parseCurrent);

  const cmToFeetInches = (cm: number) => {
    const totalInches = Math.round(cm / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return `${ft}'${inch}"`;
  };

  const getDisplayText = () => {
    const [min, max] = range;
    if (min <= MIN_H && max >= MAX_H) return 'Peu importe';
    if (min <= MIN_H) return `Moins de ${max} cm (${cmToFeetInches(max)})`;
    if (max >= MAX_H) return `Plus de ${min} cm (${cmToFeetInches(min)})`;
    return `Entre ${min} cm (${cmToFeetInches(min)}) et ${max} cm (${cmToFeetInches(max)})`;
  };

  const getValueFromX = (clientX: number) => {
    if (!trackRef.current) return MIN_H;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(MIN_H + pct * (MAX_H - MIN_H));
  };

  const handlePointerDown = (thumb: 'min' | 'max', e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
    setActiveThumb(thumb);
  };

  const handlePointerMove = (thumb: 'min' | 'max', e: React.PointerEvent) => {
    if (activeThumb !== thumb) return;
    const val = getValueFromX(e.clientX);
    if (thumb === 'min') {
      setRange(([_, max]) => [Math.min(val, max), max]);
    } else {
      setRange(([min, _]) => [min, Math.max(val, min)]);
    }
  };

  const handlePointerUp = (thumb: 'min' | 'max', e: React.PointerEvent) => {
    if (activeThumb === thumb) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setActiveThumb(null);
    }
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    const val = getValueFromX(e.clientX);
    const distMin = Math.abs(val - range[0]);
    const distMax = Math.abs(val - range[1]);
    if (distMin < distMax) {
      setRange([Math.min(val, range[1]), range[1]]);
    } else {
      setRange([range[0], Math.max(val, range[0])]);
    }
  };

  const minPct = ((range[0] - MIN_H) / (MAX_H - MIN_H)) * 100;
  const maxPct = ((range[1] - MIN_H) / (MAX_H - MIN_H)) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 z-[220] flex flex-col justify-end">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white rounded-t-[28px] px-6 pt-6 pb-8 w-full select-none"
      >
        <h3 className="text-[18px] font-bold text-black text-center mb-8 tracking-tight">
          Taille
        </h3>

        <div className="text-[15px] font-semibold text-black mb-8 px-1">
          {getDisplayText()}
        </div>

        {/* Dual Slider Track */}
        <div className="px-2 mb-10">
          <div 
            ref={trackRef}
            onClick={handleTrackClick}
            className="relative w-full h-[2px] bg-gray-200 my-6 flex items-center cursor-pointer touch-none"
          >
            {/* Selected range line */}
            <div 
              className="absolute h-[2px] bg-black pointer-events-none"
              style={{
                left: `${minPct}%`,
                width: `${maxPct - minPct}%`
              }}
            />

            {/* Left Thumb (Min) */}
            <div 
              onPointerDown={(e) => handlePointerDown('min', e)}
              onPointerMove={(e) => handlePointerMove('min', e)}
              onPointerUp={(e) => handlePointerUp('min', e)}
              onPointerCancel={(e) => handlePointerUp('min', e)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-black shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center touch-none z-10 hover:scale-105 active:scale-110 transition-transform"
              style={{ left: `${minPct}%` }}
            />

            {/* Right Thumb (Max) */}
            <div 
              onPointerDown={(e) => handlePointerDown('max', e)}
              onPointerMove={(e) => handlePointerMove('max', e)}
              onPointerUp={(e) => handlePointerUp('max', e)}
              onPointerCancel={(e) => handlePointerUp('max', e)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-black shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center touch-none z-10 hover:scale-105 active:scale-110 transition-transform"
              style={{ left: `${maxPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button 
            onClick={() => {
              onSave('');
            }}
            className="text-[15px] font-semibold text-black hover:opacity-70 transition-opacity cursor-pointer px-2"
          >
            Retirer filtre
          </button>
          <button 
            onClick={() => {
              onSave(getDisplayText());
            }}
            className="bg-black hover:bg-gray-900 text-white font-extrabold text-[15px] px-9 py-3 rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            OK
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function OptionFilterSheet({ 
  activeKey, 
  currentValue, 
  onClose, 
  onSave 
}: { 
  activeKey: string; 
  currentValue: string; 
  onClose: () => void; 
  onSave: (val: string) => void; 
}) {
  const getDetails = () => {
    switch (activeKey) {
      case 'status':
        return {
          title: 'Statut de relation',
          options: ['Célibataire', 'En couple', 'Relation libre'],
        };
      case 'religion':
        return {
          title: 'Religion',
          options: ['Athée', 'Chrétien', 'Musulman', 'Catholique'],
        };
      case 'smoking':
        return {
          title: 'Tabac',
          options: ['Non-fumeur', 'Fumeur', "À l'occasion"],
        };
      case 'children':
        return {
          title: 'Enfants',
          options: ["Pas d'enfants", "A des enfants", "J'en voudrais un jour"],
        };
      case 'lookingFor':
        return {
          title: 'Ici pour...',
          options: ['Une histoire sérieuse', 'Discuter', 'Des rencontres'],
        };
      case 'sexuality':
        return {
          title: 'Sexualité',
          options: ['Hétéro', 'Gay', 'Lesbienne', 'Bisexuel'],
        };
      case 'language':
        return {
          title: 'Langues parlées',
          options: ['Français', 'Anglais', 'Français, Anglais'],
        };
      case 'education':
        return {
          title: 'Niveau d\'études',
          options: ['Secondaire', 'Baccalauréat', 'Licence', 'Master', 'Doctorat'],
        };
      case 'alcohol':
        return {
          title: 'Alcool',
          options: ['Non-buveur', 'Occasionnellement', "À l'occasion", 'Régulièrement'],
        };
      case 'zodiac':
        return {
          title: 'Signe astrologique',
          options: ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'],
        };
      case 'pets':
        return {
          title: 'Animaux de compagnie',
          options: ['Chien', 'Chat', 'Les deux', 'Aucun'],
        };
      case 'personality':
        return {
          title: 'Personnalité',
          options: ['Rêveur', 'Aventurier', 'Calme', 'Extraverti', 'Introverti', 'Épicurien'],
        };
      default:
        return { title: 'Filtre', options: [] };
    }
  };

  const details = getDetails();
  const [selected, setSelected] = useState<string>(() => {
    if (!currentValue || currentValue === 'Tous') return '';
    return currentValue;
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-[220] flex flex-col justify-end">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[28px] px-6 pt-6 pb-8 w-full max-h-[80vh] flex flex-col select-none z-10"
      >
        <h3 className="text-[18px] font-bold text-black text-center mb-6 tracking-tight shrink-0">
          {details.title}
        </h3>

        {/* List of Options */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 scrollbar-hide mb-6 pr-1">
          {details.options.map((opt) => {
            const isChecked = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                className="w-full py-3.5 flex items-center justify-between text-left active:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className={`text-[15px] ${isChecked ? 'font-bold text-black' : 'font-medium text-gray-800'}`}>
                  {opt}
                </span>
                {isChecked && (
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 shrink-0">
          <button 
            onClick={() => {
              onSave('');
            }}
            className="text-[15px] font-semibold text-black hover:opacity-70 transition-opacity cursor-pointer px-2"
          >
            Retirer filtre
          </button>
          <button 
            onClick={() => {
              onSave(selected);
            }}
            className="bg-black hover:bg-gray-900 text-white font-extrabold text-[15px] px-9 py-3 rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            OK
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AlcoholFilterFlowSheet({ 
  currentValue, 
  onClose, 
  onSave 
}: { 
  currentValue: string; 
  onClose: () => void; 
  onSave: (val: string) => void; 
}) {
  const [step, setStep] = useState<number>(1);

  // Profile data state
  const [alcohol, setAlcohol] = useState<string>('À l\'occasion');
  const [education, setEducation] = useState<string>('');
  const [jobPost, setJobPost] = useState<string>('');
  const [jobCompany, setJobCompany] = useState<string>('');
  
  // Question prompts
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [promptAnswer, setPromptAnswer] = useState<string>('');

  const [personality, setPersonality] = useState<string>('Je préfère ne pas le dire');
  const [zodiac, setZodiac] = useState<string>('Je préfère ne pas le dire');
  const [pets, setPets] = useState<string>('Je préfère ne pas le dire');
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [verifyingState, setVerifyingState] = useState<'idle' | 'scanning' | 'matched' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load existing profile from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bavel_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.details) {
          if (parsed.details.alcohol) setAlcohol(parsed.details.alcohol);
          if (parsed.details.education) setEducation(parsed.details.education);
          if (parsed.details.job) {
            const parts = parsed.details.job.split(' chez ');
            setJobPost(parts[0] || '');
            setJobCompany(parts[1] || '');
          }
          if (parsed.details.personality) setPersonality(parsed.details.personality);
          if (parsed.details.zodiac) setZodiac(parsed.details.zodiac);
          if (parsed.details.pets) setPets(parsed.details.pets);
          if (parsed.details.promptQuestion) {
            setSelectedPrompt(parsed.details.promptQuestion);
            setPromptAnswer(parsed.details.promptAnswer || '');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle webcam initialization
  const startCamera = async () => {
    try {
      setVerifyingState('idle');
      setCapturedPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 480, height: 480 } 
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Selfie verification camera unavailable:", err);
      setIsCameraActive(true);
      setVerificationError('Accès caméra impossible. Autorisez la caméra puis réessayez.');
      setVerifyingState('error');
    }
  };

  const capturePhoto = async () => {
    let selfieDataUrl = '';
    if (cameraStream && videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 480, 480);
        selfieDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(selfieDataUrl);
        
        // Stop stream
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    } else {
      setVerificationError('Aucune image réelle n’a pu être capturée. Aucun badge n’a été ajouté.');
      setVerifyingState('error');
      return;
    }

    setVerifyingState('scanning');
    try {
      const response = await authFetch('/api/security/selfie-verification', {
        method: 'POST'
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.verified !== true) {
        setVerificationError(result?.message || 'Le service de vérification est indisponible. Aucun badge n’a été ajouté.');
        setVerifyingState('error');
        return;
      }
      setVerifyingState('matched');
      saveAllDataToProfile(true);
    } catch (error) {
      console.error('Selfie verification request failed:', error);
      setVerificationError('Service de vérification indisponible. Aucun badge n’a été ajouté.');
      setVerifyingState('error');
    }
  };

  const saveAllDataToProfile = (isVerifiedBadge: boolean) => {
    try {
      const saved = localStorage.getItem('bavel_user_profile');
      let parsed = saved ? JSON.parse(saved) : {};
      
      const updatedDetails = {
        ...(parsed.details || {}),
        alcohol,
        education: education || undefined,
        job: jobPost ? (jobCompany ? `${jobPost} chez ${jobCompany}` : jobPost) : undefined,
        personality,
        zodiac,
        pets,
        promptQuestion: selectedPrompt || undefined,
        promptAnswer: promptAnswer || undefined,
      };

      parsed = {
        ...parsed,
        verified: isVerifiedBadge ? true : parsed.verified,
        details: updatedDetails
      };

      localStorage.setItem('bavel_user_profile', JSON.stringify(parsed));
      
      // Dispatch storage event to notify navbar/profile components instantly
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNext = () => {
    if (step < 8) {
      setStep(prev => prev + 1);
    } else if (step === 8) {
      // Direct validation
      saveAllDataToProfile(false);
      onSave(alcohol);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  // Styled Option Row
  const OptionRow = ({ 
    label, 
    value, 
    selectedValue, 
    onClick 
  }: { 
    label: string; 
    value: string; 
    selectedValue: string; 
    onClick: () => void;
  }) => {
    const isSelected = selectedValue === value;
    return (
      <button
        onClick={onClick}
        className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
          isSelected 
            ? 'bg-[#f4ebff] border-[#8a2be2] text-[#8a2be2] font-bold' 
            : 'bg-white border-gray-100 text-gray-800 hover:border-gray-200'
        }`}
      >
        <span className="text-[13.5px] font-medium">{label}</span>
        <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
          isSelected ? 'border-[#8a2be2] bg-[#8a2be2]' : 'border-gray-300'
        }`}>
          {isSelected && (
            <div className="w-[6px] h-[6px] rounded-full bg-white" />
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[220] flex flex-col justify-end">
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[32px] px-6 pt-5 pb-8 w-full max-h-[92vh] flex flex-col select-none z-10 overflow-hidden text-black"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-[13px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            Étape {step} / 8
          </div>
        </div>

        {/* Swipeable / Animating Question container */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 flex flex-col">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex-1 flex flex-col"
            >
              
              {/* STEP 1: ALCOOL */}
              {step === 1 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Centered flat vector cocktail artwork */}
                    <div className="flex justify-center py-1">
                      <div className="w-28 h-28 rounded-full bg-rose-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="50" fill="#FFEAEF" />
                          {/* Drink body */}
                          <path d="M35 45 L85 45 L65 80 L55 80 Z" fill="#FFA3B1" />
                          {/* Liquid surface/waves */}
                          <path d="M35 45 Q47.5 40 60 45 Q72.5 50 85 45 L80 54 Q67.5 58 60 54 Q52.5 50 40 54 Z" fill="#FF5271" />
                          {/* Glass frame */}
                          <path d="M30 40 L90 40 L65 85 L55 85 Z" stroke="#333333" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M60 85 L60 105" stroke="#333333" strokeWidth="3" strokeLinecap="round" />
                          <path d="M45 105 L75 105" stroke="#333333" strokeWidth="3" strokeLinecap="round" />
                          {/* Lemon wheel on rim */}
                          <circle cx="85" cy="40" r="14" fill="#FFE57F" stroke="#333333" strokeWidth="2.5" />
                          <circle cx="85" cy="40" r="10" fill="#FFF59D" />
                          <path d="M85 30 L85 50" stroke="#FFE57F" strokeWidth="1.5" />
                          <path d="M75 40 L95 40" stroke="#FFE57F" strokeWidth="1.5" />
                          {/* Straw / Cherry */}
                          <path d="M48 55 L32 20" stroke="#333333" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="48" cy="62" r="5" fill="#D32F2F" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Est-ce que vous buvez ?</h2>
                    </div>

                    <div className="space-y-2 pt-1 max-w-sm mx-auto">
                      <OptionRow label="À l'occasion" value="À l'occasion" selectedValue={alcohol} onClick={() => setAlcohol("À l'occasion")} />
                      <OptionRow label="Jamais" value="Jamais" selectedValue={alcohol} onClick={() => setAlcohol("Jamais")} />
                      <OptionRow label="Souvent" value="Souvent" selectedValue={alcohol} onClick={() => setAlcohol("Souvent")} />
                      <OptionRow label="Non, je suis sobre" value="Non, je suis sobre" selectedValue={alcohol} onClick={() => setAlcohol("Non, je suis sobre")} />
                      <OptionRow label="Je préfère ne pas le dire" value="Je préfère ne pas le dire" selectedValue={alcohol} onClick={() => setAlcohol("Je préfère ne pas le dire")} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: EDUCATION */}
              {step === 2 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-center py-1">
                      <div className="w-28 h-28 rounded-full bg-blue-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="50" fill="#E8F4FD" />
                          {/* Books stack */}
                          <rect x="35" y="65" width="50" height="15" rx="3" fill="#42A5F5" stroke="#333" strokeWidth="2.5" />
                          <rect x="40" y="52" width="42" height="13" rx="3" fill="#EF5350" stroke="#333" strokeWidth="2.5" />
                          <rect x="45" y="42" width="34" height="10" rx="2" fill="#FFCA28" stroke="#333" strokeWidth="2.5" />
                          {/* Graduation Cap on top */}
                          <path d="M60 22 L85 30 L60 38 L35 30 Z" fill="#333" />
                          <path d="M47 34 L47 48 C47 52 73 52 73 48 L73 34" fill="#555" stroke="#333" strokeWidth="2.5" />
                          <path d="M60 22 L85 30 L60 38 L35 30 Z" stroke="#333" strokeWidth="2.5" strokeLinejoin="round" />
                          <path d="M78 31 L85 46 L82 48" stroke="#FFD54F" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="82" cy="48" r="2.5" fill="#FFCA28" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Où avez-vous étudié ?</h2>
                    </div>

                    <div className="pt-1 max-w-sm mx-auto w-full">
                      <input 
                        type="text"
                        placeholder="École ou université"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        className="w-full border-b-2 border-gray-200 focus:border-purple-600 py-2.5 text-[15px] text-center font-bold outline-none bg-transparent transition-all placeholder-gray-300"
                        autoFocus
                      />
                      <p className="text-center text-[11.5px] text-gray-400 mt-1.5">
                        Ajoutez votre école pour trouver des personnes de votre réseau.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: WORK */}
              {step === 3 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-center py-1">
                      <div className="w-28 h-28 rounded-full bg-orange-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="50" fill="#FFF3E0" />
                          {/* Laptop */}
                          <rect x="35" y="65" width="50" height="30" rx="4" fill="#90A4AE" stroke="#333" strokeWidth="2.5" />
                          <rect x="40" y="70" width="40" height="20" rx="1" fill="#ECEFF1" />
                          <path d="M25 95 L95 95" stroke="#333" strokeWidth="4.5" strokeLinecap="round" />
                          {/* Coffee cup */}
                          <rect x="80" y="70" width="12" height="15" rx="2" fill="#FF8A65" stroke="#333" strokeWidth="2" />
                          <path d="M92 74 Q96 77 92 80" stroke="#333" strokeWidth="2" />
                          {/* Busy gear icons */}
                          <circle cx="60" cy="40" r="10" fill="#FFA726" stroke="#333" strokeWidth="2" />
                          <path d="M60 30 L60 50 M50 40 L70 40" stroke="#333" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Que faites-vous dans la vie ?</h2>
                    </div>

                    <div className="space-y-3 pt-1 max-w-sm mx-auto w-full">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Intitulé du poste</label>
                        <input 
                          type="text"
                          placeholder="Ex: Designer, Ingénieur, Étudiant..."
                          value={jobPost}
                          onChange={(e) => setJobPost(e.target.value)}
                          className="w-full border-b-2 border-gray-200 focus:border-purple-600 py-2 text-[14.5px] font-bold outline-none bg-transparent transition-all placeholder-gray-300"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Nom de l'entreprise (Optionnel)</label>
                        <input 
                          type="text"
                          placeholder="Ex: Google, Auto-entrepreneur, Côte d'Ivoire S.A..."
                          value={jobCompany}
                          onChange={(e) => setJobCompany(e.target.value)}
                          className="w-full border-b-2 border-gray-200 focus:border-purple-600 py-2 text-[14.5px] font-bold outline-none bg-transparent transition-all placeholder-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: INTUITIVE QUESTIONS */}
              {step === 4 && (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-center py-1">
                      <div className="w-28 h-28 rounded-full bg-violet-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="50" fill="#EDE7F6" />
                          {/* Wine glass */}
                          <path d="M35 50 L55 50 L45 75 Z" fill="#B39DDB" />
                          <path d="M30 45 L60 45 L45 80 Z" stroke="#333" strokeWidth="2" />
                          {/* Plate & Lock */}
                          <circle cx="75" cy="75" r="20" fill="#FFF" stroke="#333" strokeWidth="2" />
                          <rect x="70" y="68" width="10" height="8" rx="1.5" fill="#FFD54F" stroke="#333" strokeWidth="2" />
                          <path d="M72 68 V64 C72 61 78 61 78 64 V68" stroke="#333" strokeWidth="2" fill="none" />
                          {/* Notebook */}
                          <rect x="40" y="25" width="30" height="22" rx="3" fill="#FFF" stroke="#333" strokeWidth="2" />
                          <path d="M45 30 H65 M45 35 H65 M45 40 H55" stroke="#7E57C2" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Répondez à des questions</h2>
                      <p className="text-[12px] text-[#8a2be2] font-semibold mt-0.5">Parfait, plus que deux</p>
                    </div>

                    {selectedPrompt === null ? (
                      <div className="space-y-2 max-w-sm mx-auto">
                        {[
                          "Quelle cause vous tient particulièrement à cœur ?",
                          "De quoi es-tu fier ?",
                          "Quelle est LA chose à savoir sur moi ?",
                          "Qu'essayez-vous d'apprendre actuellement ?"
                        ].map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedPrompt(prompt)}
                            className="w-full text-left p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 shadow-3xs transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="text-[13px] font-bold text-gray-800">{prompt}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#fcf8ff] rounded-xl p-3 border border-[#ecd5ff] max-w-sm mx-auto space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-black text-[#8a2be2] line-clamp-1">{selectedPrompt}</span>
                          <button 
                            onClick={() => { setSelectedPrompt(null); setPromptAnswer(''); }}
                            className="text-gray-400 hover:text-black text-[11px] font-semibold shrink-0 ml-2"
                          >
                            Changer
                          </button>
                        </div>
                        <textarea
                          placeholder="Écrivez votre réponse ici de façon naturelle..."
                          value={promptAnswer}
                          onChange={(e) => setPromptAnswer(e.target.value)}
                          className="w-full bg-white rounded-lg p-2.5 border border-gray-100 text-gray-800 text-[13.5px] font-medium placeholder-gray-300 h-20 focus:outline-none focus:border-[#8a2be2] shadow-3xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: PERSONALITY */}
              {step === 5 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-center py-1">
                      <div className="w-28 h-28 rounded-full bg-pink-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="50" fill="#FCE4EC" />
                          {/* Flower Pot */}
                          <path d="M45 85 L75 85 L70 100 L50 100 Z" fill="#D7CCC8" stroke="#333" strokeWidth="2.5" />
                          {/* Flower Stem & Leaves */}
                          <path d="M60 85 V55" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" />
                          <path d="M60 75 Q48 70 52 65" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          <path d="M60 70 Q72 65 68 60" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          {/* Bloom */}
                          <circle cx="60" cy="50" r="10" fill="#E040FB" stroke="#333" strokeWidth="2.5" />
                          <circle cx="60" cy="50" r="4" fill="#FFEB3B" />
                          {/* Watering hands */}
                          <path d="M80 35 C90 40 90 25 80 20 L65 25" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Êtes-vous plutôt introverti ou extraverti ?</h2>
                    </div>

                    <div className="space-y-2 pt-1 max-w-sm mx-auto">
                      <OptionRow label="Introverti" value="Introverti" selectedValue={personality} onClick={() => setPersonality("Introverti")} />
                      <OptionRow label="Extraverti" value="Extraverti" selectedValue={personality} onClick={() => setPersonality("Extraverti")} />
                      <OptionRow label="Un peu des deux" value="Un peu des deux" selectedValue={personality} onClick={() => setPersonality("Un peu des deux")} />
                      <OptionRow label="Je préfère ne pas le dire" value="Je préfère ne pas le dire" selectedValue={personality} onClick={() => setPersonality("Je préfère ne pas le dire")} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: ZODIAC */}
              {step === 6 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-center py-1">
                      <div className="w-28 h-28 rounded-full bg-indigo-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="50" fill="#E8EAF6" />
                          {/* Constellation lines */}
                          <path d="M30 40 L50 30 L70 45 L90 35 L75 75 L50 65 Z" stroke="#3F51B5" strokeWidth="1.5" strokeDasharray="3 3" />
                          {/* Stars */}
                          <circle cx="30" cy="40" r="4" fill="#FFD54F" />
                          <circle cx="50" cy="30" r="5" fill="#FFCA28" />
                          <circle cx="70" cy="45" r="4" fill="#FFD54F" />
                          <circle cx="90" cy="35" r="5" fill="#FFCA28" />
                          <circle cx="75" cy="75" r="4.5" fill="#FFCA28" />
                          <circle cx="50" cy="65" r="4" fill="#FFD54F" />
                          {/* Crescent Moon */}
                          <path d="M85 70 Q75 70 75 80 Q75 90 85 90 Q80 85 80 75 Z" fill="#7986CB" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Quel est votre signe astrologique ?</h2>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto scrollbar-hide space-y-1.5 pt-1 max-w-sm mx-auto border-t border-b border-gray-50 py-1.5">
                      {[
                        "Bélier (21 mars - 19 avril)",
                        "Taureau (20 avril - 20 mai)",
                        "Gémeaux (21 mai - 20 juin)",
                        "Cancer (21 juin - 22 juillet)",
                        "Lion (23 juillet - 22 août)",
                        "Vierge (23 août - 22 septembre)",
                        "Balance (23 septembre - 22 octobre)",
                        "Scorpion (23 octobre - 21 novembre)",
                        "Sagittaire (22 novembre - 21 décembre)",
                        "Capricorne (22 décembre - 19 janvier)",
                        "Verseau (20 janvier - 18 février)",
                        "Poissons (19 février - 20 mars)",
                        "Je préfère ne pas le dire"
                      ].map((sign) => {
                        const signName = sign.split(' ')[0];
                        const isSelected = zodiac.startsWith(signName);
                        return (
                          <button
                            key={sign}
                            onClick={() => setZodiac(sign)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? 'bg-[#f4ebff] border-[#8a2be2] text-[#8a2be2] font-extrabold' 
                                : 'bg-white border-gray-100 text-gray-800 hover:border-gray-200'
                            }`}
                          >
                            <span className="text-[13px] font-medium">{sign}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#8a2be2] shrink-0 ml-2" strokeWidth={3} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: PETS */}
              {step === 7 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-center py-1">
                      <div className="w-28 h-28 rounded-full bg-teal-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="50" fill="#E0F2F1" />
                          {/* Cat */}
                          <path d="M40 85 C40 70 55 70 55 85 Z" fill="#80CBC4" stroke="#333" strokeWidth="2" />
                          <polygon points="42,72 47,60 52,71" fill="#80CBC4" stroke="#333" strokeWidth="2" />
                          <polygon points="48,72 53,60 58,71" fill="#80CBC4" stroke="#333" strokeWidth="2" />
                          {/* Dog */}
                          <path d="M65 85 C65 60 85 60 85 85 Z" fill="#FFCC80" stroke="#333" strokeWidth="2" />
                          <path d="M62 68 C60 62 68 58 70 65 Z" fill="#FFA726" stroke="#333" strokeWidth="2" />
                          <path d="M88 68 C90 62 82 58 80 65 Z" fill="#FFA726" stroke="#333" strokeWidth="2" />
                          {/* Little hearts */}
                          <path d="M60 45 Q60 40 57 42 Q54 44 60 50 Q66 44 63 42 Q60 40 60 45 Z" fill="#EF9A9A" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Avez-vous des animaux ?</h2>
                    </div>

                    <div className="space-y-2 pt-1 max-w-sm mx-auto">
                      <OptionRow label="Chien(s)" value="Chien(s)" selectedValue={pets} onClick={() => setPets("Chien(s)")} />
                      <OptionRow label="Chat(s)" value="Chat(s)" selectedValue={pets} onClick={() => setPets("Chat(s)")} />
                      <OptionRow label="Chats et chiens" value="Chats et chiens" selectedValue={pets} onClick={() => setPets("Chats et chiens")} />
                      <OptionRow label="Pas d'animaux" value="Pas d'animaux" selectedValue={pets} onClick={() => setPets("Pas d'animaux")} />
                      <OptionRow label="Je préfère ne pas le dire" value="Je préfère ne pas le dire" selectedValue={pets} onClick={() => setPets("Je préfère ne pas le dire")} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 8: PHOTO VERIFICATION & SCANNER */}
              {step === 8 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {!isCameraActive ? (
                    <div className="space-y-4">
                      <div className="flex justify-center py-1">
                        <div className="w-28 h-28 rounded-full bg-amber-50 flex items-center justify-center relative overflow-hidden shadow-2xs">
                          <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none">
                            <circle cx="60" cy="60" r="50" fill="#FFFDE7" />
                            {/* Desk lamp */}
                            <path d="M40 95 H80 M60 95 V65" stroke="#333" strokeWidth="4" strokeLinecap="round" />
                            <path d="M60 65 L45 50" stroke="#333" strokeWidth="4.5" strokeLinecap="round" />
                            <path d="M35 55 L55 35" stroke="#333" strokeWidth="3" />
                            {/* Yellow shining beam cone */}
                            <polygon points="45,45 20,95 70,95" fill="#FFF59D" opacity="0.6" />
                            <path d="M45 45 L20 95 H70 Z" stroke="#333" strokeWidth="2.5" strokeLinejoin="round" />
                            <circle cx="45" cy="45" r="6" fill="#F44336" />
                          </svg>
                        </div>
                      </div>

                      <div className="text-center px-4">
                        <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Faites vérifier votre profil !</h2>
                        <p className="text-[12px] text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
                          En faisant vérifier votre profil, vous mettrez tout le monde en confiance et augmenterez vos chances de match.
                        </p>
                      </div>

                      <div className="pt-2 max-w-sm mx-auto w-full px-2">
                        <button
                          onClick={startCamera}
                          className="w-full bg-black hover:bg-gray-900 text-white font-extrabold text-[14px] py-3 rounded-full shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
                        >
                          <Shield className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span>✓ Vérification photo</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col items-center">
                      {verifyingState === 'idle' && (
                        <div className="relative w-64 h-64 rounded-full border-4 border-dashed border-[#8a2be2] overflow-hidden bg-black flex items-center justify-center">
                          {cameraStream ? (
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <RefreshCw className="w-10 h-10 text-white animate-spin mx-auto mb-2" />
                              <span className="text-white text-xs font-bold">Lancement de la caméra...</span>
                            </div>
                          )}
                          
                          {/* Face oval guide overlay */}
                          <div className="absolute inset-4 rounded-full border-2 border-white/40 pointer-events-none flex items-center justify-center">
                            <span className="text-[11px] text-white/90 bg-black/50 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">Aligner le visage</span>
                          </div>

                          {/* Capture button at the bottom of webcam */}
                          <button
                            onClick={capturePhoto}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-yellow-400 rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
                          >
                            <Camera className="w-6 h-6 text-black" />
                          </button>
                        </div>
                      )}

                      {verifyingState === 'scanning' && (
                        <div className="relative w-64 h-64 rounded-full border-4 border-yellow-400 overflow-hidden bg-gray-900 flex items-center justify-center shadow-lg">
                          {capturedPhoto && (
                            <img 
                              src={capturedPhoto} 
                              alt="Selfie" 
                              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] filter brightness-75"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 text-center">
                            <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin mb-2" />
                            <span className="text-white text-[12px] font-black uppercase tracking-wider">Transmission au service de vérification...</span>
                          </div>
                        </div>
                      )}

                      {verifyingState === 'error' && (
                        <div className="max-w-xs rounded-2xl bg-amber-50 p-5 text-center text-amber-900">
                          <Shield className="mx-auto mb-2 h-8 w-8" />
                          <p className="text-sm font-bold">Vérification indisponible</p>
                          <p className="mt-1 text-xs">{verificationError || 'Aucun badge n’a été ajouté. Réessayez lorsque le service sera disponible.'}</p>
                        </div>
                      )}

                      {verifyingState === 'matched' && (
                        <div className="space-y-4 text-center">
                          <motion.div 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-40 h-40 rounded-full bg-green-500 text-white flex flex-col items-center justify-center mx-auto shadow-lg relative"
                          >
                            <Check className="w-16 h-16 animate-bounce" strokeWidth={4.5} />
                            <span className="text-[12px] font-black tracking-widest uppercase">Vérifié ✓</span>
                          </motion.div>
                          
                          <div>
                            <h3 className="text-lg font-black text-green-600">Authenticité validée !</h3>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                              Votre selfie correspond à vos photos de profil. Le badge de vérification bleu a été ajouté à votre compte !
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Cancel/Reset camera action */}
                      {verifyingState !== 'scanning' && (
                        <button
                          onClick={() => {
                            setIsCameraActive(false);
                            cameraStream?.getTracks().forEach(track => track.stop());
                            setCameraStream(null);
                            setCapturedPhoto(null);
                            setVerificationError('');
                            setVerifyingState('idle');
                          }}
                          className="text-gray-400 hover:text-black text-xs font-bold uppercase tracking-wider py-1 cursor-pointer"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>

        {/* BOTTOM NAVIGATION FOOTER */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          
          {/* Back button */}
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-gray-700 hover:text-black active:scale-90 transition-transform cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="w-12 h-12" />
          )}

          {/* Progress capsule */}
          <div className="flex-1 max-w-[140px] h-2 bg-gray-100 rounded-full mx-4 overflow-hidden relative">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-black rounded-full transition-all duration-300"
              style={{ width: `${(step / 8) * 100}%` }}
            />
          </div>

          {/* Next / Validate button */}
          {step < 8 ? (
            <button
              onClick={handleNext}
              className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black font-bold active:scale-90 transition-transform cursor-pointer shrink-0"
            >
              <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={() => {
                // Save and finish
                saveAllDataToProfile(verifyingState === 'matched');
                onSave(alcohol);
              }}
              className="w-12 h-12 rounded-full bg-black text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer shrink-0"
            >
              <Check className="w-6 h-6" strokeWidth={3} />
            </button>
          )}

        </div>

      </motion.div>
    </div>
  );
}

export function PetsFilterSheet({
  currentValue,
  onClose,
  onSave
}: {
  currentValue: string;
  onClose: () => void;
  onSave: (val: string) => void;
}) {
  const [selected, setSelected] = useState<string>(() => {
    return currentValue || "Je préfère ne pas le dire";
  });

  const options = [
    "Chat(s)",
    "Chien(s)",
    "Chats et chiens",
    "Autres",
    "Pas d'animaux",
    "Je préfère ne pas le dire"
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[220] flex flex-col justify-end">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[32px] px-6 pt-5 pb-8 w-full max-h-[96vh] flex flex-col select-none z-10 overflow-hidden text-black font-sans"
      >
        {/* Top Close Row */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 flex flex-col space-y-4">
          {/* Illustration of Cat and Dog */}
          <div className="flex justify-center shrink-0">
            <svg className="w-full max-w-[210px] h-[120px]" viewBox="0 0 320 190" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Green grass background hill */}
              <path d="M5 160 C75 140, 135 165, 195 152 C255 138, 285 155, 315 145 L315 190 L5 190 Z" fill="#A4D139" />
              <path d="M5 165 C65 156, 125 170, 185 159 C245 147, 275 165, 305 155 L305 190 L5 190 Z" fill="#709D1B" />
              
              {/* Tufts of grass */}
              <path d="M35 160 L38 135 L42 161 M40 161 L44 139 L47 160 M105 170 L108 148 L112 171 M265 155 L268 130 L272 156 M270 156 L274 134 L277 155" stroke="#709D1B" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M20 165 L22 143 L25 166 M175 160 L177 138 L180 161" stroke="#A4D139" strokeWidth="2.5" strokeLinecap="round" />

              {/* Dog (Brown Dachshund) */}
              {/* Tail */}
              <path d="M95 105 C80 82, 90 55, 100 40 C103 35, 107 40, 105 45 C98 63, 100 85, 110 100" fill="#B55618" stroke="#333" strokeWidth="1.8" strokeLinejoin="round" />
              
              {/* Back legs */}
              <rect x="105" y="125" width="12" height="32" rx="6" fill="#B55618" stroke="#333" strokeWidth="1.8" />
              <rect x="127" y="125" width="12" height="32" rx="6" fill="#8D3E0C" stroke="#333" strokeWidth="1.8" />

              {/* Front legs */}
              <rect x="220" y="125" width="12" height="32" rx="6" fill="#B55618" stroke="#333" strokeWidth="1.8" />
              <rect x="233" y="125" width="12" height="32" rx="6" fill="#8D3E0C" stroke="#333" strokeWidth="1.8" />

              {/* Dog Body */}
              <rect x="100" y="95" width="140" height="42" rx="21" fill="#B55618" stroke="#333" strokeWidth="1.8" />

              {/* Red Collar */}
              <rect x="210" y="97" width="9" height="26" rx="1.8" transform="rotate(-15 210 97)" fill="#D32F2F" stroke="#333" strokeWidth="1.8" />
              <circle cx="220" cy="116" r="4" fill="#FFE57F" stroke="#333" strokeWidth="1.2" />

              {/* Dog Head */}
              <path d="M210 108 L255 95 C264 92, 270 99, 267 105 L255 119 C246 123, 219 121, 210 108 Z" fill="#B55618" stroke="#333" strokeWidth="1.8" strokeLinejoin="round" />
              
              {/* Nose */}
              <path d="M261 97 C265 97, 268 100, 268 104 C268 107, 264 108, 259 105 Z" fill="#1A1A1A" />

              {/* Floppy Ear */}
              <path d="M215 95 C206 100, 204 121, 213 128 C218 132, 227 125, 224 112 Z" fill="#7E3B09" stroke="#333" strokeWidth="1.8" />

              {/* Eye */}
              <circle cx="237" cy="104" r="3" fill="#1A1A1A" />
              
              {/* CAT (Sits on Dog's Back) */}
              {/* Cat Tail */}
              <path d="M125 100 C107 87, 102 42, 120 28 C125 23, 130 28, 128 33 C116 46, 121 77, 134 95" fill="#E1D5FF" stroke="#333" strokeWidth="1.8" />

              {/* Shaded bottom of cat body */}
              <path d="M130 100 C130 73, 175 73, 175 100 Z" fill="#D2C4FF" stroke="#333" strokeWidth="1.8" />

              {/* Cat Body */}
              <path d="M135 100 C135 65, 170 65, 170 100 Z" fill="#E1D5FF" stroke="#333" strokeWidth="1.8" />

              {/* Cat Head */}
              <circle cx="158" cy="60" r="19" fill="#E1D5FF" stroke="#333" strokeWidth="1.8" />

              {/* Left Ear */}
              <path d="M143 50 L140 32 L153 43 Z" fill="#E1D5FF" stroke="#333" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M146 47 L144 37 L151 43 Z" fill="#FF8A80" />

              {/* Right Ear */}
              <path d="M173 50 L176 32 L163 43 Z" fill="#E1D5FF" stroke="#333" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M170 47 L172 37 L165 43 Z" fill="#FF8A80" />

              {/* Cat Collar */}
              <path d="M145 72 Q158 77 170 72" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="158" cy="76" r="3" fill="#FFD54F" stroke="#333" strokeWidth="1" />

              {/* Cat Eyes */}
              <circle cx="151" cy="58" r="1.8" fill="#1A1A1A" />
              <circle cx="165" cy="58" r="1.8" fill="#1A1A1A" />
              
              {/* Cat Nose & Mouth */}
              <path d="M158 62 L156 63.8 H160 Z" fill="#FF8A80" />
              <path d="M158 63.8 Q156 65.5 154.5 64.6 M158 63.8 Q159.8 65.5 161.5 64.6" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" />

              {/* Whiskers */}
              <path d="M140 60 H131 M140 63.5 L133 65.3" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M176 60 H185 M176 63.5 L183 65.3" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Title */}
          <div className="px-1 text-left shrink-0">
            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight tracking-tight">
              Avez-vous des animaux de compagnie ?
            </h2>
          </div>

          {/* List of Options */}
          <div className="space-y-2 px-1">
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={`w-full text-left px-4 py-[11px] rounded-[18px] transition-all flex items-center justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-[#EFE5FF] text-black font-extrabold shadow-3xs' 
                      : 'bg-[#F4F4F6] text-black font-bold hover:bg-[#eaeaea]'
                  }`}
                >
                  <span className="text-[14.5px] tracking-tight">{opt}</span>
                  
                  {/* Radio Indicator */}
                  <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-black' : 'border-black/30'
                  }`}>
                    {isSelected && (
                      <div className="w-[10px] h-[10px] rounded-full bg-black" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar Controls */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0 px-1 mt-1">
          {/* Back button */}
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>

          {/* Progress bar line resembling screenshot */}
          <div className="w-28 h-[5px] bg-black rounded-full mx-4" />

          {/* Next / Save button */}
          <button
            onClick={() => {
              onSave(selected);
            }}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ZodiacFilterSheet({
  currentValue,
  onClose,
  onSave
}: {
  currentValue: string;
  onClose: () => void;
  onSave: (val: string) => void;
}) {
  const [selected, setSelected] = useState<string>(() => {
    return currentValue || "Je préfère ne pas le dire";
  });

  const options = [
    "Bélier",
    "Taureau",
    "Gémeaux",
    "Cancer",
    "Lion",
    "Vierge",
    "Balance",
    "Scorpion",
    "Sagittaire",
    "Capricorne",
    "Verseau",
    "Poissons",
    "Je préfère ne pas le dire"
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[220] flex flex-col justify-end">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[32px] px-6 pt-5 pb-8 w-full max-h-[96vh] flex flex-col select-none z-10 overflow-hidden text-black font-sans"
      >
        {/* Top Close Row */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 flex flex-col space-y-4">
          {/* Illustration of Astrological Sign / Drawing */}
          <div className="flex justify-center shrink-0">
            <svg className="w-full max-w-[210px] h-[120px]" viewBox="0 0 320 190" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Organic midnight-sky background cloud */}
              <path d="M20 115 C20 75, 45 45, 90 35 C135 25, 175 15, 230 40 C280 62, 290 85, 275 105 C255 125, 215 130, 185 130 C150 130, 120 145, 80 140 C50 137, 20 135, 20 115 Z" fill="#151221" />
              
              {/* Sparkly big star in lower-center */}
              <path d="M145 115 Q145 105 135 105 Q145 105 145 95 Q145 105 155 105 Q145 105 145 115 Z" fill="#E1D5FF" />
              
              {/* Sparkly big star in center-left */}
              <path d="M85 85 Q85 75 75 75 Q85 75 85 65 Q85 75 95 75 Q85 75 85 85 Z" fill="#FFFFFF" />

              {/* Constellation lines */}
              <path d="M85 75 L110 50 L145 105 L210 55" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              
              {/* Stars on nodes */}
              <circle cx="85" cy="75" r="3" fill="#FFFFFF" />
              <circle cx="110" cy="50" r="3" fill="#FFFFFF" />
              <circle cx="145" cy="105" r="3" fill="#E1D5FF" />
              <circle cx="210" cy="55" r="3" fill="#FFFFFF" />

              {/* Random tiny stars (red & white) */}
              <circle cx="160" cy="35" r="1.5" fill="#FF8A80" />
              <circle cx="215" cy="40" r="2.5" fill="#FF8A80" />
              <circle cx="60" cy="65" r="1.2" fill="#FFFFFF" />
              <circle cx="115" cy="115" r="1.8" fill="#E1D5FF" />
              <circle cx="45" cy="105" r="1.5" fill="#FFFFFF" />

              {/* Hand entering from right drawing/pointing with a pencil */}
              {/* Sleeve */}
              <path d="M265 125 C275 118, 305 125, 310 160 L255 160 Z" fill="#E1D5FF" />
              {/* Red sleeve cuff */}
              <path d="M250 120 L258 116 L265 140 L257 144 Z" fill="#D32F2F" />

              {/* Brown Hand */}
              <path d="M195 105 C190 95, 205 78, 230 75 C255 72, 275 85, 280 105 C282 115, 275 132, 255 138 C235 144, 215 135, 200 125 Z" fill="#8D5524" />
              
              {/* Blue pencil/pen */}
              <path d="M165 70 L210 115 L200 125 L155 80 Z" fill="#29B6F6" />
              {/* Pencil wooden tip */}
              <path d="M165 70 L152 65 L155 80 Z" fill="#FFE082" />
              {/* Lead point */}
              <path d="M156 67 L152 65 L154 71 Z" fill="#1A1A1A" />

              {/* Fingers wrap */}
              <path d="M185 95 C175 90, 168 98, 178 104 L195 115" fill="#8D5524" stroke="#1A1A1A" strokeWidth="1" />
              <path d="M195 108 C185 104, 178 112, 188 118 L205 125" fill="#8D5524" stroke="#1A1A1A" strokeWidth="1" />
            </svg>
          </div>

          {/* Title */}
          <div className="px-1 text-left shrink-0">
            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight tracking-tight">
              Quel est votre signe astrologique ?
            </h2>
          </div>

          {/* List of Options */}
          <div className="space-y-2 px-1">
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={`w-full text-left px-4 py-[11px] rounded-[18px] transition-all flex items-center justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-[#EFE5FF] text-black font-extrabold shadow-3xs' 
                      : 'bg-[#F4F4F6] text-black font-bold hover:bg-[#eaeaea]'
                  }`}
                >
                  <span className="text-[14.5px] tracking-tight">{opt}</span>
                  
                  {/* Radio Indicator */}
                  <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-black' : 'border-black/30'
                  }`}>
                    {isSelected && (
                      <div className="w-[10px] h-[10px] rounded-full bg-black" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar Controls */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0 px-1 mt-1">
          {/* Back button */}
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>

          {/* Progress bar line resembling screenshot */}
          <div className="w-28 h-[5px] bg-black rounded-full mx-4" />

          {/* Next / Save button */}
          <button
            onClick={() => {
              onSave(selected);
            }}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AlcoholFilterSheet({
  currentValue,
  onClose,
  onSave
}: {
  currentValue: string;
  onClose: () => void;
  onSave: (val: string) => void;
}) {
  const [selected, setSelected] = useState<string>(() => {
    return currentValue || "Je préfère ne pas le dire";
  });

  const options = [
    "À l'occasion",
    "Jamais",
    "Souvent",
    "Non, je suis sobre",
    "Je préfère ne pas le dire"
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[220] flex flex-col justify-end">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[32px] px-6 pt-5 pb-8 w-full max-h-[96vh] flex flex-col select-none z-10 overflow-hidden text-black font-sans"
      >
        {/* Top Close Row */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 flex flex-col space-y-4">
          {/* Illustration of cocktail & wave */}
          <div className="flex justify-center shrink-0">
            <svg className="w-full max-w-[210px] h-[120px]" viewBox="0 0 320 190" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Purple wave background */}
              <path d="M15 150 C75 130, 135 155, 235 135 C285 125, 295 145, 315 130 L315 190 L15 190 Z" fill="#B39DDB" />
              <path d="M15 155 C65 142, 125 160, 225 142 C275 135, 285 155, 305 145 L305 190 L15 190 Z" fill="#9575CD" />

              {/* Lemon slice floating in the waves */}
              <g transform="translate(140, 140) rotate(-15)">
                {/* Yellow slice */}
                <path d="M-25 0 A 25 25 0 0 1 25 0 Z" fill="#FFEB3B" stroke="#333" strokeWidth="1.2" />
                {/* Inner white membrane */}
                <path d="M-21 -1 A 21 21 0 0 1 21 -1 Z" fill="#FFFDE7" />
                {/* Triangles segments */}
                <path d="M-18 -2 A 18 18 0 0 1 -3 -15 L -1 -1 Z" fill="#FFF176" />
                <path d="M-1 -15 A 18 18 0 0 1 18 -2 L 1 -1 Z" fill="#FFF176" />
                <line x1="0" y1="0" x2="-10" y2="-15" stroke="#FFD54F" strokeWidth="1" />
                <line x1="0" y1="0" x2="10" y2="-15" stroke="#FFD54F" strokeWidth="1" />
                <line x1="0" y1="0" x2="0" y2="-18" stroke="#FFD54F" strokeWidth="1" />
              </g>

              {/* Tilted Coupe Glass */}
              <g transform="translate(170, 75) rotate(18)">
                {/* Base */}
                <path d="M -15 80 L 15 80" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
                {/* Stem */}
                <line x1="0" y1="35" x2="0" y2="80" stroke="#333" strokeWidth="2.5" />
                {/* Bowl outline */}
                <path d="M -35 0 C -35 25, 35 25, 35 0 Z" fill="#E1D5FF" stroke="#333" strokeWidth="2.5" />
                {/* Drink / Liquid inside */}
                <path d="M -31 5 C -25 22, 25 22, 31 5 Z" fill="#E53935" />
                {/* Highlights inside glass */}
                <path d="M -25 8 C -20 18, 20 18, 25 8 Z" fill="#FF5252" opacity="0.6" />
              </g>

              {/* Straw */}
              <g transform="translate(190, 60) rotate(35)">
                {/* Straw tube with stripes */}
                <rect x="-3" y="-55" width="6" height="65" rx="2" fill="#FFEB3B" stroke="#333" strokeWidth="1.2" />
                <line x1="-3" y1="-45" x2="3" y2="-48" stroke="#F57F17" strokeWidth="1.5" />
                <line x1="-3" y1="-35" x2="3" y2="-38" stroke="#F57F17" strokeWidth="1.5" />
                <line x1="-3" y1="-25" x2="3" y2="-28" stroke="#F57F17" strokeWidth="1.5" />
                <line x1="-3" y1="-15" x2="3" y2="-18" stroke="#F57F17" strokeWidth="1.5" />
                {/* Bendy top of straw */}
                <path d="M -3 -55 L 12 -62" stroke="#333" strokeWidth="1.2" />
                <path d="M 3 -53 L 15 -58" stroke="#333" strokeWidth="1.2" />
              </g>

              {/* Splashes of Red Drink */}
              <g transform="translate(115, 60)">
                {/* Drop 1 */}
                <path d="M 0 0 C -10 -5, -20 -15, -22 -25 C -15 -25, -5 -15, 0 0 Z" fill="#D32F2F" stroke="#333" strokeWidth="1" />
                {/* Drop 2 */}
                <path d="M 12 12 C 5 2, -2 -10, -5 -20 C 2 -18, 10 -8, 12 12 Z" fill="#D32F2F" stroke="#333" strokeWidth="1" />
                {/* Drop 3 */}
                <path d="M -15 25 C -25 20, -32 8, -32 -2 C -26 -2, -20 10, -15 25 Z" fill="#D32F2F" stroke="#333" strokeWidth="1" />
              </g>

              {/* Cherry */}
              <g transform="translate(160, 62)">
                <circle cx="0" cy="0" r="10" fill="#C62828" stroke="#333" strokeWidth="1.5" />
                {/* Cherry Highlight */}
                <circle cx="-3" cy="-3" r="3" fill="#FF8A80" />
                {/* Cherry Stem */}
                <path d="M 0 -8 Q -10 -30 -5 -42" fill="none" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Hand entering from top picking the cherry */}
              <g transform="translate(110, -10)">
                {/* Sleeve / Arm in purple pattern */}
                <path d="M 150 40 L 210 50 L 210 110 L 170 90 Z" fill="#B39DDB" stroke="#333" strokeWidth="1.5" />
                {/* Red stripe details */}
                <path d="M 175 55 L 190 45 L 200 55 L 185 65 Z" fill="#D32F2F" />
                <path d="M 190 75 L 205 65 L 210 78 L 195 88 Z" fill="#D32F2F" />

                {/* Hand / Arm skin */}
                <path d="M 65 60 C 65 45, 95 40, 130 42 C 150 43, 165 52, 175 65 C 170 75, 155 88, 125 88 C 105 88, 75 85, 65 60 Z" fill="#5D4037" />

                {/* Fingers touching cherry */}
                {/* Index finger */}
                <path d="M 65 60 C 58 58, 50 65, 55 72 L 95 98" fill="#5D4037" stroke="#1A1A1A" strokeWidth="1.2" />
                <circle cx="54" cy="68" r="2.5" fill="#D32F2F" />

                {/* Middle finger */}
                <path d="M 72 56 C 64 54, 58 62, 62 68 L 100 92" fill="#5D4037" stroke="#1A1A1A" strokeWidth="1.2" />
                <circle cx="61" cy="63" r="2.5" fill="#D32F2F" />

                {/* Ring finger */}
                <path d="M 85 54 C 78 52, 72 58, 75 64 L 105 88" fill="#5D4037" stroke="#1A1A1A" strokeWidth="1.2" />
                <circle cx="74" cy="59" r="2.5" fill="#D32F2F" />
              </g>
            </svg>
          </div>

          {/* Title */}
          <div className="px-1 text-left shrink-0">
            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight tracking-tight">
              Est-ce que vous buvez ?
            </h2>
          </div>

          {/* List of Options */}
          <div className="space-y-2 px-1">
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={`w-full text-left px-4 py-[11px] rounded-[18px] transition-all flex items-center justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-[#EFE5FF] text-black font-extrabold shadow-3xs' 
                      : 'bg-[#F4F4F6] text-black font-bold hover:bg-[#eaeaea]'
                  }`}
                >
                  <span className="text-[14.5px] tracking-tight">{opt}</span>
                  
                  {/* Radio Indicator */}
                  <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-black' : 'border-black/30'
                  }`}>
                    {isSelected && (
                      <div className="w-[10px] h-[10px] rounded-full bg-black" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar Controls */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0 px-1 mt-1">
          {/* Empty spacer / Back button if needed, but in screenshot it's empty/none */}
          <div className="w-12 h-12" />

          {/* Short progress pill resembling screenshot */}
          <div className="w-12 h-[5px] bg-black rounded-full mx-4" />

          {/* Next / Save button */}
          <button
            onClick={() => {
              onSave(selected);
            }}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function PersonalityFilterSheet({
  currentValue,
  onClose,
  onSave
}: {
  currentValue: string;
  onClose: () => void;
  onSave: (val: string) => void;
}) {
  const [selected, setSelected] = useState<string>(() => {
    return currentValue || "Je préfère ne pas le dire";
  });

  const options = [
    "Introverti",
    "Extraverti",
    "Un peu des deux",
    "Je préfère ne pas le dire"
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[220] flex flex-col justify-end">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[32px] px-6 pt-5 pb-8 w-full max-h-[96vh] flex flex-col select-none z-10 overflow-hidden text-black font-sans"
      >
        {/* Top Close Row */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 flex flex-col space-y-4">
          {/* Illustration of hand picking/touching a flower */}
          <div className="flex justify-center shrink-0">
            <svg className="w-full max-w-[210px] h-[120px]" viewBox="0 0 320 190" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Green hills background */}
              <path d="M15 160 C75 145, 135 165, 235 150 C285 142, 295 155, 315 145 L315 190 L15 190 Z" fill="#A4D139" />
              <path d="M15 165 C65 158, 125 170, 225 157 C275 150, 285 165, 305 155 L305 190 L15 190 Z" fill="#709D1B" />

              {/* Left Bud and Stem */}
              <path d="M100 160 Q75 100 120 100" fill="none" stroke="#709D1B" strokeWidth="4" strokeLinecap="round" />
              {/* Bud */}
              <path d="M120 100 C110 95, 95 90, 85 98 C80 102, 90 115, 105 110 C112 106, 118 102, 120 100 Z" fill="#B39DDB" stroke="#333" strokeWidth="1.2" />
              <path d="M100 105 C95 105, 90 110, 85 102 C85 95, 95 98, 100 105 Z" fill="#9575CD" />
              {/* Green bud sepals */}
              <path d="M112 105 Q120 102 120 100 Q115 108 112 105 Z" fill="#709D1B" />

              {/* Main Flower Stem */}
              <path d="M180 160 L180 110" fill="none" stroke="#709D1B" strokeWidth="5.5" strokeLinecap="round" />
              <path d="M180 110 L180 95" fill="none" stroke="#709D1B" strokeWidth="4" strokeLinecap="round" />

              {/* Leaves */}
              <path d="M180 145 Q135 120 105 145 Q145 155 180 145 Z" fill="#709D1B" stroke="#333" strokeWidth="1.2" />
              <path d="M180 135 Q225 120 255 145 Q215 155 180 135 Z" fill="#709D1B" stroke="#333" strokeWidth="1.2" />
              <path d="M180 150 Q160 115 140 130 Q160 145 180 150 Z" fill="#A4D139" stroke="#333" strokeWidth="1.2" />

              {/* Blooming Purple Flower */}
              {/* Petals */}
              <g transform="translate(180, 95)">
                <path d="M0 0 L-10 -25 C-12 -30, -5 -35, 0 -30 L10 -25 Z" fill="#D2C4FF" stroke="#333" strokeWidth="1.2" />
                <path d="M0 0 L15 -22 C20 -25, 25 -18, 20 -12 L10 -8 Z" fill="#E1D5FF" stroke="#333" strokeWidth="1.2" />
                <path d="M0 0 L25 -8 C30 -5, 28 5, 20 5 L10 0 Z" fill="#D2C4FF" stroke="#333" strokeWidth="1.2" />
                <path d="M0 0 L22 15 C25 20, 18 25, 12 20 L8 10 Z" fill="#E1D5FF" stroke="#333" strokeWidth="1.2" />
                
                <path d="M0 0 L-22 -15 C-25 -20, -18 -25, -12 -20 L-8 -10 Z" fill="#E1D5FF" stroke="#333" strokeWidth="1.2" />
                <path d="M0 0 L-25 -2 C-30 -5, -28 5, -20 5 L-10 0 Z" fill="#D2C4FF" stroke="#333" strokeWidth="1.2" />
                <path d="M0 0 L-15 22 C-20 25, -25 18, -20 12 L-10 8 Z" fill="#E1D5FF" stroke="#333" strokeWidth="1.2" />
                <path d="M0 0 L5 25 C8 30, -2 32, -5 25 L-2 10 Z" fill="#D2C4FF" stroke="#333" strokeWidth="1.2" />

                {/* Pistil / Stamen */}
                <circle cx="0" cy="0" r="9" fill="#FFD54F" stroke="#333" strokeWidth="1.2" />
                {/* Stamen details */}
                <line x1="-3" y1="-9" x2="-3" y2="-15" stroke="#333" strokeWidth="1" />
                <circle cx="-3" cy="-15" r="1.5" fill="#FF8A80" />
                <line x1="3" y1="-9" x2="3" y2="-15" stroke="#333" strokeWidth="1" />
                <circle cx="3" cy="-15" r="1.5" fill="#FF8A80" />
                <line x1="0" y1="-9" x2="0" y2="-17" stroke="#333" strokeWidth="1" />
                <circle cx="0" cy="-17" r="1.5" fill="#FF8A80" />
              </g>

              {/* Arm and Hand entering from top-right to pick the flower */}
              {/* Sleeve background */}
              <path d="M230 30 L310 40 L310 100 L250 80 Z" fill="#D2C4FF" />
              
              {/* Purple patterned sleeve */}
              <path d="M235 32 L310 42 L310 95 L250 80 Z" fill="#B39DDB" stroke="#333" strokeWidth="1.5" />
              {/* Red stripes / pattern on sleeve */}
              <path d="M275 45 L290 35 L300 45 L285 55 Z" fill="#D32F2F" />
              <path d="M290 65 L305 55 L310 68 L295 78 Z" fill="#D32F2F" />

              {/* Dark brown hand/arm */}
              <path d="M145 50 C145 35, 175 30, 210 32 C230 33, 245 42, 255 55 C250 65, 235 78, 205 78 C185 78, 155 75, 145 50 Z" fill="#5D4037" />
              
              {/* Fingers wrapping around to touch flower */}
              {/* Index finger */}
              <path d="M145 50 C138 48, 130 55, 135 62 L175 88" fill="#5D4037" stroke="#1A1A1A" strokeWidth="1.2" />
              <circle cx="134" cy="58" r="2.5" fill="#D32F2F" /> {/* Red Nail Polish */}

              {/* Middle finger */}
              <path d="M152 46 C144 44, 138 52, 142 58 L180 82" fill="#5D4037" stroke="#1A1A1A" strokeWidth="1.2" />
              <circle cx="141" cy="53" r="2.5" fill="#D32F2F" /> {/* Red Nail Polish */}

              {/* Ring finger */}
              <path d="M165 44 C158 42, 152 48, 155 54 L185 78" fill="#5D4037" stroke="#1A1A1A" strokeWidth="1.2" />
              <circle cx="154" cy="49" r="2.5" fill="#D32F2F" /> {/* Red Nail Polish */}
            </svg>
          </div>

          {/* Title */}
          <div className="px-1 text-left shrink-0">
            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight tracking-tight">
              Êtes-vous plutôt introverti ou extraverti ?
            </h2>
          </div>

          {/* List of Options */}
          <div className="space-y-2 px-1">
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={`w-full text-left px-4 py-[11px] rounded-[18px] transition-all flex items-center justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-[#EFE5FF] text-black font-extrabold shadow-3xs' 
                      : 'bg-[#F4F4F6] text-black font-bold hover:bg-[#eaeaea]'
                  }`}
                >
                  <span className="text-[14.5px] tracking-tight">{opt}</span>
                  
                  {/* Radio Indicator */}
                  <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-black' : 'border-black/30'
                  }`}>
                    {isSelected && (
                      <div className="w-[10px] h-[10px] rounded-full bg-black" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar Controls */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0 px-1 mt-1">
          {/* Back button */}
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>

          {/* Progress bar line resembling screenshot */}
          <div className="w-28 h-[5px] bg-black rounded-full mx-4" />

          {/* Next / Save button */}
          <button
            onClick={() => {
              onSave(selected);
            }}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
