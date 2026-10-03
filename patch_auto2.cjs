const fs = require('fs');
let code = fs.readFileSync('src/components/MobileApp.tsx', 'utf-8');

const regex2 = /\/\/ Periodic automatic likes simulation\n\s*useEffect\(\(\) => \{\n\s*const timer = setInterval\(\(\) => \{[\s\S]*?return \(\) => clearInterval\(timer\);\n\s*\}, \[\]\);/s;

code = code.replace(regex2, '');

fs.writeFileSync('src/components/MobileApp.tsx', code);
console.log("Patched MobileApp.tsx likes simulation successfully.");
