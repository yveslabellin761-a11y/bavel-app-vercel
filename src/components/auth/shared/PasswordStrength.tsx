import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const getStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, label: '', color: 'bg-transparent' };
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, label: 'Faible', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Moyen', color: 'bg-amber-400' };
    return { score, label: 'Fort', color: 'bg-emerald-400' };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between text-[10px] text-white/70">
        <span>Force du mot de passe :</span>
        <span className="font-semibold">{strength.label}</span>
      </div>
      <div className="flex space-x-1 h-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`flex-1 rounded-full transition-all duration-300 ${
              level <= strength.score ? strength.color : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
