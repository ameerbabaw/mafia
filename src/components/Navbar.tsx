import React, { useState } from 'react';
import { AppMode } from '../types/game.ts';
import { sound } from '../utils/audioEngine.ts';
import { Volume2, VolumeX, BookOpen, Music, Users, Smartphone, Compass } from 'lucide-react';

interface NavbarProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onOpenRules: () => void;
  onOpenSoundboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  onOpenRules,
  onOpenSoundboard,
}) => {
  const [isMuted, setIsMuted] = useState(sound.isMuted);

  const toggleMute = () => {
    sound.isMuted = !sound.isMuted;
    setIsMuted(sound.isMuted);
    if (!sound.isMuted) {
      sound.playCardFlip();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-700 via-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-950/50 border border-red-500/30">
            <span className="text-xl">🕵️‍♂️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wide text-white">المافيا العربية</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600/20 text-red-400 border border-red-600/30 uppercase">
                MAFIA
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">أونلاين وأوفلاين • من 3 لاعبين فأكثر</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <nav aria-label="أنماط اللعبة" className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300">
          <button
            onClick={() => onSelectMode('ONLINE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentMode === 'ONLINE'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md'
                : 'hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>غرف أونلاين</span>
          </button>
          <button
            onClick={() => onSelectMode('OFFLINE_PASS_PLAY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentMode === 'OFFLINE_PASS_PLAY'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md'
                : 'hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>أوفلاين هاتف واحد</span>
          </button>
          <button
            onClick={() => onSelectMode('MODERATOR_TOOL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentMode === 'MODERATOR_TOOL'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md'
                : 'hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>أداة الراوي الميداني</span>
          </button>
        </nav>

        {/* Auxiliary Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSoundboard}
            title="لوحة المؤثرات والأصوات"
            aria-label="فتح لوحة المؤثرات الصوتية"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-500/50 text-xs font-bold text-zinc-300 hover:text-white transition-all active:scale-95"
          >
            <Music className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden md:inline">المؤثرات</span>
          </button>

          <button
            onClick={onOpenRules}
            title="دليل وقواعد اللعبة"
            aria-label="فتح دليل وقواعد اللعبة"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-xs font-bold text-zinc-300 hover:text-white transition-all active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">القواعد</span>
          </button>

          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
