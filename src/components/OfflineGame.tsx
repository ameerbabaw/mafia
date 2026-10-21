import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  RoleType,
  calculateRoleDistribution,
  shuffleArray,
  resolveNightActions,
  resolveDayVoting,
  checkGameWinner,
  ROLES,
} from '../game/mafiaRules.ts';
import { OfflinePlayer } from '../types/game.ts';
import { RoleCard } from './RoleCard.tsx';
import { sound } from '../utils/audioEngine.ts';
import {
  Users,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Sun,
  Moon,
  Clock,
  Shield,
  Skull,
  Cross,
  Search,
  CheckCircle,
  HelpCircle,
  Volume2,
  Sparkles,
} from 'lucide-react';

type OfflineStep =
  | 'SETUP'
  | 'REVEAL_CARDS'
  | 'NIGHT_MAFIA'
  | 'NIGHT_DOCTOR'
  | 'NIGHT_DETECTIVE'
  | 'DAY_DAWN'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTING'
  | 'GAME_OVER';

const DEFAULT_NAMES = ['أحمد', 'فيصل', 'سارة', 'عمر', 'نورة'];
const AVATARS = ['🧔', '🧕', '👱‍♂️', '👨‍💼', '👩‍💻', '👨‍🎨', '👮‍♂️', '🧑‍⚕️'];

export const OfflineGame: React.FC = () => {
  const [step, setStep] = useState<OfflineStep>('SETUP');
  const [playerNames, setPlayerNames] = useState<string[]>(['أحمد', 'فيصل', 'سارة']);
  const [newName, setNewName] = useState('');
  const [includeDoctor, setIncludeDoctor] = useState(true);
  const [includeDetective, setIncludeDetective] = useState(true);
  const [includeBodyguard, setIncludeBodyguard] = useState(false);
  const [includeJoker, setIncludeJoker] = useState(false);

  // In-Game state
  const [players, setPlayers] = useState<OfflinePlayer[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);

  // Night Choices
  const [mafiaTargetId, setMafiaTargetId] = useState<string | null>(null);
  const [doctorProtectId, setDoctorProtectId] = useState<string | null>(null);
  const [detectiveInvestigateId, setDetectiveInvestigateId] = useState<string | null>(null);
  const [detectiveFeedback, setDetectiveFeedback] = useState<string | null>(null);

  // Day State
  const [dawnReport, setDawnReport] = useState<string>('');
  const [discussionTimer, setDiscussionTimer] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<'MAFIA' | 'CITIZENS' | 'JOKER' | null>(null);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && discussionTimer > 0) {
      interval = setInterval(() => {
        setDiscussionTimer(prev => {
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
  }, [isTimerRunning, discussionTimer]);

  const handleAddPlayer = () => {
    const trimmed = newName.trim();
    if (trimmed && !playerNames.includes(trimmed)) {
      setPlayerNames([...playerNames, trimmed]);
      setNewName('');
    }
  };

  const handleRemovePlayer = (idx: number) => {
    if (playerNames.length > 3) {
      setPlayerNames(playerNames.filter((_, i) => i !== idx));
    }
  };

  const handleLoadSampleNames = (count: number) => {
    const list = ['أحمد', 'فيصل', 'سارة', 'عمر', 'نورة', 'زياد', 'ريم', 'خالد'].slice(0, count);
    setPlayerNames(list);
  };

  const handleStartGame = () => {
    if (playerNames.length < 3) return;

    const rolesPool = calculateRoleDistribution(playerNames.length, {
      includeDoctor,
      includeDetective,
      includeBodyguard,
      includeJoker,
    });

    const shuffled = shuffleArray(rolesPool);
    const newPlayers: OfflinePlayer[] = playerNames.map((name, i) => ({
      id: 'offline_' + i,
      name,
      role: shuffled[i],
      isAlive: true,
      avatar: AVATARS[i % AVATARS.length],
    }));

    setPlayers(newPlayers);
    setRevealIndex(0);
    setCardRevealed(false);
    setRoundNumber(1);
    setWinner(null);
    setStep('REVEAL_CARDS');
    sound.playCardFlip();
  };

  const handleNextReveal = () => {
    setCardRevealed(false);
    if (revealIndex + 1 < players.length) {
      setRevealIndex(revealIndex + 1);
    } else {
      // All cards revealed! Start Night
      startNightPhase();
    }
  };

  const startNightPhase = () => {
    setMafiaTargetId(null);
    setDoctorProtectId(null);
    setDetectiveInvestigateId(null);
    setDetectiveFeedback(null);
    setStep('NIGHT_MAFIA');
    sound.playNightFall();
    sound.speakArabic(`حل الليل على البلدة في الجولة ${roundNumber}. أغمضوا أعينكم! المافيا تستيقظ الآن لاختيار الضحية.`);
  };

  const handleConfirmMafiaChoice = () => {
    if (!mafiaTargetId) return;
    sound.playGunshot();

    // Check if Doctor is alive
    const doctorAlive = players.some(p => p.isAlive && p.role === 'DOCTOR');
    if (doctorAlive) {
      setStep('NIGHT_DOCTOR');
      sound.speakArabic('نامت المافيا... يستيقظ الطبيب الآن لاختيار شخص لحمايته.');
    } else {
      // Check if Detective is alive
      const detectiveAlive = players.some(p => p.isAlive && p.role === 'DETECTIVE');
      if (detectiveAlive) {
        setStep('NIGHT_DETECTIVE');
        sound.speakArabic('يستيقظ المحقق الآن للإشارة إلى المشتبه به.');
      } else {
        resolveNight();
      }
    }
  };

  const handleConfirmDoctorChoice = () => {
    sound.playDoctorHeal();
    const detectiveAlive = players.some(p => p.isAlive && p.role === 'DETECTIVE');
    if (detectiveAlive) {
      setStep('NIGHT_DETECTIVE');
      sound.speakArabic('نام الطبيب... يستيقظ المحقق الآن للتحري عن أحد المشتبه بهم.');
    } else {
      resolveNight();
    }
  };

  const handleDetectiveInspect = (targetId: string) => {
    setDetectiveInvestigateId(targetId);
    const target = players.find(p => p.id === targetId);
    if (target) {
      sound.playDetectiveInspection();
      const isMafia = target.role === 'MAFIA' || target.role === 'MAFIA_DON';
      setDetectiveFeedback(isMafia ? '🚨 هذا الشخص ينتمي لعصابة المافيا!' : '✅ هذا الشخص مواطن صالح بريء.');
    }
  };

  const resolveNight = () => {
    const aliveRoles = players.filter(p => p.isAlive).map(p => ({ id: p.id, role: p.role }));
    const resolution = resolveNightActions({
      mafiaTargetId,
      doctorProtectId,
      detectiveInvestigateId,
      alivePlayers: aliveRoles,
    });

    const updated = players.map(p => {
      if (resolution.killedPlayerIds.includes(p.id)) {
        return { ...p, isAlive: false };
      }
      return p;
    });

    setPlayers(updated);

    if (resolution.killedPlayerIds.length > 0) {
      const victims = resolution.killedPlayerIds
        .map(id => players.find(p => p.id === id)?.name)
        .join(', ');
      setDawnReport(`للأسف استيقظت البلدة على فاجعة غدر! سقط ${victims} قتيلاً برصاص الليل.`);
    } else {
      setDawnReport('بشرى سارة! لم يُقتل أحد في هذه الليلة، نجح الطبيب في إنقاذ الضحية أو أخطأت المافيا.');
    }

    // Check winner
    const currentWinner = checkGameWinner(updated);
    if (currentWinner) {
      triggerWinner(currentWinner);
    } else {
      setStep('DAY_DAWN');
      sound.playDawn();
      sound.speakArabic('أشرق الصباح على البلدة! استيقظوا جميعاً لنرى نتائج الليل.');
    }
  };

  const startDayDiscussion = () => {
    setDiscussionTimer(60);
    setIsTimerRunning(true);
    setStep('DAY_DISCUSSION');
  };

  const startVoting = () => {
    setIsTimerRunning(false);
    setVotes({});
    setStep('DAY_VOTING');
    sound.speakArabic('انتهى وقت النقاش وبدأت مرحلة التصويت العلني! صوتوا على من تتهمونه أو تجاوزوا التصويت.');
  };

  const handleVoteSubmit = () => {
    const aliveIds = players.filter(p => p.isAlive).map(p => p.id);
    const voteResult = resolveDayVoting({
      votes,
      alivePlayerIds: aliveIds,
    });

    sound.playGavel();

    if (voteResult.eliminatedPlayerId) {
      const condemned = players.find(p => p.id === voteResult.eliminatedPlayerId);
      const updated = players.map(p =>
        p.id === voteResult.eliminatedPlayerId ? { ...p, isAlive: false } : p
      );
      setPlayers(updated);

      const win = checkGameWinner(updated, voteResult.eliminatedPlayerId);
      if (win) {
        triggerWinner(win);
        return;
      }
    }

    // Check winner
    const win = checkGameWinner(players, voteResult.eliminatedPlayerId);
    if (win) {
      triggerWinner(win);
    } else {
      // Continue to next night
      setRoundNumber(r => r + 1);
      startNightPhase();
    }
  };

  const triggerWinner = (win: 'MAFIA' | 'CITIZENS' | 'JOKER') => {
    setWinner(win);
    setStep('GAME_OVER');
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // confetti fallback
    }
    sound.speakArabic(
      win === 'MAFIA'
        ? 'انتصرت المافيا بالكامل وسيطرت على البلدة!'
        : win === 'CITIZENS'
        ? 'انتصر المواطنون الصالحون وطهروا البلدة من المجرمين!'
        : 'فاز المهرج الجوكر بخدعته العبقرية!'
    );
  };

  const alivePlayers = players.filter(p => p.isAlive);
  const mafiaCount = players.filter(p => p.isAlive && (p.role === 'MAFIA' || p.role === 'MAFIA_DON')).length;
  const citizensCount = players.filter(p => p.isAlive && p.role !== 'MAFIA' && p.role !== 'MAFIA_DON').length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Step 1: SETUP */}
      {step === 'SETUP' && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30">
              مجلس واحد • هاتف واحد يتنقل بينكم
            </span>
            <h2 className="text-3xl font-black text-white">إعداد لعبة المافيا الأوفلاين</h2>
            <p className="text-sm text-zinc-400">
              أدخل أسماء اللاعبين (يبدأ من 3 أشخاص)، وزّع البطاقات سراً، ودع الراوي يقود الجلسة
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-zinc-400">نماذج سريعة:</span>
            {[3, 4, 5, 6, 8].map(num => (
              <button
                key={num}
                onClick={() => handleLoadSampleNames(num)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  playerNames.length === num
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {num} لاعبين
              </button>
            ))}
          </div>

          {/* Add Player Input */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
                placeholder="اسم اللاعب الجديد..."
                aria-label="اسم اللاعب الجديد"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                onClick={handleAddPlayer}
                disabled={!newName.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </div>

            {/* Players List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {playerNames.map((name, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{AVATARS[idx % AVATARS.length]}</span>
                    <span className="text-sm font-bold text-zinc-200">{name}</span>
                  </div>
                  {playerNames.length > 3 && (
                    <button
                      onClick={() => handleRemovePlayer(idx)}
                      title="حذف اللاعب"
                      aria-label={`حذف اللاعب ${name}`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {playerNames.length < 3 && (
              <p className="text-xs text-amber-400">⚠️ يجب توفر 3 لاعبين على الأقل لبدء اللعبة.</p>
            )}
          </div>

          {/* Role Configuration */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              <span>تخصيص الأدوار الإضافية:</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                <input
                  type="checkbox"
                  checked={includeDoctor}
                  onChange={e => setIncludeDoctor(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs font-bold text-zinc-200">الطبيب 🩺</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                <input
                  type="checkbox"
                  checked={includeDetective}
                  onChange={e => setIncludeDetective(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs font-bold text-zinc-200">المحقق 🔍</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                <input
                  type="checkbox"
                  checked={includeBodyguard}
                  onChange={e => setIncludeBodyguard(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs font-bold text-zinc-200">الحارس 🛡️</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                <input
                  type="checkbox"
                  checked={includeJoker}
                  onChange={e => setIncludeJoker(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs font-bold text-zinc-200">الجوكر 🎭</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={playerNames.length < 3}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 text-white font-black text-lg shadow-xl shadow-red-950/60 flex items-center justify-center gap-3 transition-all active:scale-98"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ابدأ توزيع البطاقات السرية ({playerNames.length} لاعبين)</span>
          </button>
        </div>
      )}

      {/* Step 2: REVEAL_CARDS (Pass & Play) */}
      {step === 'REVEAL_CARDS' && players[revealIndex] && (
        <div className="space-y-6 text-center max-w-md mx-auto">
          <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-bold">
            <span>توزيع الأدوار</span>
            <span>اللاعب {revealIndex + 1} من {players.length}</span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
            <p className="text-xs text-zinc-400 mb-1">مرر الهاتف الآن إلى:</p>
            <h2 className="text-3xl font-black text-white">{players[revealIndex].name}</h2>
          </div>

          <RoleCard
            role={players[revealIndex].role}
            playerName={players[revealIndex].name}
            isRevealed={cardRevealed}
            onRevealToggle={() => setCardRevealed(!cardRevealed)}
          />

          {cardRevealed && (
            <button
              onClick={handleNextReveal}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 text-white font-bold text-sm shadow-md transition-all active:scale-98"
            >
              {revealIndex + 1 < players.length
                ? 'فهمت دوري! إخفاء وتمرير الهاتف للاعب التالي ➔'
                : 'الجميع استلم بطاقته! ابدأ الليل والظلام 🌙'}
            </button>
          )}
        </div>
      )}

      {/* Step 3: NIGHT_MAFIA */}
      {step === 'NIGHT_MAFIA' && (
        <div className="space-y-6 max-w-lg mx-auto bg-zinc-900 border border-red-950/80 rounded-2xl p-6 shadow-2xl">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800">
              <Moon className="w-3.5 h-3.5" />
              <span>الليلة {roundNumber} • وقت المافيا</span>
            </span>
            <h2 className="text-2xl font-black text-white">المافيا تختار ضحيتها</h2>
            <p className="text-xs text-zinc-400">
              مرر الهاتف للمافيا سراً أو يقوم الراوي بتسجيل الاختيار
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">من تريد المافيا اغتياله؟</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setMafiaTargetId(p.id)}
                  className={`p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                    mafiaTargetId === p.id
                      ? 'bg-red-950 border-red-500 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.avatar}</span>
                    <span className="text-sm font-bold">{p.name}</span>
                  </div>
                  {mafiaTargetId === p.id && <Skull className="w-4 h-4 text-red-500" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleConfirmMafiaChoice}
            disabled={!mafiaTargetId}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-red-950 transition-all"
          >
            تأكيد قرار المافيا والانتقال للخطوة التالية ➔
          </button>
        </div>
      )}

      {/* Step 4: NIGHT_DOCTOR */}
      {step === 'NIGHT_DOCTOR' && (
        <div className="space-y-6 max-w-lg mx-auto bg-zinc-900 border border-emerald-950/80 rounded-2xl p-6 shadow-2xl">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Cross className="w-3.5 h-3.5" />
              <span>الليلة {roundNumber} • وقت الطبيب</span>
            </span>
            <h2 className="text-2xl font-black text-white">الطبيب يختار من يحميه</h2>
            <p className="text-xs text-zinc-400">
              إذا اختار الطبيب نفس الشخص الذي استهدفته المافيا سينجو من الموت!
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">اختر من تريد حمايته:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setDoctorProtectId(p.id)}
                  className={`p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                    doctorProtectId === p.id
                      ? 'bg-emerald-950 border-emerald-500 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.avatar}</span>
                    <span className="text-sm font-bold">{p.name}</span>
                  </div>
                  {doctorProtectId === p.id && <Shield className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleConfirmDoctorChoice}
            disabled={!doctorProtectId}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-emerald-950 transition-all"
          >
            تأكيد حماية الطبيب ➔
          </button>
        </div>
      )}

      {/* Step 5: NIGHT_DETECTIVE */}
      {step === 'NIGHT_DETECTIVE' && (
        <div className="space-y-6 max-w-lg mx-auto bg-zinc-900 border border-blue-950/80 rounded-2xl p-6 shadow-2xl">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-400 border border-blue-800">
              <Search className="w-3.5 h-3.5" />
              <span>الليلة {roundNumber} • وقت المحقق</span>
            </span>
            <h2 className="text-2xl font-black text-white">المحقق يتحرى عن المشتبه به</h2>
            <p className="text-xs text-zinc-400">
              المحقق يفحص لاعباً واحداً ليعرف هل هو مافيا أم مواطن
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">اختر من تريد التفتيش عنه:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleDetectiveInspect(p.id)}
                  className={`p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                    detectiveInvestigateId === p.id
                      ? 'bg-blue-950 border-blue-500 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.avatar}</span>
                    <span className="text-sm font-bold">{p.name}</span>
                  </div>
                  <Search className="w-4 h-4 text-blue-400" />
                </button>
              ))}
            </div>
          </div>

          {detectiveFeedback && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/50 text-center font-bold text-sm text-blue-200 animate-in fade-in">
              {detectiveFeedback}
            </div>
          )}

          <button
            onClick={resolveNight}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-950 transition-all"
          >
            إنهاء الليل وشروق الصباح ☀️
          </button>
        </div>
      )}

      {/* Step 6: DAY_DAWN */}
      {step === 'DAY_DAWN' && (
        <div className="space-y-6 max-w-lg mx-auto bg-zinc-900 border border-amber-950/80 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Sun className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">صباح الجولة {roundNumber}</span>
            <h2 className="text-3xl font-black text-white">أشرق الصباح على البلدة!</h2>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm leading-relaxed text-zinc-200">
              {dawnReport}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400 block">الأحياء المتبقون:</span>
              <span className="text-lg font-black text-white">{alivePlayers.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400 block">المستبعدون:</span>
              <span className="text-lg font-black text-red-400">
                {players.length - alivePlayers.length}
              </span>
            </div>
          </div>

          <button
            onClick={startDayDiscussion}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-zinc-950 font-black text-sm shadow-lg shadow-amber-950/40 transition-all active:scale-98"
          >
            بدء نقاش أهل البلدة والمؤقت 🗣️
          </button>
        </div>
      )}

      {/* Step 7: DAY_DISCUSSION */}
      {step === 'DAY_DISCUSSION' && (
        <div className="space-y-6 max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">مرحلة النقاش والتحقيق</h3>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {Math.floor(discussionTimer / 60)}:
              {(discussionTimer % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            <h4 className="text-xs font-bold text-zinc-400">تعليمات النقاش:</h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              كل شخص يتحدث عن شكوكه ودفاعه. على المافيا الادعاء بأنهم مواطنون أبرياء، وعلى المحقق والطبيب تقديم التلميحات دون كشف أنفسهم مبكراً للمافيا!
            </p>
          </div>

          {/* Quick Timer Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all"
            >
              {isTimerRunning ? 'إيقاف مؤقت ⏸️' : 'تشغيل المؤقت ▶️'}
            </button>
            <button
              onClick={() => setDiscussionTimer(t => t + 30)}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all"
            >
              +30 ثانية ⏱️
            </button>
          </div>

          <button
            onClick={startVoting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm shadow-lg shadow-red-950 transition-all active:scale-98"
          >
            الانتقال للتصويت وإقامة المشنقة ⚖️
          </button>
        </div>
      )}

      {/* Step 8: DAY_VOTING */}
      {step === 'DAY_VOTING' && (
        <div className="space-y-6 max-w-xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-white">التصويت العلني لأهل البلدة</h3>
            <p className="text-xs text-zinc-400">سجل أصوات اللاعبين الأحياء لاختيار من يتم إعدامه اليوم</p>
          </div>

          <div className="space-y-3">
            {alivePlayers.map(voter => (
              <div
                key={voter.id}
                className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xl">{voter.avatar}</span>
                  <span className="text-sm font-bold text-zinc-200">{voter.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                  {alivePlayers
                    .filter(t => t.id !== voter.id)
                    .map(target => (
                      <button
                        key={target.id}
                        onClick={() => setVotes({ ...votes, [voter.id]: target.id })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          votes[voter.id] === target.id
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {target.name}
                      </button>
                    ))}
                  <button
                    onClick={() => setVotes({ ...votes, [voter.id]: 'SKIP' })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      votes[voter.id] === 'SKIP'
                        ? 'bg-zinc-700 border-zinc-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    امتناع
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleVoteSubmit}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm shadow-xl shadow-red-950 transition-all active:scale-98"
          >
            فرز الأصوات وتنفيذ الحكم 🔨
          </button>
        </div>
      )}

      {/* Step 9: GAME_OVER */}
      {step === 'GAME_OVER' && (
        <div className="space-y-6 max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-4xl shadow-inner">
            {winner === 'MAFIA' ? '🩸' : winner === 'CITIZENS' ? '🏆' : '🎭'}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">نهاية اللعبة</span>
            <h2 className="text-3xl font-black text-white">
              {winner === 'MAFIA'
                ? 'انتصرت المافيا!'
                : winner === 'CITIZENS'
                ? 'انتصر المواطنون الصالحون!'
                : 'فاز الجوكر!'}
            </h2>
            <p className="text-xs text-zinc-300">
              {winner === 'MAFIA'
                ? 'نجحت عصابة المافيا في السيطرة على المدينة بالكامل.'
                : winner === 'CITIZENS'
                ? 'تم القضاء على جميع أفراد المافيا وعاد السلام للبلدة.'
                : 'نجح الجوكر في خداع الجميع وشنقه ليفوز بالجولة!'}
            </p>
          </div>

          {/* Reveal All Roles */}
          <div className="space-y-2 text-right">
            <h4 className="text-xs font-bold text-zinc-400">كشف جميع الأدوار الحقيقية:</h4>
            <div className="grid grid-cols-1 gap-2">
              {players.map(p => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.avatar}</span>
                    <span className="text-sm font-bold text-white">{p.name}</span>
                    {!p.isAlive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                        مستبعد
                      </span>
                    )}
                  </div>
                  <RoleCard role={p.role} compact />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep('SETUP')}
            className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>لعب جولة جديدة</span>
          </button>
        </div>
      )}
    </div>
  );
};
