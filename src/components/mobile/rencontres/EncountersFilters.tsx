import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, Wine, Cigarette, Baby, Sparkles, Target, 
  Dog, Users, Ruler, Brain, Languages, GraduationCap, CheckCircle, 
  Hand, ChevronRight, Filter, RotateCcw
} from 'lucide-react';
import {
  HeightFilterSheet,
  OptionFilterSheet,
  AlcoholFilterSheet,
  PetsFilterSheet,
  ZodiacFilterSheet,
  PersonalityFilterSheet
} from '../discover/Filters';
import { monetizationService } from '../../../services/monetizationService';

// ============================================
// 1. TYPES
// ============================================

export interface AdvancedFilters {
  status?: 'Célibataire' | 'En couple' | 'Divorcé' | 'Veuf' | 'Tous';
  religion?: 'Athée' | 'Chrétien' | 'Musulman' | 'Juif' | 'Bouddhiste' | 'Hindou' | 'Tous';
  smoking?: 'Non-fumeur' | 'Fumeur' | 'À l\'occasion' | 'Tous';
  children?: 'Sans enfant' | 'Enfant(s)' | 'Tous';
  lookingFor?: 'Une histoire sérieuse' | 'Discuter' | 'Des rencontres' | 'Tous';
  sexuality?: 'Hétéro' | 'Gay' | 'Lesbienne' | 'Bisexuel' | 'Pansexuel' | 'Asexuel' | 'Tous';
  height?: string;
  language?: string;
  education?: 'Bac' | 'Licence' | 'Master' | 'Doctorat' | 'Tous';
  verifiedOnly?: boolean;
  alcohol?: 'Jamais' | 'À l\'occasion' | 'Régulièrement' | 'Tous';
  zodiac?: string;
  pets?: 'Aucun' | 'Chat(s)' | 'Chien(s)' | 'Autre' | 'Tous';
  personality?: string;
  location?: string;
}

export interface EncountersFiltersMenuProps {
  onClose: () => void;
  genderPreference?: 'homme' | 'femme' | 'les_deux';
  setGenderPreference?: (pref: 'homme' | 'femme' | 'les_deux') => void;
  ageRange?: [number, number];
  setAgeRange?: (range: [number, number]) => void;
  distanceRange?: [number, number];
  setDistanceRange?: (range: [number, number]) => void;
  advancedFilters?: AdvancedFilters;
  setAdvancedFilters?: (filters: AdvancedFilters) => void;
  isPremium?: boolean;
}

// ============================================
// 2. CONSTANTES
// ============================================

const DEFAULT_AGE_RANGE: [number, number] = [18, 60];
const DEFAULT_DISTANCE_RANGE: [number, number] = [1, 100];

const GENDER_LABELS: Record<'homme' | 'femme' | 'les_deux', string> = {
  homme: 'Des hommes',
  femme: 'Des femmes',
  les_deux: 'Les deux',
};

const FILTER_ICONS = {
  status: Heart,
  religion: Hand,
  alcohol: Wine,
  smoking: Cigarette,
  children: Baby,
  zodiac: Sparkles,
  lookingFor: Target,
  pets: Dog,
  sexuality: Users,
  height: Ruler,
  personality: Brain,
  language: Languages,
  education: GraduationCap,
  verifiedOnly: CheckCircle,
} as const;

const FILTER_LABELS: Record<keyof typeof FILTER_ICONS, string> = {
  status: 'Statut',
  religion: 'Religion',
  alcohol: 'Alcool',
  smoking: 'Tabac',
  children: 'Enfants',
  zodiac: 'Signe astrologique',
  lookingFor: 'Ici pour',
  pets: 'Animaux',
  sexuality: 'Sexualité',
  height: 'Taille',
  personality: 'Personnalité',
  language: 'Langue',
  education: "Niveau d'études",
  verifiedOnly: 'Profils vérifiés',
};

// ============================================
// 3. COMPOSANT RANGE SLIDER (interne interactif double curseur)
// ============================================

interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label: string;
  unit?: string;
  minLabel?: string;
  maxLabel?: string;
  className?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  unit = '',
  minLabel,
  maxLabel,
  className = '',
}) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

  const calculateValueFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + ratio * (max - min));
  }, [min, max]);

  const updateValue = useCallback((thumb: 'min' | 'max', newVal: number) => {
    if (thumb === 'min') {
      const clamped = Math.max(min, Math.min(newVal, value[1] - 1));
      onChange([clamped, value[1]]);
    } else {
      const clamped = Math.min(max, Math.max(newVal, value[0] + 1));
      onChange([value[0], clamped]);
    }
  }, [min, max, value, onChange]);

  const startDragging = useCallback((thumb: 'min' | 'max', startX: number) => {
    setActiveThumb(thumb);
    const newVal = calculateValueFromPointer(startX);
    updateValue(thumb, newVal);

    const onPointerMove = (e: PointerEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as PointerEvent).clientX;
      const val = calculateValueFromPointer(clientX);
      updateValue(thumb, val);
    };

    const onPointerUp = () => {
      setActiveThumb(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  }, [calculateValueFromPointer, updateValue]);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clickVal = calculateValueFromPointer(e.clientX);
    const distToMin = Math.abs(clickVal - value[0]);
    const distToMax = Math.abs(clickVal - value[1]);
    const chosenThumb = distToMin <= distToMax ? 'min' : 'max';
    startDragging(chosenThumb, e.clientX);
  };

  const handleThumbPointerDown = (thumb: 'min' | 'max', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startDragging(thumb, e.clientX);
  };

  const minPct = Math.max(0, Math.min(100, ((value[0] - min) / (max - min)) * 100));
  const maxPct = Math.max(0, Math.min(100, ((value[1] - min) / (max - min)) * 100));

  // Valeurs affichées
  const displayMin = minLabel || `${value[0]}${unit}`;
  const displayMax = maxLabel || `${value[1]}${unit}`;

  return (
    <div className={`mb-6 select-none ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[13.5px] text-gray-400 font-medium">{label}</span>
        <span className="text-[13.5px] font-bold text-black dark:text-white">
          {displayMin} - {displayMax}
        </span>
      </div>
      <div className="px-2 pt-1 pb-2">
        <div 
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="relative h-[28px] flex items-center touch-none cursor-pointer"
          role="group"
          aria-label={label}
        >
          {/* Piste de fond */}
          <div className="absolute h-[3px] bg-gray-200 dark:bg-gray-700 w-full rounded-full pointer-events-none" />
          
          {/* Piste active */}
          <div 
            className="absolute h-[3px] bg-black dark:bg-white rounded-full pointer-events-none transition-all duration-75"
            style={{
              left: `${minPct}%`,
              width: `${Math.max(0, maxPct - minPct)}%`
            }}
          />

          {/* Bille Min (Gauche) */}
          <div
            onPointerDown={(e) => handleThumbPointerDown('min', e)}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 touch-none"
            style={{ left: `${minPct}%` }}
            aria-label="Valeur minimum"
            role="slider"
            aria-valuemin={min}
            aria-valuemax={value[1] - 1}
            aria-valuenow={value[0]}
          >
            <div 
              className={`w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-[2.5px] border-black dark:border-white shadow-md transition-transform duration-100 flex items-center justify-center ${
                activeThumb === 'min' ? 'scale-125 ring-4 ring-black/15 dark:ring-white/15' : 'scale-100 hover:scale-110'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
            </div>
          </div>

          {/* Bille Max (Droite) */}
          <div
            onPointerDown={(e) => handleThumbPointerDown('max', e)}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 touch-none"
            style={{ left: `${maxPct}%` }}
            aria-label="Valeur maximum"
            role="slider"
            aria-valuemin={value[0] + 1}
            aria-valuemax={max}
            aria-valuenow={value[1]}
          >
            <div 
              className={`w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-[2.5px] border-black dark:border-white shadow-md transition-transform duration-100 flex items-center justify-center ${
                activeThumb === 'max' ? 'scale-125 ring-4 ring-black/15 dark:ring-white/15' : 'scale-100 hover:scale-110'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 4. COMPOSANT FILTER ITEM
// ============================================

interface FilterItemProps {
  icon: React.ReactNode;
  label: string;
  current?: string;
  isActive?: boolean;
  isRequired?: boolean;
  onClick: () => void;
  badge?: number;
}

const FilterItem: React.FC<FilterItemProps> = ({
  icon,
  label,
  current,
  isActive = false,
  isRequired = false,
  onClick,
  badge,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full py-3 flex items-center justify-between text-left 
        active:bg-gray-50 dark:active:bg-gray-800/50 
        hover:bg-gray-50/50 dark:hover:bg-gray-800/30 
        transition-colors rounded-lg px-1
        ${isActive ? 'bg-gray-50/70 dark:bg-gray-800/40' : ''}
      `}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="shrink-0">{icon}</div>
        <span className="text-[14.5px] font-semibold text-black dark:text-white truncate">
          {label}
          {isRequired && (
            <span className="ml-1 text-[10px] text-[#e20030] font-bold">*</span>
          )}
        </span>
      </div>
      <div className="flex items-center space-x-1 shrink-0 ml-2">
        {badge && badge > 0 && (
          <span className="bg-[#e20030] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {current ? (
          <span className="text-[13px] font-semibold text-black dark:text-white mr-1 truncate max-w-[100px]">
            {current}
          </span>
        ) : null}
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </div>
    </button>
  );
};

// ============================================
// 5. COMPOSANT PRINCIPAL
// ============================================

export function EncountersFiltersMenu({ 
  onClose,
  genderPreference = 'femme',
  setGenderPreference,
  ageRange = DEFAULT_AGE_RANGE,
  setAgeRange,
  distanceRange = DEFAULT_DISTANCE_RANGE,
  setDistanceRange,
  advancedFilters = {},
  setAdvancedFilters,
  isPremium = false,
}: EncountersFiltersMenuProps) {
  // États locaux
  const [localGender, setLocalGender] = useState<'homme' | 'femme' | 'les_deux'>(genderPreference);
  const [localAgeRange, setLocalAgeRange] = useState<[number, number]>(ageRange);
  const [localDistanceRange, setLocalDistanceRange] = useState<[number, number]>(distanceRange);
  const [localAdvanced, setLocalAdvanced] = useState<AdvancedFilters>(advancedFilters);
  const [locationName, setLocationName] = useState(advancedFilters?.location || 'Emplacement actuel');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [activeOptionSheet, setActiveOptionSheet] = useState<string | null>(null);
  const [hasHapticFeedback, setHasHapticFeedback] = useState(true);

  // ============================================
  // 6. MÉMOISATION DES FILTRES
  // ============================================

  const filterConditions = useMemo(() => ({
    isAlcoholFilled: localAdvanced.alcohol && localAdvanced.alcohol !== 'Tous',
    isZodiacFilled: localAdvanced.zodiac && localAdvanced.zodiac !== 'Tous',
    isPetsFilled: localAdvanced.pets && localAdvanced.pets !== 'Tous',
    isPersonalityFilled: localAdvanced.personality && localAdvanced.personality !== 'Tous',
  }), [localAdvanced]);

  // Liste des filtres avancés
  const advancedFiltersList = useMemo(() => {
    const list: Array<{
      key: keyof typeof FILTER_ICONS;
      label: string;
      icon: React.ReactNode;
      current: string;
      isActive: boolean;
    }> = [];

    const filterKeys = Object.keys(FILTER_ICONS) as Array<keyof typeof FILTER_ICONS>;
    
    filterKeys.forEach((key) => {
      // Vérifier les conditions d'affichage
      const conditionMap: Partial<Record<keyof typeof FILTER_ICONS, boolean>> = {
        alcohol: filterConditions.isAlcoholFilled,
        zodiac: filterConditions.isZodiacFilled,
        pets: filterConditions.isPetsFilled,
        personality: filterConditions.isPersonalityFilled,
      };

      // Si condition spécifique et non remplie, on skip
      if (conditionMap[key] === false) return;

      const value = localAdvanced[key];
      const IconComponent = FILTER_ICONS[key];
      
      let displayValue = '';
      if (key === 'verifiedOnly') {
        displayValue = value ? 'Oui' : '';
      } else if (value && value !== 'Tous' && value !== '') {
        displayValue = String(value);
      }

      list.push({
        key,
        label: FILTER_LABELS[key],
        icon: <IconComponent className="w-[18px] h-[18px] text-black dark:text-white shrink-0" />,
        current: displayValue,
        isActive: !!displayValue,
      });
    });

    return list;
  }, [localAdvanced, filterConditions]);

  // Questions de profil (non remplies)
  const profileQuestions = useMemo(() => {
    const questions: Array<{
      key: string;
      label: string;
      icon: React.ReactNode;
      current: string;
    }> = [];

    const questionConfigs = [
      { key: 'alcohol', label: 'Alcool', icon: Wine, condition: !filterConditions.isAlcoholFilled },
      { key: 'zodiac', label: 'Signe astrologique', icon: Sparkles, condition: !filterConditions.isZodiacFilled },
      { key: 'pets', label: 'Animaux', icon: Dog, condition: !filterConditions.isPetsFilled },
      { key: 'personality', label: 'Personnalité', icon: Brain, condition: !filterConditions.isPersonalityFilled },
    ];

    questionConfigs.forEach(({ key, label, icon: IconComponent, condition }) => {
      if (condition) {
        questions.push({
          key,
          label,
          icon: <IconComponent className="w-[18px] h-[18px] text-black dark:text-white shrink-0" />,
          current: '',
        });
      }
    });

    return questions;
  }, [filterConditions]);

  // Nombre de filtres actifs
  const activeFilterCount = useMemo(() => {
    let count = 0;
    
    // Genre
    if (localGender !== 'les_deux') count++;
    
    // Âge
    if (localAgeRange[0] !== DEFAULT_AGE_RANGE[0] || localAgeRange[1] !== DEFAULT_AGE_RANGE[1]) {
      count++;
    }
    
    // Distance
    if (localDistanceRange[0] !== DEFAULT_DISTANCE_RANGE[0] || localDistanceRange[1] !== DEFAULT_DISTANCE_RANGE[1]) {
      count++;
    }
    
    // Filtres avancés
    Object.entries(localAdvanced).forEach(([key, value]) => {
      if (key === 'verifiedOnly' && value === true) {
        count++;
      } else if (value && value !== 'Tous' && value !== '') {
        count++;
      }
    });
    
    return count;
  }, [localGender, localAgeRange, localDistanceRange, localAdvanced]);

  // ============================================
  // 7. HANDLERS
  // ============================================

  const triggerHaptic = useCallback(() => {
    if (hasHapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [hasHapticFeedback]);

  const handleClearAll = useCallback(() => {
    triggerHaptic();
    setLocalGender('les_deux');
    setLocalAgeRange(DEFAULT_AGE_RANGE);
    setLocalDistanceRange(DEFAULT_DISTANCE_RANGE);
    setLocationName('Emplacement actuel');
    setLocalAdvanced({});
  }, [triggerHaptic]);

  const handleApply = useCallback(() => {
    triggerHaptic();
    if (setGenderPreference) setGenderPreference(localGender);
    if (setAgeRange) setAgeRange(localAgeRange);
    if (setDistanceRange) setDistanceRange(localDistanceRange);
    if (setAdvancedFilters) setAdvancedFilters(localAdvanced);
    onClose();
  }, [
    localGender, localAgeRange, localDistanceRange, localAdvanced,
    setGenderPreference, setAgeRange, setDistanceRange, setAdvancedFilters,
    onClose, triggerHaptic
  ]);

  const handleFilterClick = useCallback((key: string) => {
    triggerHaptic();
    if (key === 'verifiedOnly') {
      setLocalAdvanced((prev) => ({
        ...prev,
        verifiedOnly: !prev.verifiedOnly
      }));
    } else {
      setActiveOptionSheet(key);
    }
  }, [triggerHaptic]);

  const handleGenderClick = useCallback((gender: 'homme' | 'femme' | 'les_deux') => {
    triggerHaptic();
    setLocalGender(gender);
  }, [triggerHaptic]);

  const handleLocationSelect = useCallback((selectedLoc: string) => {
    setLocationName(selectedLoc);
    setLocalAdvanced((prev) => ({
      ...prev,
      location: selectedLoc
    }));
    setShowLocationPicker(false);
  }, []);

  const handleOptionSave = useCallback((key: string, value: any) => {
    setLocalAdvanced((prev) => ({
      ...prev,
      [key]: value
    }));
    setActiveOptionSheet(null);
  }, []);

  // ============================================
  // 8. SYNC AVEC LES PROPS EXTERNES
  // ============================================

  useEffect(() => {
    setLocalGender(genderPreference);
  }, [genderPreference]);

  useEffect(() => {
    setLocalAgeRange(ageRange);
  }, [ageRange]);

  useEffect(() => {
    setLocalDistanceRange(distanceRange);
  }, [distanceRange]);

  useEffect(() => {
    setLocalAdvanced(advancedFilters);
    if (advancedFilters?.location) {
      setLocationName(advancedFilters.location);
    }
  }, [advancedFilters]);

  // ============================================
  // 9. RENDU
  // ============================================

  return (
    <motion.div 
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ 
        type: 'spring', 
        damping: 30, 
        stiffness: 300,
        opacity: { duration: 0.2 }
      }}
      className="fixed inset-0 bg-white dark:bg-gray-900 z-[100] flex flex-col h-[100dvh] overflow-hidden"
      role="dialog"
      aria-label="Filtres des rencontres"
      aria-modal="true"
    >
      {/* ========================================== */}
      {/* HEADER */}
      {/* ========================================== */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button 
          onClick={onClose} 
          className="p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors active:scale-90 cursor-pointer"
          aria-label="Fermer les filtres"
        >
          <X className="w-5 h-5 text-black dark:text-white" strokeWidth={2.2} />
        </button>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" strokeWidth={2} />
          <h2 className="text-[16px] font-bold text-black dark:text-white text-center">
            Filtrer
          </h2>
        </div>
        
        <button 
          onClick={handleClearAll} 
          className="text-[13.5px] font-normal text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
          aria-label="Effacer tous les filtres"
        >
          <span>Tout effacer</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* CONTENU SCROLLABLE */}
      {/* ========================================== */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 scrollbar-hide">
        
        {/* Je recherche... */}
        <div className="mb-4">
          <label className="block text-[13.5px] text-gray-400 font-medium mb-1.5">
            Je recherche...
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['homme', 'femme', 'les_deux'] as const).map((gender) => (
              <button 
                key={gender}
                onClick={() => handleGenderClick(gender)}
                className={`
                  rounded-full py-2 px-1 text-[13.5px] text-center transition-all
                  ${localGender === gender
                    ? 'border-[2px] border-black dark:border-white text-black dark:text-white font-semibold bg-white dark:bg-gray-800 shadow-sm'
                    : 'border border-gray-200 dark:border-gray-700 text-black dark:text-white font-medium bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                {GENDER_LABELS[gender]}
              </button>
            ))}
          </div>
        </div>

        {/* Tranche d'âge */}
        <RangeSlider
          min={18}
          max={80}
          value={localAgeRange}
          onChange={setLocalAgeRange}
          label="Tranche d'âge"
        />

        {/* Distance */}
        <RangeSlider
          min={1}
          max={100}
          value={localDistanceRange}
          onChange={setLocalDistanceRange}
          label="Distance"
          unit=" km"
        />

        {/* ========================================== */}
        {/* FILTRES AVANCÉS */}
        {/* ========================================== */}
        <div className="mt-6 mb-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[16px] sm:text-[17px] font-bold text-black dark:text-white">
              Filtres avancés
            </h2>
            {(isPremium || monetizationService.hasPermission('hasUnlimitedFilters')) && (
              <span className="text-[10.5px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                ⭐ ILLIMITÉ
              </span>
            )}
          </div>
          <p className="text-[12.5px] sm:text-[13px] text-gray-500 dark:text-gray-400 leading-snug mb-3">
            {(isPremium || monetizationService.hasPermission('hasUnlimitedFilters'))
              ? '✨ Tous les filtres illimités sont actifs avec Bavel Premium !' 
              : 'Filtres de base actifs (jusqu\'à 3 filtres). Passez à Bavel Premium pour profiter de filtres 100% illimités (non inclus dans Extra).'
            }
          </p>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {advancedFiltersList.map((filter, index) => (
              <FilterItem
                key={filter.key}
                icon={filter.icon}
                label={filter.label}
                current={filter.current}
                isActive={filter.isActive}
                onClick={() => handleFilterClick(filter.key)}
              />
            ))}
          </div>
        </div>

        {/* ========================================== */}
        {/* QUESTIONS DE PROFIL */}
        {/* ========================================== */}
        {profileQuestions.length > 0 && (
          <div className="mt-6 mb-4">
            <p className="text-[13px] text-gray-500 leading-snug mb-3">
              Pour utiliser ces filtres, répondez à ces questions sur votre propre profil
            </p>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {profileQuestions.map((q, index) => (
                <FilterItem
                  key={q.key}
                  icon={q.icon}
                  label={q.label}
                  isRequired
                  onClick={() => handleFilterClick(q.key)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* FOOTER - BOUTON OK */}
      {/* ========================================== */}
      <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-6 shrink-0">
        <motion.button 
          onClick={handleApply}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3.5 rounded-full text-[15px] shadow-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <span>OK</span>
          {activeFilterCount > 0 && (
            <span className="bg-white/20 dark:bg-black/20 text-white dark:text-black text-[11px] font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}
            </span>
          )}
        </motion.button>
      </div>

      {/* ========================================== */}
      {/* SHEETS MODAUX */}
      {/* ========================================== */}
      <AnimatePresence>
        {activeOptionSheet === 'height' && (
          <HeightFilterSheet 
            currentValue={localAdvanced.height}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => handleOptionSave('height', val)}
          />
        )}
        
        {activeOptionSheet === 'alcohol' && (
          <AlcoholFilterSheet
            currentValue={localAdvanced.alcohol}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => handleOptionSave('alcohol', val)}
          />
        )}
        
        {activeOptionSheet === 'pets' && (
          <PetsFilterSheet
            currentValue={localAdvanced.pets}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => handleOptionSave('pets', val)}
          />
        )}
        
        {activeOptionSheet === 'zodiac' && (
          <ZodiacFilterSheet
            currentValue={localAdvanced.zodiac}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => handleOptionSave('zodiac', val)}
          />
        )}
        
        {activeOptionSheet === 'personality' && (
          <PersonalityFilterSheet
            currentValue={localAdvanced.personality}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => handleOptionSave('personality', val)}
          />
        )}
        
        {activeOptionSheet && 
          !['height', 'alcohol', 'pets', 'zodiac', 'personality'].includes(activeOptionSheet) && (
          <OptionFilterSheet 
            activeKey={activeOptionSheet}
            currentValue={String(localAdvanced[activeOptionSheet as keyof AdvancedFilters] || '')}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => handleOptionSave(activeOptionSheet, val)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// 10. EXPORT PAR DÉFAUT
// ============================================

export default EncountersFiltersMenu;