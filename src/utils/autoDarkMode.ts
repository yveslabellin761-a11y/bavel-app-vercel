/**
 * Auto Dark Mode Logic:
 * Detects phone's native dark mode preference ('prefers-color-scheme: dark')
 * AND local time (automatically switches to dark mode after 19:00 / 7 PM until 07:00 / 7 AM)
 * for optimal night-time visual comfort.
 */
export function initAutoDarkMode(): () => void {
  const updateDarkMode = () => {
    const hours = new Date().getHours();
    const isNightTime = hours >= 19 || hours < 7;
    const isSystemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Check manual override if any
    const userPref = typeof localStorage !== 'undefined' ? localStorage.getItem('bavel_theme_mode') : null;
    let shouldBeDark = false;
    
    if (userPref === 'dark') {
      shouldBeDark = true;
    } else if (userPref === 'light') {
      shouldBeDark = false;
    } else {
      // Automatic: native phone settings OR night time (19h - 7h)
      shouldBeDark = Boolean(isSystemDark || isNightTime);
    }

    if (typeof document !== 'undefined') {
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark-mode-active');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark-mode-active');
      }
    }
  };

  updateDarkMode();

  // Listen for native OS dark mode switches
  let mediaQuery: MediaQueryList | null = null;
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateDarkMode);
    }
  }

  // Check hourly for sunset/sunrise transition
  const interval = setInterval(updateDarkMode, 60000);

  return () => {
    clearInterval(interval);
    if (mediaQuery && mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', updateDarkMode);
    }
  };
}
