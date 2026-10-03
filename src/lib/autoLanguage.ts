export interface DetectedGeoInfo {
  language: string;
  langCode: string;
  country: string;
  countryCode: string;
  city: string;
}

export async function detectUserGeoAndLanguage(): Promise<DetectedGeoInfo> {
  const navLang = typeof navigator !== 'undefined' ? (navigator.language || (navigator.languages && navigator.languages[0]) || 'fr') : 'fr';
  const shortLang = navLang.split(/[-_]/)[0].substring(0, 2).toLowerCase();
  let localeCountryCode = '';
  try {
    localeCountryCode = new Intl.Locale(navLang).region || '';
  } catch {
    // Keep country unset for an invalid or unsupported locale.
  }

  let defaultLang = 'Français';
  if (shortLang === 'en') defaultLang = 'English';
  else if (shortLang === 'es') defaultLang = 'Español';
  else if (shortLang === 'de') defaultLang = 'Deutsch';
  else if (shortLang === 'it') defaultLang = 'Italiano';
  else if (shortLang === 'pt') defaultLang = 'Português';

  const countryName = localeCountryCode && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([shortLang], { type: 'region' }).of(localeCountryCode)
    : undefined;
  const result: DetectedGeoInfo = {
    language: defaultLang,
    langCode: shortLang,
    country: countryName || '',
    countryCode: localeCountryCode,
    city: ''
  };

  try {
    localStorage.setItem('bavel_user_language', result.language);
    localStorage.setItem('bavel_user_country', result.country);
    localStorage.setItem('bavel_user_city', result.city);
    localStorage.removeItem('bavel_user_ip');
  } catch (error) {
    console.warn('Could not persist locale preferences:', error);
  }

  return result;
}

export function getStoredLanguage(): string {
  try {
    const saved = localStorage.getItem('bavel_user_language');
    if (saved) return saved;
  } catch {}
  
  const navLang = typeof navigator !== 'undefined' ? (navigator.language || 'fr') : 'fr';
  if (navLang.startsWith('en')) return 'English';
  if (navLang.startsWith('es')) return 'Español';
  if (navLang.startsWith('de')) return 'Deutsch';
  if (navLang.startsWith('it')) return 'Italiano';
  return 'Français';
}
