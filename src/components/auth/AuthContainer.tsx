import React from 'react';

export const AuthContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#120008] via-[#1f020a] to-[#0a0005] z-[200] flex flex-col h-[100dvh] overflow-hidden text-white font-sans select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(226,0,48,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.1),transparent_50%)] pointer-events-none" />
      {children}
    </div>
  );
};
