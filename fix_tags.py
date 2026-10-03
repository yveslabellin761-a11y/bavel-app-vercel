import re

with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'r') as f:
    content = f.read()

old_str = """                {/* Gradient fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-[20px]"></div>
              </div>
            )}

            {/* Floating Action Buttons */}"""

new_str = """                {/* Gradient fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-[20px]"></div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Floating Action Buttons */}"""

content = content.replace(old_str, new_str)
with open('src/components/mobile/swipes/EncountersProfiles.tsx', 'w') as f:
    f.write(content)
