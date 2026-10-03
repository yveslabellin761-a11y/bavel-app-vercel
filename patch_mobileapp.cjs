const fs = require('fs');
let code = fs.readFileSync('src/components/MobileApp.tsx', 'utf-8');

const oldLike = `  const handleLikeProfile = (profileId: string | number) => {
    const savedUser = localStorage.getItem('app_user') ? JSON.parse(localStorage.getItem('app_user')!) : null;
    const currentUserId = savedUser?.id || 'current_user_id';
    
    setLikedProfileIds((prev: number[]) => {
      if (!prev.includes(profileId as number)) {
        return [...prev, profileId as number];
      }
      return prev;
    });

    (async () => {
      try {
        await saveLikeToSupabase(currentUserId, String(profileId));
        loadSupabaseData(); // Fetch potential matches or updates
      } catch (e) {
        console.warn("Failed to save like", e);
      }
    })();
  };`;

const newLike = `  const handleLikeProfile = async (profileId: string | number) => {
    const savedUser = localStorage.getItem('app_user') ? JSON.parse(localStorage.getItem('app_user')!) : null;
    const currentUserId = savedUser?.id || 'current_user_id';
    
    setLikedProfileIds((prev: number[]) => {
      if (!prev.includes(profileId as number)) {
        return [...prev, profileId as number];
      }
      return prev;
    });

    try {
      const result = await saveLikeToSupabase(currentUserId, String(profileId));
      loadSupabaseData(); // Fetch potential matches or updates
      return result?.isMatch;
    } catch (e) {
      console.warn("Failed to save like", e);
      return false;
    }
  };`;

code = code.replace(oldLike, newLike);
fs.writeFileSync('src/components/MobileApp.tsx', code);
console.log("Patched MobileApp.tsx successfully.");
