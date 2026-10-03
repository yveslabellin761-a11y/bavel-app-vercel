import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const COUNTRY_INFO_CACHE_KEY = 'bavel_country_info_v2';
const COUNTRY_TIMESTAMP_CACHE_KEY = 'bavel_country_timestamp_v2';

// ============================================
// 1. TYPES
// ============================================

export interface CountryInfo {
  code: string;
  dialCode: string;
  name: string;
  nameNative?: string;
  flag: string;
  emoji: string;
  continent: string;
  region: string;
  subregion?: string;
  capital?: string;
  population?: number;
  area?: number;
  languages: string[];
  currency?: string;
  timezone?: string[];
  tld?: string;
  phonePrefix?: string;
  isEU?: boolean;
  isSchengen?: boolean;
}

export interface DetectionResult {
  method: 'language' | 'timezone' | 'cache' | 'fallback' | 'manual';
  timestamp: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface UseCountryDetectionOptions {
  enableTimezoneDetection?: boolean;
  enableCache?: boolean;
  cacheTTL?: number; // milliseconds
  fallbackCountry?: string;
  onDetected?: (country: CountryInfo) => void;
  onError?: (error: Error) => void;
}

// ============================================
// 2. CONSTANTES - BASE DE DONNÉES DES PAYS
// ============================================

export const COUNTRIES: Record<string, CountryInfo> = {
  // ============================================
  // AFRIQUE
  // ============================================
  'CI': {
    code: 'CI',
    dialCode: '+225',
    name: "Côte d'Ivoire",
    nameNative: "Côte d'Ivoire",
    flag: '🇨🇮',
    emoji: '🇨🇮',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Yamoussoukro',
    population: 26378274,
    languages: ['fr'],
    currency: 'XOF',
    timezone: ['Africa/Abidjan'],
    tld: '.ci',
  },
  'SN': {
    code: 'SN',
    dialCode: '+221',
    name: 'Sénégal',
    nameNative: 'Sénégal',
    flag: '🇸🇳',
    emoji: '🇸🇳',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Dakar',
    population: 16743927,
    languages: ['fr'],
    currency: 'XOF',
    timezone: ['Africa/Dakar'],
    tld: '.sn',
  },
  'CM': {
    code: 'CM',
    dialCode: '+237',
    name: 'Cameroun',
    nameNative: 'Cameroun',
    flag: '🇨🇲',
    emoji: '🇨🇲',
    continent: 'Afrique',
    region: 'Afrique centrale',
    subregion: 'Afrique centrale',
    capital: 'Yaoundé',
    population: 26545863,
    languages: ['fr', 'en'],
    currency: 'XAF',
    timezone: ['Africa/Douala'],
    tld: '.cm',
  },
  'TG': {
    code: 'TG',
    dialCode: '+228',
    name: 'Togo',
    nameNative: 'Togo',
    flag: '🇹🇬',
    emoji: '🇹🇬',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Lomé',
    population: 8278737,
    languages: ['fr'],
    currency: 'XOF',
    timezone: ['Africa/Lome'],
    tld: '.tg',
  },
  'BJ': {
    code: 'BJ',
    dialCode: '+229',
    name: 'Bénin',
    nameNative: 'Bénin',
    flag: '🇧🇯',
    emoji: '🇧🇯',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Porto-Novo',
    population: 12123200,
    languages: ['fr'],
    currency: 'XOF',
    timezone: ['Africa/Porto-Novo'],
    tld: '.bj',
  },
  'BF': {
    code: 'BF',
    dialCode: '+226',
    name: 'Burkina Faso',
    nameNative: 'Burkina Faso',
    flag: '🇧🇫',
    emoji: '🇧🇫',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Ouagadougou',
    population: 20903273,
    languages: ['fr'],
    currency: 'XOF',
    timezone: ['Africa/Ouagadougou'],
    tld: '.bf',
  },
  'ML': {
    code: 'ML',
    dialCode: '+223',
    name: 'Mali',
    nameNative: 'Mali',
    flag: '🇲🇱',
    emoji: '🇲🇱',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Bamako',
    population: 20250833,
    languages: ['fr'],
    currency: 'XOF',
    timezone: ['Africa/Bamako'],
    tld: '.ml',
  },
  'NE': {
    code: 'NE',
    dialCode: '+227',
    name: 'Niger',
    nameNative: 'Niger',
    flag: '🇳🇪',
    emoji: '🇳🇪',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Niamey',
    population: 24206636,
    languages: ['fr'],
    currency: 'XOF',
    timezone: ['Africa/Niamey'],
    tld: '.ne',
  },
  'GN': {
    code: 'GN',
    dialCode: '+224',
    name: 'Guinée',
    nameNative: 'Guinée',
    flag: '🇬🇳',
    emoji: '🇬🇳',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Conakry',
    population: 13132795,
    languages: ['fr'],
    currency: 'GNF',
    timezone: ['Africa/Conakry'],
    tld: '.gn',
  },
  'GA': {
    code: 'GA',
    dialCode: '+241',
    name: 'Gabon',
    nameNative: 'Gabon',
    flag: '🇬🇦',
    emoji: '🇬🇦',
    continent: 'Afrique',
    region: 'Afrique centrale',
    subregion: 'Afrique centrale',
    capital: 'Libreville',
    population: 2225573,
    languages: ['fr'],
    currency: 'XAF',
    timezone: ['Africa/Libreville'],
    tld: '.ga',
  },
  'CD': {
    code: 'CD',
    dialCode: '+243',
    name: 'République Démocratique du Congo',
    nameNative: 'République Démocratique du Congo',
    flag: '🇨🇩',
    emoji: '🇨🇩',
    continent: 'Afrique',
    region: 'Afrique centrale',
    subregion: 'Afrique centrale',
    capital: 'Kinshasa',
    population: 89561403,
    languages: ['fr'],
    currency: 'CDF',
    timezone: ['Africa/Kinshasa', 'Africa/Lubumbashi'],
    tld: '.cd',
  },
  'CG': {
    code: 'CG',
    dialCode: '+242',
    name: 'Congo',
    nameNative: 'Congo',
    flag: '🇨🇬',
    emoji: '🇨🇬',
    continent: 'Afrique',
    region: 'Afrique centrale',
    subregion: 'Afrique centrale',
    capital: 'Brazzaville',
    population: 5518087,
    languages: ['fr'],
    currency: 'XAF',
    timezone: ['Africa/Brazzaville'],
    tld: '.cg',
  },
  'MA': {
    code: 'MA',
    dialCode: '+212',
    name: 'Maroc',
    nameNative: 'المغرب',
    flag: '🇲🇦',
    emoji: '🇲🇦',
    continent: 'Afrique',
    region: 'Afrique du Nord',
    subregion: 'Afrique du Nord',
    capital: 'Rabat',
    population: 36910560,
    languages: ['ar', 'fr'],
    currency: 'MAD',
    timezone: ['Africa/Casablanca'],
    tld: '.ma',
  },
  'DZ': {
    code: 'DZ',
    dialCode: '+213',
    name: 'Algérie',
    nameNative: 'الجزائر',
    flag: '🇩🇿',
    emoji: '🇩🇿',
    continent: 'Afrique',
    region: 'Afrique du Nord',
    subregion: 'Afrique du Nord',
    capital: 'Alger',
    population: 43851044,
    languages: ['ar', 'fr'],
    currency: 'DZD',
    timezone: ['Africa/Algiers'],
    tld: '.dz',
  },
  'TN': {
    code: 'TN',
    dialCode: '+216',
    name: 'Tunisie',
    nameNative: 'تونس',
    flag: '🇹🇳',
    emoji: '🇹🇳',
    continent: 'Afrique',
    region: 'Afrique du Nord',
    subregion: 'Afrique du Nord',
    capital: 'Tunis',
    population: 11818618,
    languages: ['ar', 'fr'],
    currency: 'TND',
    timezone: ['Africa/Tunis'],
    tld: '.tn',
  },
  'EG': {
    code: 'EG',
    dialCode: '+20',
    name: 'Égypte',
    nameNative: 'مصر',
    flag: '🇪🇬',
    emoji: '🇪🇬',
    continent: 'Afrique',
    region: 'Afrique du Nord',
    subregion: 'Afrique du Nord',
    capital: 'Le Caire',
    population: 102334404,
    languages: ['ar'],
    currency: 'EGP',
    timezone: ['Africa/Cairo'],
    tld: '.eg',
  },
  'ZA': {
    code: 'ZA',
    dialCode: '+27',
    name: 'Afrique du Sud',
    nameNative: 'South Africa',
    flag: '🇿🇦',
    emoji: '🇿🇦',
    continent: 'Afrique',
    region: 'Afrique australe',
    subregion: 'Afrique australe',
    capital: 'Pretoria',
    population: 59308690,
    languages: ['en', 'af', 'zu', 'xh', 'st', 'tn', 'ts', 'ss', 've', 'nr'],
    currency: 'ZAR',
    timezone: ['Africa/Johannesburg'],
    tld: '.za',
  },
  'NG': {
    code: 'NG',
    dialCode: '+234',
    name: 'Nigeria',
    nameNative: 'Nigeria',
    flag: '🇳🇬',
    emoji: '🇳🇬',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Abuja',
    population: 206139589,
    languages: ['en'],
    currency: 'NGN',
    timezone: ['Africa/Lagos'],
    tld: '.ng',
  },
  'KE': {
    code: 'KE',
    dialCode: '+254',
    name: 'Kenya',
    nameNative: 'Kenya',
    flag: '🇰🇪',
    emoji: '🇰🇪',
    continent: 'Afrique',
    region: 'Afrique de l\'Est',
    subregion: 'Afrique de l\'Est',
    capital: 'Nairobi',
    population: 53771296,
    languages: ['en', 'sw'],
    currency: 'KES',
    timezone: ['Africa/Nairobi'],
    tld: '.ke',
  },
  'GH': {
    code: 'GH',
    dialCode: '+233',
    name: 'Ghana',
    nameNative: 'Ghana',
    flag: '🇬🇭',
    emoji: '🇬🇭',
    continent: 'Afrique',
    region: 'Afrique de l\'Ouest',
    subregion: 'Afrique de l\'Ouest',
    capital: 'Accra',
    population: 31072940,
    languages: ['en'],
    currency: 'GHS',
    timezone: ['Africa/Accra'],
    tld: '.gh',
  },
  'UG': {
    code: 'UG',
    dialCode: '+256',
    name: 'Ouganda',
    nameNative: 'Uganda',
    flag: '🇺🇬',
    emoji: '🇺🇬',
    continent: 'Afrique',
    region: 'Afrique de l\'Est',
    subregion: 'Afrique de l\'Est',
    capital: 'Kampala',
    population: 45741007,
    languages: ['en', 'sw'],
    currency: 'UGX',
    timezone: ['Africa/Kampala'],
    tld: '.ug',
  },
  'RW': {
    code: 'RW',
    dialCode: '+250',
    name: 'Rwanda',
    nameNative: 'Rwanda',
    flag: '🇷🇼',
    emoji: '🇷🇼',
    continent: 'Afrique',
    region: 'Afrique de l\'Est',
    subregion: 'Afrique de l\'Est',
    capital: 'Kigali',
    population: 12952218,
    languages: ['en', 'rw', 'fr'],
    currency: 'RWF',
    timezone: ['Africa/Kigali'],
    tld: '.rw',
  },

  // ============================================
  // EUROPE
  // ============================================
  'FR': {
    code: 'FR',
    dialCode: '+33',
    name: 'France',
    nameNative: 'France',
    flag: '🇫🇷',
    emoji: '🇫🇷',
    continent: 'Europe',
    region: 'Europe de l\'Ouest',
    subregion: 'Europe de l\'Ouest',
    capital: 'Paris',
    population: 67391582,
    languages: ['fr'],
    currency: 'EUR',
    timezone: ['Europe/Paris'],
    tld: '.fr',
    isEU: true,
    isSchengen: true,
  },
  'GB': {
    code: 'GB',
    dialCode: '+44',
    name: 'Royaume-Uni',
    nameNative: 'United Kingdom',
    flag: '🇬🇧',
    emoji: '🇬🇧',
    continent: 'Europe',
    region: 'Europe du Nord',
    subregion: 'Îles Britanniques',
    capital: 'Londres',
    population: 67886011,
    languages: ['en'],
    currency: 'GBP',
    timezone: ['Europe/London'],
    tld: '.uk',
    isEU: false,
  },
  'DE': {
    code: 'DE',
    dialCode: '+49',
    name: 'Allemagne',
    nameNative: 'Deutschland',
    flag: '🇩🇪',
    emoji: '🇩🇪',
    continent: 'Europe',
    region: 'Europe de l\'Ouest',
    subregion: 'Europe de l\'Ouest',
    capital: 'Berlin',
    population: 83783942,
    languages: ['de'],
    currency: 'EUR',
    timezone: ['Europe/Berlin'],
    tld: '.de',
    isEU: true,
    isSchengen: true,
  },
  'ES': {
    code: 'ES',
    dialCode: '+34',
    name: 'Espagne',
    nameNative: 'España',
    flag: '🇪🇸',
    emoji: '🇪🇸',
    continent: 'Europe',
    region: 'Europe du Sud',
    subregion: 'Péninsule Ibérique',
    capital: 'Madrid',
    population: 46754778,
    languages: ['es'],
    currency: 'EUR',
    timezone: ['Europe/Madrid'],
    tld: '.es',
    isEU: true,
    isSchengen: true,
  },
  'IT': {
    code: 'IT',
    dialCode: '+39',
    name: 'Italie',
    nameNative: 'Italia',
    flag: '🇮🇹',
    emoji: '🇮🇹',
    continent: 'Europe',
    region: 'Europe du Sud',
    subregion: 'Péninsule Italienne',
    capital: 'Rome',
    population: 60244639,
    languages: ['it'],
    currency: 'EUR',
    timezone: ['Europe/Rome'],
    tld: '.it',
    isEU: true,
    isSchengen: true,
  },
  'PT': {
    code: 'PT',
    dialCode: '+351',
    name: 'Portugal',
    nameNative: 'Portugal',
    flag: '🇵🇹',
    emoji: '🇵🇹',
    continent: 'Europe',
    region: 'Europe du Sud',
    subregion: 'Péninsule Ibérique',
    capital: 'Lisbonne',
    population: 10196709,
    languages: ['pt'],
    currency: 'EUR',
    timezone: ['Europe/Lisbon'],
    tld: '.pt',
    isEU: true,
    isSchengen: true,
  },
  'NL': {
    code: 'NL',
    dialCode: '+31',
    name: 'Pays-Bas',
    nameNative: 'Nederland',
    flag: '🇳🇱',
    emoji: '🇳🇱',
    continent: 'Europe',
    region: 'Europe de l\'Ouest',
    subregion: 'Europe de l\'Ouest',
    capital: 'Amsterdam',
    population: 17134772,
    languages: ['nl'],
    currency: 'EUR',
    timezone: ['Europe/Amsterdam'],
    tld: '.nl',
    isEU: true,
    isSchengen: true,
  },
  'BE': {
    code: 'BE',
    dialCode: '+32',
    name: 'Belgique',
    nameNative: 'België',
    flag: '🇧🇪',
    emoji: '🇧🇪',
    continent: 'Europe',
    region: 'Europe de l\'Ouest',
    subregion: 'Europe de l\'Ouest',
    capital: 'Bruxelles',
    population: 11589623,
    languages: ['nl', 'fr', 'de'],
    currency: 'EUR',
    timezone: ['Europe/Brussels'],
    tld: '.be',
    isEU: true,
    isSchengen: true,
  },
  'CH': {
    code: 'CH',
    dialCode: '+41',
    name: 'Suisse',
    nameNative: 'Schweiz',
    flag: '🇨🇭',
    emoji: '🇨🇭',
    continent: 'Europe',
    region: 'Europe de l\'Ouest',
    subregion: 'Europe de l\'Ouest',
    capital: 'Berne',
    population: 8654622,
    languages: ['de', 'fr', 'it', 'rm'],
    currency: 'CHF',
    timezone: ['Europe/Zurich'],
    tld: '.ch',
    isEU: false,
    isSchengen: true,
  },

  // ============================================
  // AMÉRIQUE DU NORD
  // ============================================
  'US': {
    code: 'US',
    dialCode: '+1',
    name: 'États-Unis',
    nameNative: 'United States',
    flag: '🇺🇸',
    emoji: '🇺🇸',
    continent: 'Amérique du Nord',
    region: 'Amérique du Nord',
    subregion: 'Amérique du Nord',
    capital: 'Washington D.C.',
    population: 331893745,
    languages: ['en'],
    currency: 'USD',
    timezone: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    tld: '.us',
  },
  'CA': {
    code: 'CA',
    dialCode: '+1',
    name: 'Canada',
    nameNative: 'Canada',
    flag: '🇨🇦',
    emoji: '🇨🇦',
    continent: 'Amérique du Nord',
    region: 'Amérique du Nord',
    subregion: 'Amérique du Nord',
    capital: 'Ottawa',
    population: 38246789,
    languages: ['en', 'fr'],
    currency: 'CAD',
    timezone: ['America/Toronto', 'America/Vancouver', 'America/Montreal'],
    tld: '.ca',
  },
  'MX': {
    code: 'MX',
    dialCode: '+52',
    name: 'Mexique',
    nameNative: 'México',
    flag: '🇲🇽',
    emoji: '🇲🇽',
    continent: 'Amérique du Nord',
    region: 'Amérique du Nord',
    subregion: 'Amérique du Nord',
    capital: 'Mexico',
    population: 128932753,
    languages: ['es'],
    currency: 'MXN',
    timezone: ['America/Mexico_City'],
    tld: '.mx',
  },

  // ============================================
  // AMÉRIQUE DU SUD
  // ============================================
  'BR': {
    code: 'BR',
    dialCode: '+55',
    name: 'Brésil',
    nameNative: 'Brasil',
    flag: '🇧🇷',
    emoji: '🇧🇷',
    continent: 'Amérique du Sud',
    region: 'Amérique du Sud',
    subregion: 'Amérique du Sud',
    capital: 'Brasilia',
    population: 213993437,
    languages: ['pt'],
    currency: 'BRL',
    timezone: ['America/Sao_Paulo'],
    tld: '.br',
  },
  'AR': {
    code: 'AR',
    dialCode: '+54',
    name: 'Argentine',
    nameNative: 'Argentina',
    flag: '🇦🇷',
    emoji: '🇦🇷',
    continent: 'Amérique du Sud',
    region: 'Amérique du Sud',
    subregion: 'Amérique du Sud',
    capital: 'Buenos Aires',
    population: 45376763,
    languages: ['es'],
    currency: 'ARS',
    timezone: ['America/Buenos_Aires'],
    tld: '.ar',
  },
  'CO': {
    code: 'CO',
    dialCode: '+57',
    name: 'Colombie',
    nameNative: 'Colombia',
    flag: '🇨🇴',
    emoji: '🇨🇴',
    continent: 'Amérique du Sud',
    region: 'Amérique du Sud',
    subregion: 'Amérique du Sud',
    capital: 'Bogota',
    population: 51265600,
    languages: ['es'],
    currency: 'COP',
    timezone: ['America/Bogota'],
    tld: '.co',
  },
  'CL': {
    code: 'CL',
    dialCode: '+56',
    name: 'Chili',
    nameNative: 'Chile',
    flag: '🇨🇱',
    emoji: '🇨🇱',
    continent: 'Amérique du Sud',
    region: 'Amérique du Sud',
    subregion: 'Amérique du Sud',
    capital: 'Santiago',
    population: 19458210,
    languages: ['es'],
    currency: 'CLP',
    timezone: ['America/Santiago'],
    tld: '.cl',
  },
  'PE': {
    code: 'PE',
    dialCode: '+51',
    name: 'Pérou',
    nameNative: 'Perú',
    flag: '🇵🇪',
    emoji: '🇵🇪',
    continent: 'Amérique du Sud',
    region: 'Amérique du Sud',
    subregion: 'Amérique du Sud',
    capital: 'Lima',
    population: 33050325,
    languages: ['es'],
    currency: 'PEN',
    timezone: ['America/Lima'],
    tld: '.pe',
  },

  // ============================================
  // ASIE
  // ============================================
  'AE': {
    code: 'AE',
    dialCode: '+971',
    name: 'Émirats Arabes Unis',
    nameNative: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    emoji: '🇦🇪',
    continent: 'Asie',
    region: 'Asie de l\'Ouest',
    subregion: 'Asie de l\'Ouest',
    capital: 'Abu Dhabi',
    population: 9890402,
    languages: ['ar'],
    currency: 'AED',
    timezone: ['Asia/Dubai'],
    tld: '.ae',
  },
  'SA': {
    code: 'SA',
    dialCode: '+966',
    name: 'Arabie Saoudite',
    nameNative: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    emoji: '🇸🇦',
    continent: 'Asie',
    region: 'Asie de l\'Ouest',
    subregion: 'Asie de l\'Ouest',
    capital: 'Riyad',
    population: 34813871,
    languages: ['ar'],
    currency: 'SAR',
    timezone: ['Asia/Riyadh'],
    tld: '.sa',
  },
  'IN': {
    code: 'IN',
    dialCode: '+91',
    name: 'Inde',
    nameNative: 'India',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    continent: 'Asie',
    region: 'Asie du Sud',
    subregion: 'Asie du Sud',
    capital: 'New Delhi',
    population: 1380004385,
    languages: ['hi', 'en'],
    currency: 'INR',
    timezone: ['Asia/Kolkata'],
    tld: '.in',
  },
  'CN': {
    code: 'CN',
    dialCode: '+86',
    name: 'Chine',
    nameNative: '中国',
    flag: '🇨🇳',
    emoji: '🇨🇳',
    continent: 'Asie',
    region: 'Asie de l\'Est',
    subregion: 'Asie de l\'Est',
    capital: 'Pékin',
    population: 1444216107,
    languages: ['zh'],
    currency: 'CNY',
    timezone: ['Asia/Shanghai'],
    tld: '.cn',
  },
  'JP': {
    code: 'JP',
    dialCode: '+81',
    name: 'Japon',
    nameNative: '日本',
    flag: '🇯🇵',
    emoji: '🇯🇵',
    continent: 'Asie',
    region: 'Asie de l\'Est',
    subregion: 'Asie de l\'Est',
    capital: 'Tokyo',
    population: 126476461,
    languages: ['ja'],
    currency: 'JPY',
    timezone: ['Asia/Tokyo'],
    tld: '.jp',
  },
  'KR': {
    code: 'KR',
    dialCode: '+82',
    name: 'Corée du Sud',
    nameNative: '대한민국',
    flag: '🇰🇷',
    emoji: '🇰🇷',
    continent: 'Asie',
    region: 'Asie de l\'Est',
    subregion: 'Asie de l\'Est',
    capital: 'Séoul',
    population: 51780579,
    languages: ['ko'],
    currency: 'KRW',
    timezone: ['Asia/Seoul'],
    tld: '.kr',
  },
  'RU': {
    code: 'RU',
    dialCode: '+7',
    name: 'Russie',
    nameNative: 'Россия',
    flag: '🇷🇺',
    emoji: '🇷🇺',
    continent: 'Europe/Asie',
    region: 'Europe de l\'Est',
    subregion: 'Europe de l\'Est',
    capital: 'Moscou',
    population: 145934462,
    languages: ['ru'],
    currency: 'RUB',
    timezone: ['Europe/Moscow'],
    tld: '.ru',
  },

  // ============================================
  // OCÉANIE
  // ============================================
  'AU': {
    code: 'AU',
    dialCode: '+61',
    name: 'Australie',
    nameNative: 'Australia',
    flag: '🇦🇺',
    emoji: '🇦🇺',
    continent: 'Océanie',
    region: 'Océanie',
    subregion: 'Australie et Nouvelle-Zélande',
    capital: 'Canberra',
    population: 25687041,
    languages: ['en'],
    currency: 'AUD',
    timezone: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
    tld: '.au',
  },
  'NZ': {
    code: 'NZ',
    dialCode: '+64',
    name: 'Nouvelle-Zélande',
    nameNative: 'New Zealand',
    flag: '🇳🇿',
    emoji: '🇳🇿',
    continent: 'Océanie',
    region: 'Océanie',
    subregion: 'Australie et Nouvelle-Zélande',
    capital: 'Wellington',
    population: 4822233,
    languages: ['en', 'mi'],
    currency: 'NZD',
    timezone: ['Pacific/Auckland'],
    tld: '.nz',
  },
};

// ============================================
// 3. CONSTANTES - MAPPINGS
// ============================================

// Mapping langue -> code pays
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  'fr': 'FR',
  'en-US': 'US',
  'en-GB': 'GB',
  'en': 'US',
  'de': 'DE',
  'es': 'ES',
  'it': 'IT',
  'pt': 'PT',
  'pt-BR': 'BR',
  'nl': 'NL',
  'ar': 'AE',
  'zh': 'CN',
  'ja': 'JP',
  'ko': 'KR',
  'ru': 'RU',
  'hi': 'IN',
  'sw': 'KE',
  'af': 'ZA',
  'zu': 'ZA',
  'xh': 'ZA',
  'st': 'ZA',
  'tn': 'ZA',
  'ts': 'ZA',
  'ss': 'ZA',
  've': 'ZA',
  'nr': 'ZA',
  'mi': 'NZ',
  'rw': 'RW',
};

// Mapping timezone -> code pays
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Afrique
  'Africa/Abidjan': 'CI',
  'Africa/Dakar': 'SN',
  'Africa/Douala': 'CM',
  'Africa/Lome': 'TG',
  'Africa/Porto-Novo': 'BJ',
  'Africa/Ouagadougou': 'BF',
  'Africa/Bamako': 'ML',
  'Africa/Niamey': 'NE',
  'Africa/Conakry': 'GN',
  'Africa/Libreville': 'GA',
  'Africa/Kinshasa': 'CD',
  'Africa/Lubumbashi': 'CD',
  'Africa/Brazzaville': 'CG',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Cairo': 'EG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Accra': 'GH',
  'Africa/Kampala': 'UG',
  'Africa/Kigali': 'RW',
  // Europe
  'Europe/Paris': 'FR',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Lisbon': 'PT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'Europe/Moscow': 'RU',
  // Amérique du Nord
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Mexico_City': 'MX',
  // Amérique du Sud
  'America/Sao_Paulo': 'BR',
  'America/Buenos_Aires': 'AR',
  'America/Bogota': 'CO',
  'America/Santiago': 'CL',
  'America/Lima': 'PE',
  // Asie
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Kolkata': 'IN',
  'Asia/Shanghai': 'CN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  // Océanie
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Pacific/Auckland': 'NZ',
};

// ============================================
// 4. HOOK PRINCIPAL
// ============================================

export const useCountryDetection = (options: UseCountryDetectionOptions = {}) => {
  const {
    enableTimezoneDetection = true,
    enableCache = true,
    cacheTTL = 7 * 24 * 60 * 60 * 1000, // 7 jours
    fallbackCountry = 'FR',
    onDetected,
    onError,
  } = options;

  // ============================================
  // 4.1 ÉTATS
  // ============================================

  const [countryCode, setCountryCode] = useState<string>('+33');
  const [country, setCountry] = useState<string>(fallbackCountry);
  const [countryInfo, setCountryInfo] = useState<CountryInfo>(COUNTRIES[fallbackCountry] || COUNTRIES['FR']);
  const [isLoading, setIsLoading] = useState(true);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [availableCountries, setAvailableCountries] = useState<CountryInfo[]>(Object.values(COUNTRIES));

  const isMounted = useRef(true);

  // ============================================
  // 4.2 MÉTHODES DE DÉTECTION
  // ============================================

  const detectFromLanguage = useCallback((): boolean => {
    try {
      const lang = navigator.language || navigator.languages?.[0] || '';
      
      // Trier par spécificité (ex: 'en-US' avant 'en')
      const sortedKeys = Object.keys(LANGUAGE_TO_COUNTRY).sort((a, b) => b.length - a.length);
      
      for (const key of sortedKeys) {
        if (lang.includes(key)) {
          const countryId = LANGUAGE_TO_COUNTRY[key];
          const info = COUNTRIES[countryId];
          if (info) {
            setCountryCode(info.dialCode);
            setCountry(info.code);
            setCountryInfo(info);
            setDetectionResult({
              method: 'language',
              timestamp: Date.now(),
              confidence: 'high',
            });
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const detectFromTimezone = useCallback((): boolean => {
    if (!enableTimezoneDetection) return false;

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Trier par longueur pour trouver la correspondance la plus précise
      const sortedKeys = Object.keys(TIMEZONE_TO_COUNTRY).sort((a, b) => b.length - a.length);
      
      for (const key of sortedKeys) {
        if (timezone === key) {
          const countryId = TIMEZONE_TO_COUNTRY[key];
          const info = COUNTRIES[countryId];
          if (info) {
            setCountryCode(info.dialCode);
            setCountry(info.code);
            setCountryInfo(info);
            setDetectionResult({
              method: 'timezone',
              timestamp: Date.now(),
              confidence: 'medium',
            });
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [enableTimezoneDetection]);

  // ============================================
  // 4.3 CACHE
  // ============================================

  const loadFromCache = useCallback((): boolean => {
    if (!enableCache) return false;

    try {
      localStorage.removeItem('bavel_country_info');
      localStorage.removeItem('bavel_country_timestamp');
      const cached = localStorage.getItem(COUNTRY_INFO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const timestamp = localStorage.getItem(COUNTRY_TIMESTAMP_CACHE_KEY);
        
        if (timestamp && Date.now() - Number(timestamp) < cacheTTL) {
          if (COUNTRIES[parsed.code]) {
            setCountryCode(parsed.dialCode || '+33');
            setCountry(parsed.code || fallbackCountry);
            setCountryInfo(COUNTRIES[parsed.code]);
            setDetectionResult({
              method: 'cache',
              timestamp: Number(timestamp),
              confidence: 'medium',
            });
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [enableCache, cacheTTL, fallbackCountry]);

  const saveToCache = useCallback((info: CountryInfo) => {
    if (!enableCache) return;
    try {
      localStorage.setItem(COUNTRY_INFO_CACHE_KEY, JSON.stringify(info));
      localStorage.setItem(COUNTRY_TIMESTAMP_CACHE_KEY, String(Date.now()));
    } catch {}
  }, [enableCache]);

  // ============================================
  // 4.4 DÉTECTION PRINCIPALE
  // ============================================

  const detect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Cache (rapide)
    if (loadFromCache()) {
      setIsLoading(false);
      return;
    }

    // 2. Langue (rapide)
    if (detectFromLanguage()) {
      setIsLoading(false);
      saveToCache(countryInfo);
      onDetected?.(countryInfo);
      return;
    }

    // 3. Timezone (fallback)
    if (detectFromTimezone()) {
      setIsLoading(false);
      saveToCache(countryInfo);
      onDetected?.(countryInfo);
      return;
    }

    // 4. Fallback final
    const fallbackInfo = COUNTRIES[fallbackCountry] || COUNTRIES['FR'];
    setCountryCode(fallbackInfo.dialCode);
    setCountry(fallbackInfo.code);
    setCountryInfo(fallbackInfo);
    setDetectionResult({
      method: 'fallback',
      timestamp: Date.now(),
      confidence: 'low',
    });
    setIsLoading(false);
    onDetected?.(fallbackInfo);
  }, [loadFromCache, detectFromLanguage, detectFromTimezone, saveToCache, onDetected, fallbackCountry, countryInfo]);

  // ============================================
  // 4.5 EFFET INITIAL
  // ============================================

  useEffect(() => {
    isMounted.current = true;
    detect();

    return () => {
      isMounted.current = false;
    };
  }, [detect]);

  // ============================================
  // 4.6 SAUVEGARDE AUTOMATIQUE
  // ============================================

  useEffect(() => {
    if (!isLoading && countryInfo && detectionResult?.method !== 'fallback') {
      saveToCache(countryInfo);
    }
  }, [countryInfo, isLoading, detectionResult, saveToCache]);

  // ============================================
  // 4.7 UTILITAIRES
  // ============================================

  const getCountryByCode = useCallback((code: string): CountryInfo | null => {
    return COUNTRIES[code] || null;
  }, []);

  const getCountryByDialCode = useCallback((dialCode: string): CountryInfo | null => {
    const entry = Object.entries(COUNTRIES).find(([_, info]) => info.dialCode === dialCode);
    return entry ? entry[1] : null;
  }, []);

  const getCountriesByContinent = useCallback((continent: string): CountryInfo[] => {
    return Object.values(COUNTRIES).filter(c => c.continent === continent);
  }, []);

  const getCountriesByRegion = useCallback((region: string): CountryInfo[] => {
    return Object.values(COUNTRIES).filter(c => c.region === region);
  }, []);

  const getCountriesByLanguage = useCallback((language: string): CountryInfo[] => {
    return Object.values(COUNTRIES).filter(c => c.languages?.includes(language));
  }, []);

  const refresh = useCallback(() => {
    // Invalider le cache
    try {
      localStorage.removeItem(COUNTRY_INFO_CACHE_KEY);
      localStorage.removeItem(COUNTRY_TIMESTAMP_CACHE_KEY);
      localStorage.removeItem('bavel_country_info');
      localStorage.removeItem('bavel_country_timestamp');
    } catch {}
    return detect();
  }, [detect]);

  // ============================================
  // 4.8 FORMATAGE
  // ============================================

  const formatPhoneNumber = useCallback((number: string): string => {
    const clean = number.replace(/\D/g, '');
    const dialCode = countryInfo.dialCode.replace('+', '');
    
    if (clean.startsWith(dialCode)) {
      return countryInfo.dialCode + clean.slice(dialCode.length);
    }
    return countryInfo.dialCode + clean;
  }, [countryInfo]);

  const getFlag = useCallback((code: string): string => {
    return COUNTRIES[code]?.flag || '🏳️';
  }, []);

  // ============================================
  // 4.9 RETOUR
  // ============================================

  return {
    // États
    countryCode,
    country,
    countryInfo,
    isLoading,
    detectionResult,
    error,
    availableCountries,

    // Actions
    setCountry: (code: string) => {
      const info = COUNTRIES[code];
      if (info) {
        setCountry(code);
        setCountryCode(info.dialCode);
        setCountryInfo(info);
        setDetectionResult({
          method: 'manual',
          timestamp: Date.now(),
          confidence: 'high',
        });
        saveToCache(info);
      }
    },
    setCountryByDialCode: (dialCode: string) => {
      const info = getCountryByDialCode(dialCode);
      if (info) {
        setCountry(info.code);
        setCountryCode(info.dialCode);
        setCountryInfo(info);
        setDetectionResult({
          method: 'manual',
          timestamp: Date.now(),
          confidence: 'high',
        });
        saveToCache(info);
      }
    },
    refresh,
    detect,

    // Recherche
    getCountryByCode,
    getCountryByDialCode,
    getCountriesByContinent,
    getCountriesByRegion,
    getCountriesByLanguage,

    // Formatage
    formatPhoneNumber,
    getFlag,

    // Constantes
    COUNTRIES,
    LANGUAGE_TO_COUNTRY,
    TIMEZONE_TO_COUNTRY,
  };
};

// ============================================
// 5. EXPORT PAR DÉFAUT
// ============================================

export default useCountryDetection;