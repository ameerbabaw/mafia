import React, { useState, useEffect } from 'react';
import { AppMode } from './types/game.ts';
import { Navbar } from './components/Navbar.tsx';
import { OnlineGame } from './components/OnlineGame.tsx';
import { OfflineGame } from './components/OfflineGame.tsx';
import { ModeratorTool } from './components/ModeratorTool.tsx';
import { RulesModal } from './components/RulesModal.tsx';
import { SoundboardModal } from './components/SoundboardModal.tsx';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('ONLINE');
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      if (modeParam === 'offline') setCurrentMode('OFFLINE_PASS_PLAY');
      else if (modeParam === 'moderator') setCurrentMode('MODERATOR_TOOL');
      else if (modeParam === 'online') setCurrentMode('ONLINE');
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white relative">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-red-900/15 rounded-full blur-[120px] animate-mafia-glow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-rose-950/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-zinc-800/15 rounded-full blur-[100px]" />
      </div>

      {/* Main Navigation Header */}
      <Navbar
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenSoundboard={() => setIsSoundboardOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 z-10 py-6 px-4">
        {currentMode === 'ONLINE' && <OnlineGame />}
        {currentMode === 'OFFLINE_PASS_PLAY' && <OfflineGame />}
        {currentMode === 'MODERATOR_TOOL' && <ModeratorTool />}
      </main>

      {/* Footer */}
      <footer className="z-10 border-t border-zinc-900 bg-zinc-950/80 py-4 px-4 text-center text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>لعبة المافيا العربية الأصلية • تجربة متكاملة أونلاين وأوفلاين</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRulesOpen(true)}
              className="hover:text-zinc-300 transition-colors"
            >
              شرح الأدوار والقواعد
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSoundboardOpen(true)}
              className="hover:text-zinc-300 transition-colors"
            >
              مؤثرات الراوي
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <SoundboardModal isOpen={isSoundboardOpen} onClose={() => setIsSoundboardOpen(false)} />
    </div>
  );
}
