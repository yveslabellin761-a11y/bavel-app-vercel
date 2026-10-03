const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/swipes/EncountersProfiles.tsx', 'utf-8');

const oldProps = `  onLikeProfile?: (id: string | number) => void;`;
const newProps = `  onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;`;

code = code.replace(oldProps, newProps);
code = code.replace(`onLikeProfile?: (id: string | number) => void;`, `onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;`);

const oldLikeDirect = `  const handleLikeDirect = async () => {
    if (currentProfile) {
      if (!likedProfiles.includes(currentProfile.id)) {
        setLikedProfiles([...likedProfiles, currentProfile.id]);
      }
      await saveLikeToSupabase(userProfile?.id || 'current_user_id', String(currentProfile.id));
      loadSupabaseData();
    }
    handleNext();
  };`;

const newLikeDirect = `  const handleLikeDirect = async () => {
    let isMatch = false;
    if (currentProfile) {
      if (onLikeProfile) {
        isMatch = await onLikeProfile(currentProfile.id) || false;
      } else {
        if (!likedProfiles.includes(currentProfile.id)) {
          setLikedProfiles([...likedProfiles, currentProfile.id]);
        }
        const res = await saveLikeToSupabase(userProfile?.id || 'current_user_id', String(currentProfile.id));
        isMatch = res?.isMatch || false;
      }
      loadSupabaseData();
    }
    
    if (isMatch) {
      setShowMatchModal(true);
    } else {
      handleNext();
    }
  };`;

code = code.replace(oldLikeDirect, newLikeDirect);

const oldLikeClick = `  const handleLikeClick = (force = false) => {
    if (isPageTurning) return;
    if (!isPremium && likesCount <= 0 && !force) {
      setNoLikesFlowStep('out_of_likes');
      return;
    }
    setIsPageTurning(true);
    const id = profiles[currentIndex]?.id;
    if (onLikeProfile && id) {
      onLikeProfile(id);
    }
    cardRef.current?.swipe('right').finally(() => {
      setIsPageTurning(false);
    });
  };`;

const newLikeClick = `  const handleLikeClick = async (force = false) => {
    if (isPageTurning) return;
    if (!isPremium && likesCount <= 0 && !force) {
      setNoLikesFlowStep('out_of_likes');
      return;
    }
    setIsPageTurning(true);
    const id = profiles[currentIndex]?.id;
    let isMatch = false;
    if (onLikeProfile && id) {
      isMatch = await onLikeProfile(id) || false;
    }
    cardRef.current?.swipe('right').finally(() => {
      setIsPageTurning(false);
      if (isMatch) {
        setShowMatchModal(true);
      }
    });
  };`;

code = code.replace(oldLikeClick, newLikeClick);

const oldCoupDeCoeur = `  const handleSendCoupDeCoeur = () => {
    setShowCoupDeCoeurModal(false);
    
    if (currentProfile) {
      if (onLikeProfile) {
        onLikeProfile(currentProfile.id);
      } else {
        if (!likedProfiles.includes(currentProfile.id)) {
          setLikedProfiles([...likedProfiles, currentProfile.id]);
        }
      }
      
      showToast(\`✨ Coup de Cœur envoyé à \${currentProfile.name} !\`);
      
      // Advance to next profile without falsely showing a match modal
      setTimeout(() => {
        handleNext();
      }, 400);
    }
  };`;

const newCoupDeCoeur = `  const handleSendCoupDeCoeur = async () => {
    setShowCoupDeCoeurModal(false);
    
    if (currentProfile) {
      let isMatch = false;
      if (onLikeProfile) {
        isMatch = await onLikeProfile(currentProfile.id) || false;
      } else {
        if (!likedProfiles.includes(currentProfile.id)) {
          setLikedProfiles([...likedProfiles, currentProfile.id]);
        }
        const res = await saveLikeToSupabase(userProfile?.id || 'current_user_id', String(currentProfile.id), true);
        isMatch = res?.isMatch || false;
      }
      
      showToast(\`✨ Coup de Cœur envoyé à \${currentProfile.name} !\`);
      
      setTimeout(() => {
        if (isMatch) {
          setShowMatchModal(true);
        } else {
          handleNext();
        }
      }, 400);
    }
  };`;

code = code.replace(oldCoupDeCoeur, newCoupDeCoeur);

fs.writeFileSync('src/components/mobile/swipes/EncountersProfiles.tsx', code);
console.log("Patched EncountersProfiles.tsx successfully.");
