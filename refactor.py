import re

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'r') as f:
    content = f.read()

# Add new motion hooks
content = content.replace(
    "const [currentIndex, setCurrentIndex] = useState(0);",
    """const [currentIndex, setCurrentIndex] = useState(0);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const nextScale = useTransform(x, [-200, 0, 200], [1, 0.95, 1]);
  const nextOpacity = useTransform(x, [-200, 0, 200], [1, 0.7, 1]);
  const likeOpacity = useTransform(x, [30, 100], [0, 1]);
  const passOpacity = useTransform(x, [-30, -100], [0, 1]);
"""
)

# Replace handleLikeClick
old_handleLikeClick = """  const handleLikeClick = (force = false) => {
    if (isPageTurning || exitDirection !== null) return;
    if (!isPremium && likesCount <= 0 && !force) {
      setNoLikesFlowStep('out_of_likes');
      return;
    }
    setExitDirection('right');
    setTimeout(() => {
      handleLikeDirect(false);
      if (!isPremium) {
        setLikesCount(prev => Math.max(0, prev - 1));
      }
      setExitDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }, 380);
  };"""

new_handleLikeClick = """  const handleLikeClick = (force = false) => {
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

content = content.replace(old_handleLikeClick, new_handleLikeClick)

# Replace handlePassClick
old_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning || exitDirection !== null) return;
    setExitDirection('left');
    setTimeout(() => {
      handleNext(true);
      setExitDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }, 380);
  };"""

new_handlePassClick = """  const handlePassClick = () => {
    if (isPageTurning) return;
    x.set(-1); // Set negative so exit animation flies left
    setTimeout(() => {
      handleNext(true);
      x.set(0);
    }, 10);
  };"""

content = content.replace(old_handlePassClick, new_handlePassClick)

# Replace drag event handlers
old_drag_events = """  const handleStartDrag = (clientX: number, clientY: number) => {
    if (isPageTurning || exitDirection !== null) return;
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleMoveDrag = (clientX: number, clientY: number) => {
    if (isPageTurning || exitDirection !== null || !isDragging) return;
    setDragOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleEndDrag = () => {
    if (isPageTurning || exitDirection !== null || !isDragging) return;
    setIsDragging(false);
    
    if (dragOffset.x > 80) {
      // Swipe right -> like
      if (!isPremium && likesCount <= 0) {
        setNoLikesFlowStep('out_of_likes');
        setDragOffset({ x: 0, y: 0 });
        return;
      }
      setExitDirection('right');
      setTimeout(() => {
        handleLikeDirect(false);
        if (!isPremium) {
          setLikesCount(prev => Math.max(0, prev - 1));
        }
        setExitDirection(null);
        setDragOffset({ x: 0, y: 0 });
      }, 380);
    } else if (dragOffset.x < -80) {
      // Swipe left -> pass
      setExitDirection('left');
      setTimeout(() => {
        handleNext(true);
        setExitDirection(null);
        setDragOffset({ x: 0, y: 0 });
      }, 380);
    } else {
      // Snap back if didn't swipe far enough
      setDragOffset({ x: 0, y: 0 });
    }
  };"""

new_drag_events = """  const handleDragEnd = (event: any, info: any) => {
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

content = content.replace(old_drag_events, new_drag_events)

# Replace nextProfile styling (lines around 630-644)
old_next_profile_div_start = """              <div 
                className="absolute inset-0 rounded-[20px] overflow-hidden bg-white shadow-sm border border-gray-100 flex flex-col pointer-events-none"
                style={{
                  transform: isPageTurning || exitDirection !== null
                    ? 'scale(1)'
                    : `scale(${0.95 + Math.min(Math.abs(dragOffset.x) / 300, 0.05)})`,
                  opacity: isPageTurning || exitDirection !== null
                    ? 1
                    : (0.7 + Math.min(Math.abs(dragOffset.x) / 300, 0.3)),
                  transition: exitDirection !== null
                    ? 'transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.38s ease'
                    : 'transform 0.2s ease-out, opacity 0.2s ease-out',
                  zIndex: 0
                }}
              >"""

new_next_profile_div_start = """              <motion.div 
                className="absolute inset-0 rounded-[20px] overflow-hidden bg-white shadow-sm border border-gray-100 flex flex-col pointer-events-none"
                style={{
                  scale: isPageTurning ? 1 : nextScale,
                  opacity: isPageTurning ? 1 : nextOpacity,
                  zIndex: 0
                }}
              >"""

content = content.replace(old_next_profile_div_start, new_next_profile_div_start)
content = content.replace("                </div>\n              </div>\n            )}", "                </div>\n              </motion.div>\n            )}")

# Find currentProfile div rendering and replace with motion.div AnimatePresence mode="popLayout"
# We'll use a regex to replace everything from {currentProfile && ( to its closing )} around line 768.

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'w') as f:
    f.write(content)

