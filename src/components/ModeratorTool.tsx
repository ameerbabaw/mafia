import React, { useState, useEffect } from 'react';
import { ROLES, RoleType } from '../game/mafiaRules.ts';
import { sound } from '../utils/audioEngine.ts';
import {
  Shield,
  Skull,
  Cross,
  Search,
  Volume2,
  Clock,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Mic,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';

interface ModPlayer {
  id: string;
  name: string;
  role: RoleType;
  isAlive: boolean;
  notes: string;
}

const SAMPLE_PLAYERS = ['أحمد', 'عمر', 'سارة', 'فيصل', 'نورة'];

export const ModeratorTool: React.FC = () => {
  const [players, setPlayers] = useState<ModPlayer[]>([
    { id: '1', name: 'أحمد', role: 'MAFIA_DON', isAlive: true, notes: '' },
    { id: '2', name: 'عمر', role: 'DOCTOR', isAlive: true, notes: '' },
    { id: '3', name: 'سارة', role: 'DETECTIVE', isAlive: true, notes: '' },
    { id: '4', name: 'فيصل', role: 'CITIZEN', isAlive: true, notes: '' },
    { id: '5', name: 'نورة', role: 'CITIZEN', isAlive: true, notes: '' },
  ]);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('CITIZEN');

  // Timers
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Night script step checklist
  const [nightChecklist, setNightChecklist] = useState<Record<string, boolean>>({
    sleep: false,
    mafia: false,
    doctor: false,
    detective: false,
    wake: false,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            sound.playGavel();
            return 0;
          }
          if (prev <= 6) {
            sound.playTicking();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([
        ...players,
        {
          id: Date.now().toString(),
          name: newPlayerName.trim(),
          role: selectedRole,
          isAlive: true,
          notes: '',
        },
      ]);
      setNewPlayerName('');
    }
  };

  const toggleAlive = (id: string) => {
    sound.playCardFlip();
    setPlayers(
      players.map(p => (p.id === id ? { ...p, isAlive: !p.isAlive } : p))
    );
  };

  const updateRole = (id: string, role: RoleType) => {
    setPlayers(players.map(p => (p.id === id ? { ...p, role } : p)));
  };

  const updateNotes = (id: string, notes: string) => {
    setPlayers(players.map(p => (p.id === id ? { ...p, notes } : p)));
  };

  const deletePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const resetNightChecklist = () => {
    setNightChecklist({
      sleep: false,
      mafia: false,
      doctor: false,
      detective: false,
      wake: false,
    });
  };

  const aliveMafia = players.filter(p => p.isAlive && (p.role === 'MAFIA' || p.role === 'MAFIA_DON')).length;
  const aliveInnocents = players.filter(p => p.isAlive && p.role !== 'MAFIA' && p.role !== 'MAFIA_DON').length;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>لوحة تحكم الراوي الميداني (Game Master)</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              للجلسات الواقعية
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            أدر جلسة اللعب الحية بالكامل، تتبع الأدوار سراً، وشغل أصوات الراوي والمؤقت
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300">
            مافيا أحياء: {aliveMafia}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300">
            مواطنون أحياء: {aliveInnocents}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Players Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>قائمة اللاعبين وتوزيع الأدوار</span>
              <span className="text-xs text-zinc-400 font-normal">
                انقر على حالة اللاعب لتبديل حي / ميت
              </span>
            </h3>

            {/* Add player row */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
                placeholder="اسم اللاعب الجديد..."
                aria-label="اسم اللاعب الجديد"
                className="flex-1 min-w-[140px] bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as RoleType)}
                aria-label="دور اللاعب الجديد"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                {Object.keys(ROLES).map(k => (
                  <option key={k} value={k}>
                    {ROLES[k as RoleType].nameAr}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim()}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>

            {/* Players List Table */}
            <div className="space-y-2">
              {players.map(p => {
                const roleInfo = ROLES[p.role];
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all ${
                      p.isAlive
                        ? 'bg-zinc-950 border-zinc-800/90'
                        : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => toggleAlive(p.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                          p.isAlive
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-600/20 text-red-400 border border-red-500/40 line-through'
                        }`}
                      >
                        {p.isAlive ? 'حي' : 'ميت'}
                      </button>
                      <span className={`text-sm font-bold ${p.isAlive ? 'text-white' : 'text-zinc-500 line-through'}`}>
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <select
                        value={p.role}
                        onChange={e => updateRole(p.id, e.target.value as RoleType)}
                        aria-label={`تعديل دور اللاعب ${p.name}`}
                        className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        {Object.keys(ROLES).map(k => (
                          <option key={k} value={k}>
                            {ROLES[k as RoleType].nameAr}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="ملاحظات..."
                        value={p.notes}
                        onChange={e => updateNotes(p.id, e.target.value)}
                        aria-label={`ملاحظات عن اللاعب ${p.name}`}
                        className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2 py-1 w-24 sm:w-32 focus:outline-none"
                      />

                      <button
                        onClick={() => deletePlayer(p.id)}
                        title="حذف"
                        aria-label={`حذف اللاعب ${p.name}`}
                        className="p-1 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Night Script & Audio Controller */}
        <div className="space-y-4">
          {/* Discussion Timer Widget */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400">مؤقت النقاش والدفاع</span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {Math.floor(timerSeconds / 60)}:
                {(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all"
              >
                {isTimerRunning ? 'إيقاف ⏸️' : 'تشغيل ▶️'}
              </button>
              <button
                onClick={() => setTimerSeconds(t => t + 30)}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all"
              >
                +30ث
              </button>
              <button
                onClick={() => setTimerSeconds(60)}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all"
              >
                60ث
              </button>
            </div>
          </div>

          {/* Night Script Checklist */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>بروتوكول إدارة الليل</span>
              </h4>
              <button
                onClick={resetNightChecklist}
                className="text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                إعادة ضبط
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nightChecklist.sleep}
                  onChange={e => {
                    setNightChecklist({ ...nightChecklist, sleep: e.target.checked });
                    if (e.target.checked) {
                      sound.playNightFall();
                      sound.speakArabic('أيها المواطنون، ناموا وأغمضوا أعينكم جميعاً الآن!');
                    }
                  }}
                  className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                />
                <span className={nightChecklist.sleep ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                  1. "أغمضوا أعينكم جميعاً"
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nightChecklist.mafia}
                  onChange={e => {
                    setNightChecklist({ ...nightChecklist, mafia: e.target.checked });
                    if (e.target.checked) {
                      sound.speakArabic('المافيا تستيقظ الآن لاختيار الضحية.');
                    }
                  }}
                  className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                />
                <span className={nightChecklist.mafia ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                  2. استيقاظ المافيا واختيار الضحية
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nightChecklist.doctor}
                  onChange={e => {
                    setNightChecklist({ ...nightChecklist, doctor: e.target.checked });
                    if (e.target.checked) {
                      sound.speakArabic('نامت المافيا... يستيقظ الطبيب الآن لاختيار من يحميه.');
                    }
                  }}
                  className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                />
                <span className={nightChecklist.doctor ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                  3. استيقاظ الطبيب للحماية
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nightChecklist.detective}
                  onChange={e => {
                    setNightChecklist({ ...nightChecklist, detective: e.target.checked });
                    if (e.target.checked) {
                      sound.speakArabic('نام الطبيب... يستيقظ المحقق للإشارة إلى المشتبه به.');
                    }
                  }}
                  className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                />
                <span className={nightChecklist.detective ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                  4. استيقاظ المحقق للتفتيش
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nightChecklist.wake}
                  onChange={e => {
                    setNightChecklist({ ...nightChecklist, wake: e.target.checked });
                    if (e.target.checked) {
                      sound.playDawn();
                      sound.speakArabic('أشرق الصباح، استيقظوا جميعاً!');
                    }
                  }}
                  className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                />
                <span className={nightChecklist.wake ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                  5. "أشرق الصباح، استيقظوا!"
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
