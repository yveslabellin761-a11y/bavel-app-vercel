const fs = require('fs');
let code = fs.readFileSync('src/components/MobileApp.tsx', 'utf-8');

const regex = /\/\/ Periodic automatic message arrival simulation\n\s*useEffect\(\(\) => \{\n\s*const timer = setInterval\(\(\) => \{[\s\S]*?return \(\) => clearInterval\(timer\);\n\s*\}, \[\]\);/s;

code = code.replace(regex, '');

fs.writeFileSync('src/components/MobileApp.tsx', code);
console.log("Patched MobileApp.tsx simulation successfully.");
