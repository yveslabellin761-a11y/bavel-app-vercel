const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/DiscoverTab.tsx', 'utf-8');

const oldModalLike = `onLike={() => setLikedProfiles(prev => [...prev, selectedProfile.id])}`;
const newModalLike = `onLike={() => {
            if (onLikeProfile) onLikeProfile(selectedProfile.id);
            else setLikedProfiles(prev => [...prev, selectedProfile.id]);
          }}`;

code = code.replace(oldModalLike, newModalLike);

const oldCardLike = `onClick={(e) => { e.stopPropagation(); setLikedProfiles(prev => [...prev, p.id]); }}`;
const newCardLike = `onClick={(e) => { 
                        e.stopPropagation(); 
                        if (onLikeProfile) onLikeProfile(p.id);
                        else setLikedProfiles(prev => [...prev, p.id]); 
                      }}`;

code = code.replace(oldCardLike, newCardLike);

fs.writeFileSync('src/components/mobile/DiscoverTab.tsx', code);
console.log("Patched likes in DiscoverTab.tsx");
