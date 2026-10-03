import re

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'r') as f:
    content = f.read()

# Restore popLayout and use the user's manual animation logic
old_current_profile = """            <AnimatePresence custom={exitDirection}>
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

new_current_profile = """            <AnimatePresence mode="popLayout">
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

if old_current_profile in content:
    content = content.replace(old_current_profile, new_current_profile)


old_handleLikeClick = """  const handleLikeClick = (force = false) => {
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

new_handleLikeClick = """  const triggerSwipe = (direction: 'left' | 'right') => {
    setIsPageTurning(true);
    // Force the x value slightly so that when unmounted, x.get() has the correct sign for exit animation
    x.set(direction === 'left' ? -10 : 10);
    
    setTimeout(() => {
      if (direction === 'left') {
        handleNext(true);
      } else {
        handleLikeDirect(false);
        if (!isPremium) {
          setLikesCount(prev => Math.max(0, prev - 1));
        }
      }
      setIsPageTurning(false);
      // Let the useEffect handle resetting x to 0 when index changes
    }, 150); // small delay to let the animation start visually
  };

  const handleLikeClick = (force = false) => {
    if (isPageTurning) return;
    if (!isPremium && likesCount <= 0 && !force) {
      setNoLikesFlowStep('out_of_likes');
      return;
    }
    triggerSwipe('right');
  };"""

content = content.replace(old_handleLikeClick, new_handleLikeClick)

old_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning) return;
    
    setExitDirection('left');
    setIsPageTurning(true);
    
    setTimeout(() => {
      handleNext(true);
      setIsPageTurning(false);
      setExitDirection(null);
    }, 50);
  };"""

new_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning) return;
    triggerSwipe('left');
  };"""

content = content.replace(old_handlePassClick, new_handlePassClick)

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'w') as f:
    f.write(content)
print("Updated successfully")
