import React, { createContext, useContext, ReactNode } from 'react';

export type SwipeColor = 'rose' | 'emerald' | 'amber' | 'slate' | 'blue' | 'purple';
export type SwipeSize = 'sm' | 'default' | 'lg';

export interface ColorStyle {
  text: string;
  hover: string;
  active: string;
  bg?: string;
}

export interface SizeStyle {
  button: string;
  icon: string;
}

export interface SwipeTheme {
  colors: Record<SwipeColor, ColorStyle>;
  sizes: Record<SwipeSize, SizeStyle>;
}

const defaultTheme: SwipeTheme = {
  colors: {
    rose: {
      text: 'text-rose-500 filter drop-shadow-[0_2px_3px_rgba(244,63,94,0.15)]',
      hover: 'hover:bg-rose-50/50 hover:border-rose-200',
      active: 'active:bg-rose-100/80',
    },
    emerald: {
      text: 'text-emerald-500 fill-emerald-500 filter drop-shadow-[0_2px_4px_rgba(16,185,129,0.2)]',
      hover: 'hover:bg-emerald-50/50 hover:border-emerald-200',
      active: 'active:bg-emerald-100/80',
    },
    amber: {
      text: 'text-amber-500 filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.2)]',
      hover: 'hover:bg-amber-50/50 hover:border-amber-200',
      active: 'active:bg-amber-100/80',
    },
    slate: {
      text: 'text-slate-600 dark:text-slate-300 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.1)]',
      hover: 'hover:bg-slate-100/50 dark:hover:bg-slate-700/50',
      active: 'active:bg-slate-200/80 dark:active:bg-slate-600/80',
    },
    blue: {
      text: 'text-blue-500 filter drop-shadow-[0_2px_4px_rgba(59,130,246,0.2)]',
      hover: 'hover:bg-blue-50/50 hover:border-blue-200',
      active: 'active:bg-blue-100/80',
    },
    purple: {
      text: 'text-purple-500 filter drop-shadow-[0_2px_4px_rgba(168,85,247,0.2)]',
      hover: 'hover:bg-purple-50/50 hover:border-purple-200',
      active: 'active:bg-purple-100/80',
    },
  },
  sizes: {
    sm: {
      button: 'w-9 h-9 sm:w-10 sm:h-10',
      icon: 'w-4 h-4 sm:w-4.5 sm:h-4.5',
    },
    default: {
      button: 'w-11 h-11 sm:w-12.5 sm:h-12.5',
      icon: 'w-5 h-5 sm:w-5.5 sm:h-5.5',
    },
    lg: {
      button: 'w-12 h-12 sm:w-14 sm:h-14',
      icon: 'w-5.5 h-5.5 sm:w-6 sm:h-6',
    },
  },
};

const SwipeThemeContext = createContext<SwipeTheme>(defaultTheme);

export const SwipeThemeProvider: React.FC<{ children: ReactNode; value?: Partial<SwipeTheme> }> = ({ children, value }) => {
  const mergedTheme = value ? { ...defaultTheme, ...value } : defaultTheme;
  return (
    <SwipeThemeContext.Provider value={mergedTheme}>
      {children}
    </SwipeThemeContext.Provider>
  );
};

export const useSwipeTheme = () => useContext(SwipeThemeContext);
