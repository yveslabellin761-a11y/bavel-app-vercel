import re

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'r') as f:
    content = f.read()

# Replace the currentProfile rendering
old_current_profile = """            {currentProfile && (
              <div 
                style={{
                  transformOrigin: '50% 100%',
                  transform: isPageTurning
                    ? 'rotateY(-140deg) scale(0.92) translateX(-40px) translateZ(50px)'
                    : exitDirection === 'right'
                    ? 'translateX(130vw) translateY(40px) rotate(22deg)'
                    : exitDirection === 'left'
                    ? 'translateX(-130vw) translateY(40px) rotate(-22deg)'
                    : `translate(${dragOffset.x}px, ${dragOffset.y * 0.25}px) rotate(${dragOffset.x * 0.08}deg)`,
                  transition: isPageTurning
                    ? 'transform 0.75s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.7s ease'
                    : exitDirection !== null
                    ? 'transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease'
                    : (isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.15)'),
                  opacity: isPageTurning || exitDirection !== null ? 0 : 1,
                  zIndex: 10,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                onTouchStart={(e) => handleStartDrag(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleMoveDrag(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleEndDrag}
                onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMoveDrag(e.clientX, e.clientY)}
                onMouseUp={handleEndDrag}
                onMouseLeave={handleEndDrag}
                className="absolute inset-0 rounded-[20px] overflow-hidden bg-white shadow-sm border border-gray-100 flex flex-col cursor-grab active:cursor-grabbing select-none touch-pan-y"
              >
                {/* Swipe Badge Overlays */}
                <AnimatePresence>
                  {(dragOffset.x > 30 || exitDirection === 'right') && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
                      animate={{ opacity: 1, scale: 1, rotate: -15 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      className="absolute top-12 left-6 z-40 border-[3.5px] border-[#30d158] text-[#30d158] bg-white/95 backdrop-blur-xs font-black tracking-wider text-xl uppercase px-4 py-1.5 rounded-2xl shadow-xl flex items-center space-x-2 pointer-events-none"
                    >
                      <Heart className="w-7 h-7 fill-[#30d158]" strokeWidth={0} />
                      <span>LIKE</span>
                    </motion.div>
                  )}
                  {(dragOffset.x < -30 || exitDirection === 'left') && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.6, rotate: 15 }}
                      animate={{ opacity: 1, scale: 1, rotate: 15 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      className="absolute top-12 right-6 z-40 border-[3.5px] border-[#ff2d55] text-[#ff2d55] bg-white/95 backdrop-blur-xs font-black tracking-wider text-xl uppercase px-4 py-1.5 rounded-2xl shadow-xl flex items-center space-x-2 pointer-events-none"
                    >
                      <X className="w-7 h-7 text-[#ff2d55]" strokeWidth={3.5} />
                      <span>PASS</span>
                    </motion.div>
                  )}
                </AnimatePresence>"""

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
                >
                  {/* Swipe Badge Overlays */}
                  <motion.div 
                    style={{ opacity: likeOpacity, rotate: -15, scale: likeOpacity }}
                    className="absolute top-12 left-6 z-40 border-[3.5px] border-[#30d158] text-[#30d158] bg-white/95 backdrop-blur-xs font-black tracking-wider text-xl uppercase px-4 py-1.5 rounded-2xl shadow-xl flex items-center space-x-2 pointer-events-none origin-center"
                  >
                    <Heart className="w-7 h-7 fill-[#30d158]" strokeWidth={0} />
                    <span>LIKE</span>
                  </motion.div>
                  <motion.div 
                    style={{ opacity: passOpacity, rotate: 15, scale: passOpacity }}
                    className="absolute top-12 right-6 z-40 border-[3.5px] border-[#ff2d55] text-[#ff2d55] bg-white/95 backdrop-blur-xs font-black tracking-wider text-xl uppercase px-4 py-1.5 rounded-2xl shadow-xl flex items-center space-x-2 pointer-events-none origin-center"
                  >
                    <X className="w-7 h-7 text-[#ff2d55]" strokeWidth={3.5} />
                    <span>PASS</span>
                  </motion.div>"""

if old_current_profile in content:
    content = content.replace(old_current_profile, new_current_profile)
    content = content.replace(
        """                  </div>
                </div>
              </div>
            )}

            {/* Floating Action Buttons */}""",
        """                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Action Buttons */}"""
    )
    with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Could not find string")

