const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const oldSaveLike = `    if (reverseLike && reverseLike.length > 0) {
      // Create a match
      await createMatchInSupabase(userId, targetId);
    }

    return data;`;

const newSaveLike = `    let isMatch = false;
    if (reverseLike && reverseLike.length > 0) {
      // Create a match
      await createMatchInSupabase(userId, targetId);
      isMatch = true;
    }

    return { data, isMatch };`;

code = code.replace(/if \(reverseLike && reverseLike\.length > 0\) \{\n\s*\/\/ Create a match\n\s*await createMatchInSupabase\(userId, targetId\);\n\s*\}\n\n\s*return data;/s, newSaveLike);

fs.writeFileSync('src/lib/supabase.ts', code);
console.log("Patched supabase.ts successfully.");
