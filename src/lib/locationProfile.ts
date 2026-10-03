import { WORLD_LOCATIONS } from '../data/worldCities';

const COUNTRY_CODES: Record<string, string> = {
  "côte d'ivoire": 'CI', "cote d'ivoire": 'CI', france: 'FR', canada: 'CA',
  belgique: 'BE', suisse: 'CH', "états-unis": 'US', "etats-unis": 'US',
  "royaume-uni": 'GB', "united kingdom": 'GB', sénégal: 'SN', senegal: 'SN',
  cameroun: 'CM', mali: 'ML', togo: 'TG', bénin: 'BJ', benin: 'BJ',
  maroc: 'MA', tunisie: 'TN', algérie: 'DZ', algerie: 'DZ', allemagne: 'DE',
  espagne: 'ES', italie: 'IT', brésil: 'BR', bresil: 'BR', nigeria: 'NG',
  ghana: 'GH', "burkina faso": 'BF', guinée: 'GN', guinee: 'GN', gabon: 'GA',
  "rdc": 'CD', congo: 'CG', portugal: 'PT', australie: 'AU', inde: 'IN',
  japon: 'JP', chine: 'CN'
};

export function parseProfileLocation(location?: string, countryCode?: string) {
  const raw = String(location || '').trim();
  const parts = raw.split(',').map(part => part.trim()).filter(Boolean);
  const city = parts[0] || '';
  const country = parts[parts.length - 1] || '';
  const code = String(countryCode || COUNTRY_CODES[country.toLowerCase()] || '').toUpperCase();
  const known = WORLD_LOCATIONS.find(item => item.fullName.toLowerCase() === raw.toLowerCase());
  return {
    city: known?.name || city,
    country: known?.country || country,
    countryCode: /^[A-Z]{2}$/.test(code) ? code : undefined,
    location: raw
  };
}

export function countryCodeFromName(country?: string) {
  return COUNTRY_CODES[String(country || '').trim().toLowerCase()];
}
