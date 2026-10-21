import React, { useState } from 'react';
import { ROLES, RoleType } from '../game/mafiaRules.ts';
import { sound } from '../utils/audioEngine.ts';
import { Eye, EyeOff, Shield, Skull, HeartPulse, Search, Sparkles, User, Crown } from 'lucide-react';

interface RoleCardProps {
  role: RoleType;
  playerName?: string;
  isRevealed?: boolean;
  onRevealToggle?: () => void;
  hideDetails?: boolean;
  compact?: boolean;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  playerName,
  isRevealed: controlledRevealed,
  onRevealToggle,
  compact = false,
}) => {
  const [internalRevealed, setInternalRevealed] = useState(false);
  const isRevealed = controlledRevealed !== undefined ? controlledRevealed : internalRevealed;

  const roleInfo = ROLES[role];

  const handleToggle = () => {
    sound.playCardFlip();
    if (onRevealToggle) {
      onRevealToggle();
    } else {
      setInternalRevealed(!internalRevealed);
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'MAFIA_DON':
        return <Crown className="w-12 h-12 text-rose-500 animate-pulse" />;
      case 'MAFIA':
        return <Skull className="w-12 h-12 text-red-500" />;
      case 'DOCTOR':
        return <HeartPulse className="w-12 h-12 text-emerald-400 animate-pulse" />;
      case 'DETECTIVE':
        return <Search className="w-12 h-12 text-blue-400" />;
      case 'BODYGUARD':
        return <Shield className="w-12 h-12 text-amber-400" />;
      case 'JOKER':
        return <Sparkles className="w-12 h-12 text-purple-400" />;
      case 'CITIZEN':
      default:
        return <User className="w-12 h-12 text-teal-400" />;
    }
  };

  if (compact) {
    return (
      <div
        className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-sm font-medium ${roleInfo.colorClass}`}
      >
        <span className="font-bold">{roleInfo.nameAr}</span>
        <span className="text-xs opacity-75">({roleInfo.team === 'MAFIA' ? 'مافيا' : roleInfo.team === 'CITIZENS' ? 'مواطن' : 'مستقل'})</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <div
        onClick={handleToggle}
        className={`cursor-pointer group relative rounded-2xl p-6 transition-all duration-300 border shadow-2xl ${
          isRevealed
            ? `bg-zinc-900/90 ${roleInfo.colorClass}`
            : 'bg-zinc-900 border-zinc-700/80 hover:border-red-500/50 hover:bg-zinc-800/80'
        }`}
      >
        {playerName && (
          <div className="text-center mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">بطاقة اللاعب</span>
            <h3 className="text-xl font-bold text-white mt-0.5">{playerName}</h3>
          </div>
        )}

        {isRevealed ? (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="p-4 rounded-full bg-zinc-950/60 border border-zinc-800 shadow-inner">
              {getRoleIcon()}
            </div>

            <div>
              <div className="inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-zinc-950/80 border border-current">
                {roleInfo.team === 'MAFIA' ? 'عصابة المافيا 🩸' : roleInfo.team === 'CITIZENS' ? 'المواطنون الصالحون 🛡️' : 'فريق مستقل 🎭'}
              </div>
              <h2 className="text-2xl font-black tracking-wide text-white">{roleInfo.nameAr}</h2>
              <p className="text-sm font-medium text-zinc-300 mt-1">{roleInfo.subtitleAr}</p>
            </div>

            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed text-right w-full">
              {roleInfo.descriptionAr}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
              <EyeOff className="w-3.5 h-3.5" />
              <span>انقر لإخفاء البطاقة وحمايتها من الأعين</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-4xl">🎭</span>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-zinc-200">البطاقة مشفرة وسرية</h4>
              <p className="text-xs text-zinc-400 mt-1">تأكد ألا أحد ينظر إلى الشاشة بجانبك</p>
            </div>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-red-900/40 transition-all active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>انقر لكشف هويتك السرية</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
