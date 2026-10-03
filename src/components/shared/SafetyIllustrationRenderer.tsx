import React from 'react';

interface SafetyIllustrationRendererProps {
  id: string;
  fallbackImage?: string;
  className?: string;
}

export const SafetyIllustrationRenderer: React.FC<SafetyIllustrationRendererProps> = ({ id, fallbackImage, className = "w-full h-full" }) => {
  switch (id) {
    case 'attitude':
      return (
        <svg className={className} viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" fill="#dcd3ff" />
          <circle cx="200" cy="120" r="90" fill="#c4b5fd" opacity="0.5" />
          {/* Main Shield */}
          <path d="M 200 40 L 270 70 L 270 140 C 270 180, 200 200, 200 200 C 200 200, 130 180, 130 140 L 130 70 Z" fill="#6d28d9" />
          <path d="M 200 48 L 260 74 L 260 136 C 260 171, 200 189, 200 189 C 200 189, 140 171, 140 136 L 140 74 Z" fill="#7c3aed" />
          {/* Heart inside shield */}
          <path d="M 200 95 C 185 80, 160 100, 200 135 C 240 100, 215 80, 200 95 Z" fill="#f43f5e" />
          {/* Floating shield accent bubbles */}
          <circle cx="90" cy="80" r="18" fill="#a78bfa" opacity="0.7" />
          <circle cx="310" cy="160" r="22" fill="#8b5cf6" opacity="0.6" />
          <circle cx="320" cy="70" r="12" fill="#c4b5fd" />
        </svg>
      );

    case 'conseils':
      return (
        <svg className={className} viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" fill="#fef08a" />
          <circle cx="200" cy="120" r="85" fill="#fde047" opacity="0.6" />
          {/* Golden Shield */}
          <path d="M 200 45 L 260 70 L 260 130 C 260 170, 200 190, 200 190 C 200 190, 140 170, 140 130 L 140 70 Z" fill="#ca8a04" />
          <path d="M 200 52 L 252 74 L 252 126 C 252 161, 200 179, 200 179 C 200 179, 148 161, 148 126 L 148 74 Z" fill="#eab308" />
          {/* Lightbulb in center */}
          <circle cx="200" cy="100" r="24" fill="#ffffff" />
          <rect x="193" y="122" width="14" height="12" rx="3" fill="#a16207" />
          <path d="M 200 86 L 200 94 M 186 100 L 192 100 M 208 100 L 214 100 M 190 90 L 194 94 M 210 90 L 206 94" stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
          {/* Checkmark badge bottom right */}
          <circle cx="270" cy="155" r="20" fill="#22c55e" />
          <path d="M 260 155 L 267 162 L 280 148" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'rencontres':
      return (
        <svg className={className} viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" fill="#fce7f3" />
          <circle cx="200" cy="120" r="85" fill="#fbcfe8" opacity="0.6" />
          {/* Coffee Cups Clinking */}
          <rect x="130" y="100" width="50" height="60" rx="12" fill="#be185d" />
          <path d="M 125 115 C 110 115, 110 140, 125 140" stroke="#be185d" strokeWidth="6" strokeLinecap="round" />
          
          <rect x="220" y="100" width="50" height="60" rx="12" fill="#7c3aed" />
          <path d="M 275 115 C 290 115, 290 140, 275 140" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" />
          {/* Location Pin Overhead */}
          <path d="M 200 40 C 180 40, 165 55, 165 75 C 165 100, 200 120, 200 120 C 200 120, 235 100, 235 75 C 235 55, 220 40, 200 40 Z" fill="#f43f5e" />
          <circle cx="200" cy="70" r="10" fill="white" />
        </svg>
      );

    case 'bienetre':
      return (
        <svg className={className} viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" fill="#e0e7ff" />
          <circle cx="200" cy="120" r="85" fill="#c7d2fe" opacity="0.6" />
          {/* Calming Sun & Lotus Leaves */}
          <circle cx="200" cy="85" r="30" fill="#f59e0b" />
          <path d="M 200 110 C 150 110, 130 160, 200 165 C 270 160, 250 110, 200 110 Z" fill="#10b981" />
          <path d="M 200 125 C 170 125, 155 160, 200 165 C 245 160, 230 125, 200 125 Z" fill="#34d399" />
          {/* Floating gentle sparkles */}
          <circle cx="120" cy="70" r="6" fill="#818cf8" />
          <circle cx="280" cy="80" r="8" fill="#a5b4fc" />
        </svg>
      );

    case 'abusive':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#ede9fe" />
          {/* Angry purple speech bubble */}
          <path d="M 60 40 C 60 25, 240 25, 240 40 L 240 120 C 240 135, 180 135, 160 135 L 120 165 L 130 135 C 60 135, 60 120, 60 40 Z" fill="#6d28d9" />
          {/* Exclamation lightning inside bubble */}
          <path d="M 150 50 L 135 85 L 152 85 L 142 115 L 168 75 L 151 75 Z" fill="#fbbf24" />
          {/* Floating broken heart top left */}
          <circle cx="65" cy="35" r="22" fill="#ef4444" />
          <path d="M 58 26 C 53 20, 45 28, 65 44 C 85 28, 77 20, 72 26 Z" fill="white" />
          <line x1="60" y1="26" x2="68" y2="38" stroke="#ef4444" strokeWidth="2.5" />
          {/* Sad face badge top right */}
          <circle cx="235" cy="40" r="20" fill="#f59e0b" />
          <circle cx="228" cy="36" r="2.5" fill="#1e1b4b" />
          <circle cx="242" cy="36" r="2.5" fill="#1e1b4b" />
          <path d="M 227 48 C 232 43, 238 43, 243 48" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'harass':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#ede9fe" />
          {/* Umbrella sheltering */}
          <path d="M 70 100 C 70 45, 230 45, 230 100 Z" fill="#7c3aed" />
          <path d="M 70 100 C 95 108, 120 108, 150 100 C 180 108, 205 108, 230 100 L 230 100 Z" fill="#6d28d9" />
          {/* Umbrella stem */}
          <path d="M 150 100 L 150 160 C 150 168, 140 168, 140 160" stroke="#451a03" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Heart sheltered underneath */}
          <path d="M 150 120 C 140 110, 125 125, 150 145 C 175 125, 160 110, 150 120 Z" fill="#f43f5e" />
          {/* Falling raindrops above */}
          <path d="M 100 30 L 100 42 M 150 20 L 150 35 M 200 30 L 200 42" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'fake':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#ede9fe" />
          {/* Fake profile card in background */}
          <rect x="70" y="30" width="160" height="110" rx="16" fill="white" stroke="#c4b5fd" strokeWidth="3" />
          <circle cx="120" cy="70" r="20" fill="#e9d5ff" />
          <rect x="150" y="60" width="60" height="8" rx="4" fill="#cbd5e1" />
          <rect x="150" y="75" width="40" height="8" rx="4" fill="#e2e8f0" />
          {/* Question mark badge over profile */}
          <circle cx="180" cy="110" r="18" fill="#ef4444" />
          <text x="180" y="117" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="sans-serif">?</text>
          {/* Binoculars in foreground */}
          <g transform="translate(85, 110)">
            <circle cx="35" cy="30" r="26" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="4" />
            <circle cx="95" cy="30" r="26" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="4" />
            <rect x="58" y="24" width="14" height="12" rx="3" fill="#475569" />
          </g>
        </svg>
      );

    case 'obscene':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#ede9fe" />
          {/* Blurred image frame */}
          <rect x="75" y="35" width="150" height="110" rx="20" fill="#6d28d9" />
          {/* Eye with slash */}
          <path d="M 110 90 C 125 65, 175 65, 190 90 C 175 115, 125 115, 110 90 Z" stroke="white" strokeWidth="5" fill="none" />
          <circle cx="150" cy="90" r="12" fill="white" />
          {/* Red slash line across */}
          <line x1="100" y1="50" x2="200" y2="130" stroke="#ef4444" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );

    case 'report':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#ede9fe" />
          {/* Megaphone vector */}
          <g transform="translate(60, 30)">
            <path d="M 60 60 L 140 30 L 140 120 L 60 90 Z" fill="#ec4899" />
            <rect x="30" y="60" width="30" height="30" rx="6" fill="#6d28d9" />
            <path d="M 140 30 C 160 30, 160 120, 140 120 Z" fill="#be185d" />
            <path d="M 50 90 L 35 135 C 35 142, 50 142, 55 135 L 65 90 Z" fill="#fbbf24" />
            {/* Sound arcs */}
            <path d="M 170 50 C 185 65, 185 85, 170 100" stroke="#6d28d9" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M 185 35 C 210 60, 210 90, 185 115" stroke="#ec4899" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      );

    case 'dates':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#fef3c7" />
          {/* Signpost */}
          <rect x="142" y="20" width="16" height="160" rx="8" fill="#6d28d9" />
          {/* Left Sign Pointer */}
          <path d="M 45 50 L 142 50 L 142 90 L 45 90 L 20 70 Z" fill="#4c1d95" />
          <circle cx="60" cy="70" r="12" fill="#22c55e" />
          <path d="M 54 70 L 58 74 L 66 64" stroke="white" strokeWidth="3" strokeLinecap="round" />
          {/* Right Sign Pointer */}
          <path d="M 158 95 L 255 95 L 280 115 L 255 135 L 158 135 Z" fill="#7c3aed" />
          <circle cx="240" cy="115" r="12" fill="#ef4444" />
          <line x1="234" y1="109" x2="246" y2="121" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <line x1="246" y1="109" x2="234" y2="121" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'chat':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#fef3c7" />
          {/* Purple speech bubble */}
          <rect x="50" y="35" width="130" height="85" rx="28" fill="#6d28d9" />
          <path d="M 70 115 L 55 145 L 95 125 Z" fill="#6d28d9" />
          {/* Pink speech bubble */}
          <rect x="120" y="75" width="130" height="85" rx="28" fill="#ec4899" />
          <path d="M 220 155 L 245 180 L 205 165 Z" fill="#ec4899" />
        </svg>
      );

    case 'consent':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#fef3c7" />
          {/* Two hands holding */}
          <path d="M 30 130 C 80 110, 130 80, 170 100 L 150 140 L 40 160 Z" fill="#d97706" />
          <path d="M 270 130 C 220 110, 170 80, 130 100 L 150 140 L 260 160 Z" fill="#b45309" />
          {/* Gold bracelet */}
          <rect x="50" y="125" width="12" height="30" rx="6" fill="#fbbf24" />
          {/* Glowing heart overhead */}
          <path d="M 150 40 C 135 25, 110 45, 150 80 C 190 45, 165 25, 150 40 Z" fill="#ef4444" />
        </svg>
      );

    case 'scam':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#fef3c7" />
          {/* Fishing line & hook */}
          <line x1="150" y1="0" x2="150" y2="80" stroke="#1e293b" strokeWidth="3" />
          <path d="M 150 80 C 150 105, 175 105, 175 80" stroke="#1e293b" strokeWidth="4" fill="none" />
          {/* Blank credit card with NO text/numbers */}
          <rect x="75" y="70" width="140" height="85" rx="12" fill="#6d28d9" />
          <rect x="90" y="85" width="28" height="20" rx="4" fill="#fbbf24" />
          <rect x="90" y="120" width="60" height="8" rx="4" fill="#a78bfa" />
          <rect x="160" y="120" width="30" height="8" rx="4" fill="#a78bfa" />
        </svg>
      );

    case 'verify':
      return (
        <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#fef3c7" />
          {/* Portrait silhouette */}
          <circle cx="150" cy="85" r="40" fill="#fde047" />
          <path d="M 110 70 C 110 35, 190 35, 190 70 L 195 130 C 175 150, 125 150, 105 130 Z" fill="#ea580c" />
          <path d="M 90 190 C 90 145, 210 145, 210 190 Z" fill="#6d28d9" />
          {/* Face scan corner brackets */}
          <path d="M 100 70 L 100 50 L 120 50" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 200 70 L 200 50 L 180 50" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 100 120 L 100 140 L 120 140" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 200 120 L 200 140 L 180 140" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* Blue verification checkmark badge */}
          <circle cx="210" cy="140" r="20" fill="#3b82f6" stroke="white" strokeWidth="3" />
          <path d="M 200 140 L 207 147 L 220 133" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    default:
      if (fallbackImage) {
        return (
          <img 
            src={fallbackImage} 
            alt={id} 
            referrerPolicy="no-referrer"
            className={`${className} object-cover`}
          />
        );
      }
      return (
        <div className="w-full h-full bg-purple-100 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center">
            <span className="text-purple-700 font-bold">Bavel</span>
          </div>
        </div>
      );
  }
};
