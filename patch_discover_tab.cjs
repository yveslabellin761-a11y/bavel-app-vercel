const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/DiscoverTab.tsx', 'utf-8');

code = code.replace(/onLikeProfile\?: \(id: string \| number\) => void;/g, "onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;");
code = code.replace(/onLikeProfile\?: \(id: string \| number\) => Promise<boolean \| undefined>;\n\s*onLikeProfile\?: \(id: string \| number\) => Promise<boolean \| undefined>;/, "onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;"); // Dedup if needed

fs.writeFileSync('src/components/mobile/DiscoverTab.tsx', code);
console.log("Patched DiscoverTab.tsx");
