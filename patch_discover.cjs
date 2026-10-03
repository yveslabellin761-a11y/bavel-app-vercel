const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/DiscoverTab.tsx', 'utf-8');

code = code.replace(/const \[likedIds, setLikedIds\] = useState<number\[\]>\(\[\]\);/g, '');
code = code.replace(/likedIds/g, '(likedProfiles || [])');

const oldHandleLike = `  const handleLike = (profile: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(likedProfiles || []).includes(profile.id)) {
      setLikedIds(prev => [...prev, profile.id]);
      showToast(\`❤️ Vous avez liké \${profile.name} !\`);
    }
  };`;

const newHandleLike = `  const handleLike = (profile: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(likedProfiles || []).includes(profile.id)) {
      if (onLikeProfile) {
        onLikeProfile(profile.id);
      }
      showToast(\`❤️ Vous avez liké \${profile.name} !\`);
    }
  };`;

if (code.includes(oldHandleLike)) {
    code = code.replace(oldHandleLike, newHandleLike);
}

const oldNearbyLike = `          onLike={() => {
            if (!(likedProfiles || []).includes(selectedNearbyProfile.id)) {
              setLikedIds(prev => [...prev, selectedNearbyProfile.id]);
              showToast(\`❤️ Liké !\`);
            }
          }}`;

const newNearbyLike = `          onLike={() => {
            if (!(likedProfiles || []).includes(selectedNearbyProfile.id)) {
              if (onLikeProfile) {
                onLikeProfile(selectedNearbyProfile.id);
              }
              showToast(\`❤️ Liké !\`);
            }
          }}`;

if (code.includes(oldNearbyLike)) {
    code = code.replace(oldNearbyLike, newNearbyLike);
}

const oldSourceProfiles = `  const sourceProfiles = NEARBY_MEMBERS;`;
const newSourceProfiles = `  const sourceProfiles = profiles && profiles.length > 0 ? profiles : NEARBY_MEMBERS;`;

if (code.includes(oldSourceProfiles)) {
    code = code.replace(oldSourceProfiles, newSourceProfiles);
}

fs.writeFileSync('src/components/mobile/DiscoverTab.tsx', code);
console.log("Patched DiscoverTab.tsx successfully.");
