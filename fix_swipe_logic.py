import re

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'r') as f:
    content = f.read()

# Replace handleLikeClick
old_handleLikeClick = """  const handleLikeClick = (force = false) => {
    if (isPageTurning) return;
    if (!isPremium && likesCount <= 0 && !force) {
      setNoLikesFlowStep('out_of_likes');
      return;
    }
    x.set(1); // Set positive so exit animation flies right
    setTimeout(() => {
      handleLikeDirect(false);
      if (!isPremium) {
        setLikesCount(prev => Math.max(0, prev - 1));
      }
      x.set(0);
    }, 10);
  };"""

new_handleLikeClick = """  const handleLikeClick = (force = false) => {
    if (isPageTurning) return;
    if (!isPremium && likesCount <= 0 && !force) {
      setNoLikesFlowStep('out_of_likes');
      return;
    }
    // We animate x off-screen manually if we want to see it fly, but since AnimatePresence handles exit,
    // we just need to set the exit direction marker in x (1 = right).
    x.set(1); 
    // Small timeout to allow React to process the x.set before unmounting
    setTimeout(() => {
      handleLikeDirect(false);
      if (!isPremium) {
        setLikesCount(prev => Math.max(0, prev - 1));
      }
    }, 10);
  };"""

content = content.replace(old_handleLikeClick, new_handleLikeClick)

# Replace handlePassClick
old_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning) return;
    x.set(-1); // Set negative so exit animation flies left
    setTimeout(() => {
      handleNext(true);
      x.set(0);
    }, 10);
  };"""

new_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning) return;
    x.set(-1);
    setTimeout(() => {
      handleNext(true);
    }, 10);
  };"""

content = content.replace(old_handlePassClick, new_handlePassClick)

# Replace handleDragEnd
old_handleDragEnd = """  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    if (offset > 100 || velocity > 500) {
      // Swipe right -> like
      if (!isPremium && likesCount <= 0) {
        setNoLikesFlowStep('out_of_likes');
        // It will snap back automatically as drag ends and we don't change index
      } else {
        x.set(1);
        setTimeout(() => {
          handleLikeDirect(false);
          if (!isPremium) {
            setLikesCount(prev => Math.max(0, prev - 1));
          }
          x.set(0);
        }, 10);
      }
    } else if (offset < -100 || velocity < -500) {
      // Swipe left -> pass
      x.set(-1);
      setTimeout(() => {
        handleNext(true);
        x.set(0);
      }, 10);
    }
  };"""

new_handleDragEnd = """  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    if (offset > 100 || velocity > 500) {
      // Swipe right -> like
      if (!isPremium && likesCount <= 0) {
        setNoLikesFlowStep('out_of_likes');
      } else {
        x.set(1);
        setTimeout(() => {
          handleLikeDirect(false);
          if (!isPremium) {
            setLikesCount(prev => Math.max(0, prev - 1));
          }
        }, 10);
      }
    } else if (offset < -100 || velocity < -500) {
      // Swipe left -> pass
      x.set(-1);
      setTimeout(() => {
        handleNext(true);
      }, 10);
    }
  };"""

content = content.replace(old_handleDragEnd, new_handleDragEnd)

# Add useEffect for x
use_effect_code = """  useEffect(() => {
    let interval: any;"""

new_use_effect_code = """  useEffect(() => {
    x.set(0); // Reset x when index changes to allow next card to center
  }, [currentIndex]);

  useEffect(() => {
    let interval: any;"""

content = content.replace(use_effect_code, new_use_effect_code)

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'w') as f:
    f.write(content)

