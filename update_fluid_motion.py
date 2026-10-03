import re

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'r') as f:
    content = f.read()

# Replace the use of AnimatePresence and currentProfile rendering
old_current_profile = """            <AnimatePresence mode="popLayout">
              {currentProfile && (
                <motion.div
                  key={currentProfile.id}
                  style={{ x, rotate, zIndex: 10, transformOrigin: '50% 100%' }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{
                    x: x.get() < 0 ? -400 : 400,
                    opacity: 0,
                    rotate: x.get() < 0 ? -20 : 20,
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }}
                  className="absolute inset-0 rounded-[20px] overflow-hidden bg-white shadow-sm border border-gray-100 flex flex-col cursor-grab active:cursor-grabbing select-none touch-pan-y"
                >"""

new_current_profile = """            <AnimatePresence custom={exitDirection}>
              {currentProfile && (
                <motion.div
                  key={currentProfile.id}
                  custom={exitDirection}
                  style={{ x, rotate, zIndex: 10, transformOrigin: '50% 100%' }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={(direction) => ({
                    x: direction === 'right' ? 400 : direction === 'left' ? -400 : (x.get() < 0 ? -400 : 400),
                    opacity: 0,
                    rotate: direction === 'right' ? 20 : direction === 'left' ? -20 : (x.get() < 0 ? -20 : 20),
                    transition: { duration: 0.3, ease: "easeOut" }
                  })}
                  className="absolute inset-0 rounded-[20px] overflow-hidden bg-white shadow-sm border border-gray-100 flex flex-col cursor-grab active:cursor-grabbing select-none touch-pan-y"
                >"""

if old_current_profile in content:
    content = content.replace(old_current_profile, new_current_profile)
else:
    print("Could not find old_current_profile")

# Update handleLikeClick
old_handleLikeClick = """  const handleLikeClick = (force = false) => {
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

new_handleLikeClick = """  const handleLikeClick = (force = false) => {
    if (isPageTurning) return;
    if (!isPremium && likesCount <= 0 && !force) {
      setNoLikesFlowStep('out_of_likes');
      return;
    }
    
    setExitDirection('right');
    setIsPageTurning(true);
    
    setTimeout(() => {
      handleLikeDirect(false);
      if (!isPremium) {
        setLikesCount(prev => Math.max(0, prev - 1));
      }
      setIsPageTurning(false);
      setExitDirection(null);
    }, 50); // slight delay to ensure exit custom prop is registered before unmount
  };"""

content = content.replace(old_handleLikeClick, new_handleLikeClick)

# Update handlePassClick
old_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning) return;
    x.set(-1);
    setTimeout(() => {
      handleNext(true);
    }, 10);
  };"""

new_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning) return;
    
    setExitDirection('left');
    setIsPageTurning(true);
    
    setTimeout(() => {
      handleNext(true);
      setIsPageTurning(false);
      setExitDirection(null);
    }, 50);
  };"""

content = content.replace(old_handlePassClick, new_handlePassClick)

# Update handleDragEnd
old_handleDragEnd = """  const handleDragEnd = (event: any, info: any) => {
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

new_handleDragEnd = """  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    if (offset > 100 || velocity > 500) {
      // Swipe right -> like
      if (!isPremium && likesCount <= 0) {
        setNoLikesFlowStep('out_of_likes');
      } else {
        setExitDirection('right');
        setTimeout(() => {
          handleLikeDirect(false);
          if (!isPremium) {
            setLikesCount(prev => Math.max(0, prev - 1));
          }
          setExitDirection(null);
        }, 10);
      }
    } else if (offset < -100 || velocity < -500) {
      // Swipe left -> pass
      setExitDirection('left');
      setTimeout(() => {
        handleNext(true);
        setExitDirection(null);
      }, 10);
    }
  };"""

content = content.replace(old_handleDragEnd, new_handleDragEnd)


with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'w') as f:
    f.write(content)
print("Finished updates.")
