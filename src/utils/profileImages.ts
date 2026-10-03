import { Profile } from '../types';

// Curated pool of high-quality Unsplash lifestyle images
const FEMALE_LIFESTYLE_IMAGES = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80', // stylish look
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80', // happy smiling
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80', // modeling fashion
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', // portrait outdoor
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&auto=format&fit=crop&q=80', // stylish hair
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80', // elegant look
];

const MALE_LIFESTYLE_IMAGES = [
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80', // classy portrait
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80', // handsome smart
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80', // street style
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', // smiling classy
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80', // athletic fitness
  'https://images.unsplash.com/photo-1489980508314-941910ded1f4?w=500&auto=format&fit=crop&q=80', // elegant suit
];

// Aesthetic neutral lifestyle backgrounds (Assinie, beach, luxury coffee, etc.)
const LIFESTYLE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80', // beautiful sandy beach (Assinie vibes)
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=500&auto=format&fit=crop&q=80', // palms & sea
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80', // chic cafe (brunch)
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop&q=80', // sunset travel
  'https://images.unsplash.com/photo-1473116763269-25544724652c?w=500&auto=format&fit=crop&q=80', // boat on ocean
];

/**
 * Returns a stable list of 3-4 photos for a given Profile.
 * Uses the profile's ID to deterministically select matching lifestyle photos.
 */
export function getProfileImages(profile: Profile): string[] {
  if (profile.photos && profile.photos.length > 0) {
    // If user has custom photos, ensure the avatarUrl is the first one or at least included
    const customImages = [...profile.photos];
    if (profile.avatarUrl && !customImages.includes(profile.avatarUrl)) {
      customImages.unshift(profile.avatarUrl);
    }
    return customImages;
  }

  const images = [profile.avatarUrl];
  
  // Deterministic seed based on profile ID string value
  const seed = profile.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const pool = profile.gender === 'female' ? FEMALE_LIFESTYLE_IMAGES : MALE_LIFESTYLE_IMAGES;
  
  // Pick 2 portraits from the curated pool deterministically
  const firstIndex = seed % pool.length;
  const secondIndex = (seed + 2) % pool.length;
  
  images.push(pool[firstIndex]);
  images.push(pool[secondIndex]);
  
  // Pick 1 ambient beach/cafe background matching their lifestyle
  const backgroundIndex = (seed + 5) % LIFESTYLE_BACKGROUNDS.length;
  images.push(LIFESTYLE_BACKGROUNDS[backgroundIndex]);
  
  return images;
}
