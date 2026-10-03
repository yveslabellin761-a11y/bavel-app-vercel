import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Navigation, Heart, Wine, Cigarette, Baby, Sparkles, Target, Dog, Users, Ruler, Brain, Languages, GraduationCap, CheckCircle, Hand, ChevronRight
} from 'lucide-react';
import {
  LocationPickerSheet, HeightFilterSheet, OptionFilterSheet, AlcoholFilterSheet, PetsFilterSheet, ZodiacFilterSheet, PersonalityFilterSheet
} from './Filters';

export function DiscoverFiltersMenu({ 
  onClose,
  genderPreference = 'femme',
  setGenderPreference,
  filterType = 'tous',
  setFilterType,
  ageRange = [18, 80],
  setAgeRange,
  advancedFilters = {},
  setAdvancedFilters
}: { 
  onClose: () => void;
  genderPreference?: 'homme' | 'femme' | 'les_deux';
  setGenderPreference?: (pref: 'homme' | 'femme' | 'les_deux') => void;
  filterType?: 'tous' | 'en_ligne' | 'nouveau';
  setFilterType?: (ft: 'tous' | 'en_ligne' | 'nouveau') => void;
  ageRange?: [number, number];
  setAgeRange?: (range: [number, number]) => void;
  advancedFilters?: {
    status?: string;
    religion?: string;
    smoking?: string;
    children?: string;
    lookingFor?: string;
    sexuality?: string;
    height?: string;
    language?: string;
    education?: string;
    verifiedOnly?: boolean;
    alcohol?: string;
    zodiac?: string;
    pets?: string;
    personality?: string;
    location?: string;
  };
  setAdvancedFilters?: (filters: any) => void;
}) {
  const [localGender, setLocalGender] = useState<'homme' | 'femme' | 'les_deux'>(genderPreference || 'les_deux');
  const [localFilterType, setLocalFilterType] = useState<'tous' | 'en_ligne' | 'nouveau'>(filterType || 'tous');
  const [localAgeRange, setLocalAgeRange] = useState<[number, number]>(ageRange || [18, 80]);
  const [locationName, setLocationName] = useState(advancedFilters?.location || 'Emplacement actuel');
  const [localAdvanced, setLocalAdvanced] = useState<any>(advancedFilters || {});
  const [activeOptionSheet, setActiveOptionSheet] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThumb, setActiveThumb] = useState<'min' | 'max'>('min');

  const handleClearAll = () => {
    setLocalGender('les_deux');
    setLocalFilterType('tous');
    setLocalAgeRange([18, 80]);
    setLocationName('Emplacement actuel');
    setLocalAdvanced({});
  };

  const handleApply = () => {
    if (setGenderPreference) setGenderPreference(localGender);
    if (setFilterType) setFilterType(localFilterType);
    if (setAgeRange) setAgeRange(localAgeRange);
    if (setAdvancedFilters) setAdvancedFilters({
      ...localAdvanced,
      location: locationName
    });
    onClose();
  };

  const isAlcoholFilled = localAdvanced.alcohol && localAdvanced.alcohol !== 'Tous';
  const isZodiacFilled = localAdvanced.zodiac && localAdvanced.zodiac !== 'Tous';
  const isPetsFilled = localAdvanced.pets && localAdvanced.pets !== 'Tous';
  const isPersonalityFilled = localAdvanced.personality && localAdvanced.personality !== 'Tous';

  // Construct profileQuestions to only include UNFILLED items
  const profileQuestions = [];
  if (!isAlcoholFilled) {
    profileQuestions.push({ key: 'alcohol', label: 'Alcool', current: '', icon: <Wine className="w-[18px] h-[18px] text-black shrink-0" /> });
  }
  if (!isZodiacFilled) {
    profileQuestions.push({ key: 'zodiac', label: 'Signe astrologique', current: '', icon: <Sparkles className="w-[18px] h-[18px] text-black shrink-0" /> });
  }
  if (!isPetsFilled) {
    profileQuestions.push({ key: 'pets', label: 'Animaux', current: '', icon: <Dog className="w-[18px] h-[18px] text-black shrink-0" /> });
  }
  if (!isPersonalityFilled) {
    profileQuestions.push({ key: 'personality', label: 'Personnalité', current: '', icon: <Brain className="w-[18px] h-[18px] text-black shrink-0" /> });
  }

  // Construct advancedFiltersList to include filled items at their specific positions
  const advancedFiltersList = [];
  
  advancedFiltersList.push({ key: 'status', label: 'Statut', current: (localAdvanced.status && localAdvanced.status !== 'Tous') ? localAdvanced.status : '', icon: <Heart className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  advancedFiltersList.push({ key: 'religion', label: 'Religion', current: (localAdvanced.religion && localAdvanced.religion !== 'Tous') ? localAdvanced.religion : '', icon: <Hand className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  if (isAlcoholFilled) {
    advancedFiltersList.push({ key: 'alcohol', label: 'Alcool', current: localAdvanced.alcohol, icon: <Wine className="w-[18px] h-[18px] text-black shrink-0" /> });
  }
  
  advancedFiltersList.push({ key: 'smoking', label: 'Tabac', current: (localAdvanced.smoking && localAdvanced.smoking !== 'Tous') ? localAdvanced.smoking : '', icon: <Cigarette className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  advancedFiltersList.push({ key: 'children', label: 'Enfants', current: (localAdvanced.children && localAdvanced.children !== 'Tous') ? localAdvanced.children : '', icon: <Baby className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  if (isZodiacFilled) {
    advancedFiltersList.push({ key: 'zodiac', label: 'Signe astrologique', current: localAdvanced.zodiac, icon: <Sparkles className="w-[18px] h-[18px] text-black shrink-0" /> });
  }
  
  advancedFiltersList.push({ key: 'lookingFor', label: 'Ici pour', current: (localAdvanced.lookingFor && localAdvanced.lookingFor !== 'Tous') ? localAdvanced.lookingFor : '', icon: <Target className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  if (isPetsFilled) {
    advancedFiltersList.push({ key: 'pets', label: 'Animaux', current: localAdvanced.pets, icon: <Dog className="w-[18px] h-[18px] text-black shrink-0" /> });
  }
  
  advancedFiltersList.push({ key: 'sexuality', label: 'Sexualité', current: (localAdvanced.sexuality && localAdvanced.sexuality !== 'Tous') ? localAdvanced.sexuality : '', icon: <Users className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  advancedFiltersList.push({ key: 'height', label: 'Taille', current: (localAdvanced.height && localAdvanced.height !== 'Tous') ? localAdvanced.height : '', icon: <Ruler className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  if (isPersonalityFilled) {
    advancedFiltersList.push({ key: 'personality', label: 'Personnalité', current: localAdvanced.personality, icon: <Brain className="w-[18px] h-[18px] text-black shrink-0" /> });
  }
  
  advancedFiltersList.push({ key: 'language', label: 'Langue', current: (localAdvanced.language && localAdvanced.language !== 'Tous') ? localAdvanced.language : '', icon: <Languages className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  advancedFiltersList.push({ key: 'education', label: 'Niveau d\'études', current: (localAdvanced.education && localAdvanced.education !== 'Tous') ? localAdvanced.education : '', icon: <GraduationCap className="w-[18px] h-[18px] text-black shrink-0" /> });
  
  advancedFiltersList.push({ key: 'verifiedOnly', label: 'Profils vérifiés', current: localAdvanced.verifiedOnly ? 'Oui' : '', icon: <CheckCircle className="w-[18px] h-[18px] text-black shrink-0" /> });

  const handleFilterClick = (key: string) => {
    if (key === 'verifiedOnly') {
      setLocalAdvanced((prev: any) => ({
        ...prev,
        verifiedOnly: !prev.verifiedOnly
      }));
    } else {
      setActiveOptionSheet(key);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 bg-white z-[100] flex flex-col pt-10 h-[100dvh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-gray-100">
        <button onClick={onClose} className="p-1 -ml-1">
          <X className="w-5 h-5 text-black" strokeWidth={2.2} />
        </button>
        <h2 className="text-[16px] font-bold text-black text-center">Filtrer</h2>
        <button onClick={handleClearAll} className="text-[13.5px] font-normal text-gray-300 hover:text-black transition-colors">
          Tout effacer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 scrollbar-hide">
        {/* Emplacement */}
        <div className="mb-6">
          <label className="block text-[15px] text-gray-400 font-medium mb-2.5">Emplacement</label>
          <button 
            onClick={() => setShowLocationPicker(true)}
            className="w-full bg-white border border-gray-100 rounded-[12px] px-4 py-3.5 flex items-center justify-between text-left text-[14.5px] font-normal text-black active:bg-gray-50 transition-colors shadow-sm"
          >
            <span className="truncate">{locationName}</span>
            <Navigation className="w-5 h-5 text-gray-400 fill-gray-400 shrink-0" style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>

        {/* Je recherche... */}
        <div className="mb-4">
          <label className="block text-[13.5px] text-gray-400 font-medium mb-1.5">Je recherche...</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button 
              onClick={() => setLocalGender('homme')}
              className={`rounded-full py-2 px-1 text-[13.5px] text-center transition-all ${
                localGender === 'homme'
                  ? 'border-[2px] border-black text-black font-semibold bg-white'
                  : 'border border-gray-200 text-black font-medium bg-white hover:border-gray-300'
              }`}
            >
              Des hommes
            </button>
            <button 
              onClick={() => setLocalGender('femme')}
              className={`rounded-full py-2 px-1 text-[13.5px] text-center transition-all ${
                localGender === 'femme'
                  ? 'border-[2px] border-black text-black font-semibold bg-white'
                  : 'border border-gray-200 text-black font-medium bg-white hover:border-gray-300'
              }`}
            >
              Des femmes
            </button>
            <button 
              onClick={() => setLocalGender('les_deux')}
              className={`rounded-full py-2 px-1 text-[13.5px] text-center transition-all ${
                localGender === 'les_deux'
                  ? 'border-[2px] border-black text-black font-semibold bg-white'
                  : 'border border-gray-200 text-black font-medium bg-white hover:border-gray-300'
              }`}
            >
              Les deux
            </button>
          </div>
        </div>

        {/* Filtre */}
        <div className="mb-4">
          <label className="block text-[13.5px] text-gray-400 font-medium mb-1.5">Filtre</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button 
              onClick={() => setLocalFilterType('tous')}
              className={`rounded-full py-2 px-1 text-[13.5px] text-center transition-all ${
                localFilterType === 'tous'
                  ? 'border-[2px] border-black text-black font-semibold bg-white'
                  : 'border border-gray-200 text-black font-medium bg-white hover:border-gray-300'
              }`}
            >
              Tous
            </button>
            <button 
              onClick={() => setLocalFilterType('en_ligne')}
              className={`rounded-full py-2 px-1 text-[13.5px] text-center transition-all ${
                localFilterType === 'en_ligne'
                  ? 'border-[2px] border-black text-black font-semibold bg-white'
                  : 'border border-gray-200 text-black font-medium bg-white hover:border-gray-300'
              }`}
            >
              En ligne
            </button>
            <button 
              onClick={() => setLocalFilterType('nouveau')}
              className={`rounded-full py-2 px-1 text-[13.5px] text-center transition-all ${
                localFilterType === 'nouveau'
                  ? 'border-[2px] border-black text-black font-semibold bg-white'
                  : 'border border-gray-200 text-black font-medium bg-white hover:border-gray-300'
              }`}
            >
              Nouveau
            </button>
          </div>
        </div>

        {/* Tranche d'âge */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13.5px] text-gray-400 font-medium">Tranche d'âge</span>
            <span className="text-[13.5px] font-bold text-black">{localAgeRange[0]} - {localAgeRange[1]}</span>
          </div>
          <div className="px-1 pt-1">
            <div 
              className="relative h-[24px] flex items-center"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const hoverVal = 18 + pct * (80 - 18);
                setActiveThumb(Math.abs(hoverVal - localAgeRange[0]) < Math.abs(hoverVal - localAgeRange[1]) ? 'min' : 'max');
              }}
              onTouchStart={(e) => {
                if (e.touches && e.touches[0]) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.touches[0].clientX - rect.left) / rect.width;
                  const hoverVal = 18 + pct * (80 - 18);
                  setActiveThumb(Math.abs(hoverVal - localAgeRange[0]) < Math.abs(hoverVal - localAgeRange[1]) ? 'min' : 'max');
                }
              }}
            >
              <div className="absolute h-[2px] bg-gray-200 w-full rounded-full pointer-events-none" />
              <div 
                className="absolute h-[2px] bg-black rounded-full pointer-events-none"
                style={{
                  left: `${((localAgeRange[0] - 18) / (80 - 18)) * 100}%`,
                  width: `${((localAgeRange[1] - localAgeRange[0]) / (80 - 18)) * 100}%`
                }}
              />
              <input
                type="range"
                min={18}
                max={80}
                value={localAgeRange[0]}
                onChange={(e) => {
                  const val = Math.min(Number(e.target.value), localAgeRange[1] - 1);
                  setLocalAgeRange([val, localAgeRange[1]]);
                }}
                className={`absolute w-full appearance-none bg-transparent pointer-events-auto cursor-pointer h-6 opacity-0 ${
                  activeThumb === 'min' ? 'z-30' : 'z-20'
                }`}
              />
              <input
                type="range"
                min={18}
                max={80}
                value={localAgeRange[1]}
                onChange={(e) => {
                  const val = Math.max(Number(e.target.value), localAgeRange[0] + 1);
                  setLocalAgeRange([localAgeRange[0], val]);
                }}
                className={`absolute w-full appearance-none bg-transparent pointer-events-auto cursor-pointer h-6 opacity-0 ${
                  activeThumb === 'max' ? 'z-30' : 'z-20'
                }`}
              />
              <div 
                className="absolute w-6 h-6 bg-white border-2 border-black rounded-full -translate-x-1/2 shadow-xs pointer-events-none z-10"
                style={{ left: `${((localAgeRange[0] - 18) / (80 - 18)) * 100}%` }}
              />
              <div 
                className="absolute w-6 h-6 bg-white border-2 border-black rounded-full -translate-x-1/2 shadow-xs pointer-events-none z-10"
                style={{ left: `${((localAgeRange[1] - 18) / (80 - 18)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filtres avancés */}
        <div className="mt-6 mb-3">
          <h2 className="text-[17px] font-bold text-black mb-1">Filtres avancés</h2>
          <p className="text-[13px] text-gray-500 leading-snug mb-3">
            Vous pouvez combiner jusqu'à 3 filtres, ou bien tous les débloquer avec Bavel Premium
          </p>

          <div className="divide-y divide-gray-100">
            {advancedFiltersList.map((filter, index) => (
              <button 
                key={index}
                onClick={() => handleFilterClick(filter.key)}
                className="w-full py-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {filter.icon}
                  <span className="text-[14.5px] font-semibold text-black">{filter.label}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {filter.current ? (
                    <span className="text-[13px] font-semibold text-black mr-1">{filter.current}</span>
                  ) : null}
                  <ChevronRight className="w-4 h-4 text-black" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section questions de profil */}
        {profileQuestions.length > 0 && (
          <div className="mt-6 mb-4">
            <p className="text-[13px] text-gray-500 leading-snug mb-3">
              Pour utiliser ces filtres, répondez à ces questions sur votre propre profil
            </p>

            <div className="divide-y divide-gray-100">
              {profileQuestions.map((q, index) => (
                <button 
                  key={index}
                  onClick={() => handleFilterClick(q.key)}
                  className="w-full py-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {q.icon}
                    <span className="text-[14.5px] font-semibold text-black">{q.label}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {q.current ? (
                      <span className="text-[13px] font-semibold text-black mr-1">{q.current}</span>
                    ) : (
                      <span className="text-[13px] font-bold text-[#e20030]">Répondre</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-black ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer OK Button */}
      <div className="p-3 bg-white border-t border-gray-100 pb-6 shrink-0">
        <button 
          onClick={handleApply} 
          className="w-full bg-black text-white font-bold py-3 rounded-full text-[15px] active:scale-[0.98] transition-transform"
        >
          OK
        </button>
      </div>

      {/* Nested Option Sheet Overlay */}
      <AnimatePresence>
        {activeOptionSheet === 'height' ? (
          <HeightFilterSheet 
            currentValue={localAdvanced.height}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => {
              setLocalAdvanced((prev: any) => ({
                ...prev,
                height: val
              }));
              setActiveOptionSheet(null);
            }}
          />
        ) : activeOptionSheet === 'alcohol' ? (
          <AlcoholFilterSheet
            currentValue={localAdvanced.alcohol}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => {
              setLocalAdvanced((prev: any) => ({
                ...prev,
                alcohol: val
              }));
              setActiveOptionSheet(null);
            }}
          />
        ) : activeOptionSheet === 'pets' ? (
          <PetsFilterSheet
            currentValue={localAdvanced.pets}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => {
              setLocalAdvanced((prev: any) => ({
                ...prev,
                pets: val
              }));
              setActiveOptionSheet(null);
            }}
          />
        ) : activeOptionSheet === 'zodiac' ? (
          <ZodiacFilterSheet
            currentValue={localAdvanced.zodiac}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => {
              setLocalAdvanced((prev: any) => ({
                ...prev,
                zodiac: val
              }));
              setActiveOptionSheet(null);
            }}
          />
        ) : activeOptionSheet === 'personality' ? (
          <PersonalityFilterSheet
            currentValue={localAdvanced.personality}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => {
              setLocalAdvanced((prev: any) => ({
                ...prev,
                personality: val
              }));
              setActiveOptionSheet(null);
            }}
          />
        ) : activeOptionSheet ? (
          <OptionFilterSheet 
            activeKey={activeOptionSheet}
            currentValue={localAdvanced[activeOptionSheet]}
            onClose={() => setActiveOptionSheet(null)}
            onSave={(val) => {
              setLocalAdvanced((prev: any) => ({
                ...prev,
                [activeOptionSheet]: val
              }));
              setActiveOptionSheet(null);
            }}
          />
        ) : null}

        {showLocationPicker && (
          <LocationPickerSheet
            currentLocation={locationName}
            onClose={() => setShowLocationPicker(false)}
            onSelectLocation={(selectedLoc) => {
              setLocationName(selectedLoc);
              setLocalAdvanced((prev: any) => ({
                ...prev,
                location: selectedLoc
              }));
              setShowLocationPicker(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
