const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/swipes/EncountersTab.tsx', 'utf-8');

code = code.replace(/onLikeProfile\?: \(id: string \| number\) => void;/g, "onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;");

fs.writeFileSync('src/components/mobile/swipes/EncountersTab.tsx', code);
console.log("Patched EncountersTab.tsx");
