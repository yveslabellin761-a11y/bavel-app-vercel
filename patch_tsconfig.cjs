const fs = require('fs');
let code = fs.readFileSync('tsconfig.json', 'utf-8');

if (!code.includes('"dist"')) {
    code = code.replace('"exclude": [', '"exclude": ["dist", ');
    fs.writeFileSync('tsconfig.json', code);
    console.log("Patched tsconfig.json");
} else {
    console.log("dist already in exclude");
}
