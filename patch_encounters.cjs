const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/swipes/EncountersTab.tsx', 'utf-8');

const oldProps = `export function EncountersTab({ 
  onNavigateToTab,
  genderPreference,
  setGenderPreference,
  likedProfiles,
  setLikedProfiles,
  setActiveChat,
  discussions,
  setDiscussions,
  userLookingFor,
  isPremium,
  onActivatePremium,
  profiles = [],
  userProfile,
  loadSupabaseData
}: { 
  onNavigateToTab?: (tab: string) => void;
  genderPreference?: 'homme' | 'femme' | 'les_deux';
  setGenderPreference?: (pref: 'homme' | 'femme' | 'les_deux') => void;
  likedProfiles?: number[];
  setLikedProfiles?: React.Dispatch<React.SetStateAction<number[]>> | ((ids: number[]) => void);
  setActiveChat?: (profile: any) => void;
  discussions?: any[];
  setDiscussions?: React.Dispatch<React.SetStateAction<any[]>>;
  userLookingFor?: 'male' | 'female' | 'both';
  isPremium?: boolean;
  onActivatePremium?: () => void;
  profiles?: any[];
  userProfile?: any;
  loadSupabaseData?: () => void;
}) {`;

const newProps = `export function EncountersTab({ 
  onNavigateToTab,
  genderPreference,
  setGenderPreference,
  likedProfiles,
  setLikedProfiles,
  onLikeProfile,
  setActiveChat,
  discussions,
  setDiscussions,
  userLookingFor,
  isPremium,
  onActivatePremium,
  profiles = [],
  userProfile,
  loadSupabaseData
}: { 
  onNavigateToTab?: (tab: string) => void;
  genderPreference?: 'homme' | 'femme' | 'les_deux';
  setGenderPreference?: (pref: 'homme' | 'femme' | 'les_deux') => void;
  likedProfiles?: number[];
  setLikedProfiles?: React.Dispatch<React.SetStateAction<number[]>> | ((ids: number[]) => void);
  onLikeProfile?: (id: string | number) => void;
  setActiveChat?: (profile: any) => void;
  discussions?: any[];
  setDiscussions?: React.Dispatch<React.SetStateAction<any[]>>;
  userLookingFor?: 'male' | 'female' | 'both';
  isPremium?: boolean;
  onActivatePremium?: () => void;
  profiles?: any[];
  userProfile?: any;
  loadSupabaseData?: () => void;
}) {`;

code = code.replace(oldProps, newProps);

// Also inject onLikeProfile when calling EncountersProfiles
const oldEnc = `<EncountersProfiles 
          userLookingFor={userLookingFor} 
          isPremium={isPremium}
          onActivatePremium={onActivatePremium}
          profiles={filteredProfiles}
          userProfile={userProfile}
          loadSupabaseData={loadSupabaseData}
        />`;

const newEnc = `<EncountersProfiles 
          userLookingFor={userLookingFor} 
          isPremium={isPremium}
          onActivatePremium={onActivatePremium}
          profiles={filteredProfiles}
          userProfile={userProfile}
          loadSupabaseData={loadSupabaseData}
          onLikeProfile={onLikeProfile}
        />`;

code = code.replace(oldEnc, newEnc);

fs.writeFileSync('src/components/mobile/swipes/EncountersTab.tsx', code);
console.log("Patched EncountersTab.tsx");
