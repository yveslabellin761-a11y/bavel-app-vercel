const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/swipes/EncountersProfiles.tsx', 'utf-8');

code = code.replace(/activeProfiles\[currentIndex\]\?\.id/g, 'profiles[currentIndex]?.id');

fs.writeFileSync('src/components/mobile/swipes/EncountersProfiles.tsx', code);
console.log("Fixed EncountersProfiles.tsx");
