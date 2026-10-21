import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { OnlineRoomData } from '../types/game.ts';
import { ROLES, RoleType } from '../game/mafiaRules.ts';
import { RoleCard } from './RoleCard.tsx';
import { sound } from '../utils/audioEngine.ts';
import {
  Users,
  Copy,
  Check,
  Play,
  RotateCcw,
  Shield,
  Skull,
  Cross,
  Search,
  MessageSquare,
  Send,
  UserPlus,
  UserMinus,
  Settings,
  Clock,
  Sun,
  Moon,
  Sparkles,
  Crown,
  Volume2,
} from 'lucide-react';

const AVATAR_OPTIONS = ['🕵️', '🎩', '🐺', '🩺', '🛡️', '🎭', '⚖️', '👤', '🦁', '🦅'];

export const OnlineGame: React.FC = () => {
  // Lobby join/create state
  const [hostName, setHostName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🕵️');
  const [copiedLink, setCopiedLink] = useState(false);

  // Active Session state
  const [roomData, setRoomData] = useState<OnlineRoomData | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-Game UI state
  const [chatInput, setChatInput] = useState('');
  const [isSecretCardFlipped, setIsSecretCardFlipped] = useState(false);
  const [selectedNightTarget, setSelectedNightTarget] = useState<string | null>(null);
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Read URL query params on mount for direct room invite link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('room');
      if (codeParam) {
        setJoinCode(codeParam.toUpperCase());
      }
    }
  }, []);

  // Setup WebSocket connection when roomCode and playerId are established
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode,
          playerId,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOM_UPDATE') {
          handleIncomingRoomUpdate(data.room);
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    };

    // Fallback polling every 2 seconds
    const pollInterval = setInterval(() => {
      fetchRoomState(roomCode, playerId);
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      ws.close();
    };
  }, [roomCode, playerId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [roomData?.chatMessages]);

  const handleIncomingRoomUpdate = (updatedRoom: OnlineRoomData) => {
    setRoomData(prev => {
      // Play sound on phase change
      if (prev && prev.status !== updatedRoom.status) {
        if (updatedRoom.status === 'NIGHT') {
          sound.playNightFall();
          sound.speakArabic(`حل الليل على البلدة في الجولة ${updatedRoom.roundNumber}. المافيا تستيقظ الآن!`);
        } else if (updatedRoom.status === 'DAY_DISCUSSION') {
          sound.playDawn();
          sound.speakArabic('أشرق الصباح على البلدة! استيقظوا جميعاً للنقاش.');
        } else if (updatedRoom.status === 'DAY_VOTING') {
          sound.speakArabic('بدأت مرحلة التصويت العلني! صوتوا على من تتهمونه.');
        } else if (updatedRoom.status === 'GAME_OVER') {
          try {
            confetti({ particleCount: 120, spread: 80 });
          } catch {}
          if (updatedRoom.winner === 'MAFIA') sound.playGunshot();
          else sound.playDawn();
        }
      }
      return updatedRoom;
    });
  };

  const fetchRoomState = async (code: string, pId: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}?playerId=${pId}`);
      if (res.ok) {
        const data = await res.json();
        handleIncomingRoomUpdate(data.room);
      }
    } catch {
      // ignore transient network glitch
    }
  };

  const sendRoomAction = async (action: string, payload: unknown = {}) => {
    if (!roomCode || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action, payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          handleIncomingRoomUpdate(data.room);
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'حدث خطأ');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch {
      setErrorMessage('فشل الاتصال بالخادم');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: hostName.trim() || 'المضيف',
          avatar: selectedAvatar,
        }),
      });
      const data = await res.json();
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setRoomData(data.room);
      sound.playCardFlip();
    } catch {
      setErrorMessage('تعذر إنشاء الغرفة. يرجى المحاولة ثانية.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cleanCode = joinCode.trim().toUpperCase();
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: joinName.trim() || 'لاعب',
          avatar: selectedAvatar,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoomCode(data.roomCode);
        setPlayerId(data.playerId);
        setRoomData(data.room);
        sound.playCardFlip();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'تعذر الانضمام للغرفة.');
      }
    } catch {
      setErrorMessage('فشل الاتصال بالغرفة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendChat = (e?: React.FormEvent, isMafiaOnly: boolean = false) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    sendRoomAction('SEND_CHAT', { text: chatInput, isMafiaOnly });
    setChatInput('');
  };

  const myPlayer = roomData?.players.find(p => p.id === playerId);
  const isHost = roomData?.hostId === playerId;
  const isMyMafia = myPlayer?.role === 'MAFIA' || myPlayer?.role === 'MAFIA_DON';
  const alivePlayers = roomData?.players.filter(p => p.isAlive) || [];

  // ================= VIEW 1: LOBBY ENTRY (Join / Create) =================
  if (!roomData || !roomCode) {
    return (
      <div className="max-w-xl mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-red-600/20 text-red-400 border border-red-500/30">
            <Users className="w-3.5 h-3.5" />
            <span>طور الأونلاين المباشر • غرف سريعة وتحكم كامل</span>
          </div>
          <h2 className="text-3xl font-black text-white">غرف المافيا العربية</h2>
          <p className="text-xs text-zinc-400">
            أنشئ غرفتك في ثوانٍ، شارك الكود مع أصدقائك، أو أضف بوتات للتجربة الفورية
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {/* Avatar Picker */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 text-center">
          <label className="text-xs font-bold text-zinc-300">اختر صورتك الرمزية:</label>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {AVATAR_OPTIONS.map(av => (
              <button
                key={av}
                onClick={() => setSelectedAvatar(av)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  selectedAvatar === av
                    ? 'bg-red-600 scale-110 shadow-lg shadow-red-900/50'
                    : 'bg-zinc-950 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create Room Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">إنشاء غرفة جديدة</h3>
              </div>
              <p className="text-xs text-zinc-400">ستكون أنت مضيف الغرفة وتتحكم بكافة الإعدادات</p>
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">اسمك المستعار:</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={e => setHostName(e.target.value)}
                  placeholder="مثال: زعيم المافيا"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-red-950 transition-all active:scale-98"
            >
              {isLoading ? 'جاري الإنشاء...' : 'إنشاء الغرفة الآن ➔'}
            </button>
          </div>

          {/* Join Room Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">الانضمام بكود الغرفة</h3>
              </div>
              <p className="text-xs text-zinc-400">أدخل كود الغرفة المكون من 4 خانات للبدء</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">اسمك المستعار:</label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                    placeholder="مثال: المحقق كونان"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">كود الغرفة:</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="مثال: MAF7"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white uppercase tracking-widest font-mono text-center placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={isLoading || !joinCode.trim()}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold text-sm shadow transition-all active:scale-98"
            >
              {isLoading ? 'جاري الدخول...' : 'دخول الغرفة ➔'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= VIEW 2: IN-ROOM LOBBY (WAITING FOR PLAYERS) =================
  if (roomData.status === 'LOBBY') {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header with Room Code & Invite Link */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 block">كود الغرفة للمشاركة:</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black font-mono tracking-widest text-white">
                  {roomData.code}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط الدعوة'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Host Quick Controls */}
          {isHost && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => sendRoomAction('ADD_BOT')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 transition-all active:scale-95"
                title="أضف لاعب روبوت لتجربة اللعبة فوراً دون انتظار"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>+ إضافة بوت تجريبي</span>
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>إعدادات الأدوار</span>
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {/* Players Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>اللاعبون المتصلون ({roomData.players.length})</span>
              <span className="text-xs text-zinc-400 font-normal">
                (يبدأ من 3 لاعبين كحد أدنى)
              </span>
            </h3>
            {roomData.players.length < 3 && (
              <span className="text-xs text-amber-400 font-bold">
                ⚠️ بحاجة لـ {3 - roomData.players.length} لاعبين إضافيين (يمكنك الضغط على "إضافة بوت")
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {roomData.players.map(p => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.avatar}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      {p.isHost && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                          المضيف 👑
                        </span>
                      )}
                      {p.isBot && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                          بوت 🤖
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {p.isReady ? 'جاهز ومستعد ✅' : 'في الانتظار...'}
                    </span>
                  </div>
                </div>

                {isHost && !p.isHost && (
                  <button
                    onClick={() => sendRoomAction('REMOVE_PLAYER', { targetPlayerId: p.id })}
                    title="طرد اللاعب"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start Game / Ready Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-400">
            {isHost ? (
              <span>بصفتك المضيف، يمكنك بدء توزيع البطاقات فور اكتمال 3 لاعبين أو أكثر.</span>
            ) : (
              <span>في انتظار قيام المضيف ببدء اللعبة...</span>
            )}
          </div>

          {isHost ? (
            <button
              onClick={() => sendRoomAction('START_GAME')}
              disabled={roomData.players.length < 3}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-red-950 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>بدء اللعبة وتوزيع البطاقات ➔</span>
            </button>
          ) : (
            <button
              onClick={() => sendRoomAction('TOGGLE_READY')}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                myPlayer?.isReady
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {myPlayer?.isReady ? 'أنا جاهز ومستعد ✓' : 'تحديد كـ جاهز للعب'}
            </button>
          )}
        </div>

        {/* Settings Modal for Host */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>إعدادات غرفة اللعب</span>
              </h3>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="font-bold text-zinc-200">تفعيل الطبيب 🩺</span>
                  <input
                    type="checkbox"
                    checked={roomData.settings.includeDoctor}
                    onChange={e =>
                      sendRoomAction('UPDATE_SETTINGS', { includeDoctor: e.target.checked })
                    }
                    className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="font-bold text-zinc-200">تفعيل المحقق 🔍</span>
                  <input
                    type="checkbox"
                    checked={roomData.settings.includeDetective}
                    onChange={e =>
                      sendRoomAction('UPDATE_SETTINGS', { includeDetective: e.target.checked })
                    }
                    className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="font-bold text-zinc-200">تفعيل الجوكر (المهرج) 🎭</span>
                  <input
                    type="checkbox"
                    checked={roomData.settings.includeJoker}
                    onChange={e =>
                      sendRoomAction('UPDATE_SETTINGS', { includeJoker: e.target.checked })
                    }
                    className="rounded text-red-600 bg-zinc-900 border-zinc-700"
                  />
                </label>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs"
                >
                  تم وحفظ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= VIEW 3: DEALING (SECRET CARD REVEAL) =================
  if (roomData.status === 'DEALING') {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6 text-center">
        <div className="space-y-1">
          <span className="text-xs font-bold text-red-500 uppercase">بدأت اللعبة!</span>
          <h2 className="text-2xl font-black text-white">بطاقتك السرية في هذه الجولة</h2>
          <p className="text-xs text-zinc-400">انقر لكشف هويتك دون أن يراك الآخرون</p>
        </div>

        {myPlayer?.role && (
          <RoleCard
            role={myPlayer.role}
            playerName={myPlayer.name}
            isRevealed={isSecretCardFlipped}
            onRevealToggle={() => setIsSecretCardFlipped(!isSecretCardFlipped)}
          />
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300">
          {isHost ? (
            <div className="space-y-3">
              <p>عندما يستعد الجميع، انقر للانتقال إلى مرحلة الليل والظلام:</p>
              <button
                onClick={() => sendRoomAction('PROCEED_TO_NIGHT')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 text-white font-bold text-sm shadow-lg shadow-red-950 transition-all active:scale-98"
              >
                الانتقال إلى الليل 🌙
              </button>
            </div>
          ) : (
            <p>في انتظار إشارة المضيف لبدء مرحلة الليل...</p>
          )}
        </div>
      </div>
    );
  }

  // ================= VIEW 4: NIGHT PHASE =================
  if (roomData.status === 'NIGHT') {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Night Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-950 text-indigo-400 border border-indigo-800">
            <Moon className="w-3.5 h-3.5" />
            <span>الليلة {roomData.roundNumber} • المدينة نائمة</span>
          </div>
          <h2 className="text-2xl font-black text-white">الظلام يسود البلدة</h2>
        </div>

        {/* Role-Specific Action Panel */}
        {myPlayer?.isAlive ? (
          isMyMafia ? (
            // MAFIA NIGHT VIEW
            <div className="bg-zinc-900 border border-red-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-red-950 pb-3">
                <Skull className="w-6 h-6 text-red-500" />
                <div>
                  <h3 className="text-lg font-bold text-white">اجتماع عصابة المافيا السري 🩸</h3>
                  <p className="text-xs text-zinc-400">
                    اتفقوا على الضحية المراد تصفيتها الليلة
                  </p>
                </div>
              </div>

              {/* Show fellow Mafia members */}
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-xs">
                <span className="font-bold text-red-400 block mb-1">أعضاء المافيا معك:</span>
                <div className="flex flex-wrap gap-2">
                  {roomData.players
                    .filter(p => p.role === 'MAFIA' || p.role === 'MAFIA_DON')
                    .map(m => (
                      <span
                        key={m.id}
                        className="px-2.5 py-1 rounded-lg bg-red-950 text-red-200 border border-red-800 font-bold"
                      >
                        {m.avatar} {m.name} {m.id === myPlayer.id ? '(أنت)' : ''}
                      </span>
                    ))}
                </div>
              </div>

              {/* Targets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">اختر الضحية المستهدفة:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {alivePlayers
                    .filter(p => p.role !== 'MAFIA' && p.role !== 'MAFIA_DON')
                    .map(target => (
                      <button
                        key={target.id}
                        onClick={() => {
                          setSelectedNightTarget(target.id);
                          sendRoomAction('NIGHT_TARGET', {
                            role: myPlayer.role,
                            targetId: target.id,
                          });
                        }}
                        className={`p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                          selectedNightTarget === target.id
                            ? 'bg-red-950 border-red-500 text-white font-bold'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{target.avatar}</span>
                          <span className="text-xs">{target.name}</span>
                        </div>
                        {selectedNightTarget === target.id && (
                          <Skull className="w-4 h-4 text-red-500" />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ) : myPlayer?.role === 'DOCTOR' ? (
            // DOCTOR NIGHT VIEW
            <div className="bg-zinc-900 border border-emerald-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-emerald-950 pb-3">
                <Cross className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">غرفة الطبيب 🩺</h3>
                  <p className="text-xs text-zinc-400">اختر شخصاً واحداً لحمايته من طلقات المافيا الليلة</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">من تريد حمايته الليلة؟</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {alivePlayers.map(target => (
                    <button
                      key={target.id}
                      onClick={() => {
                        setSelectedNightTarget(target.id);
                        sendRoomAction('NIGHT_TARGET', {
                          role: 'DOCTOR',
                          targetId: target.id,
                        });
                      }}
                      className={`p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                        selectedNightTarget === target.id
                          ? 'bg-emerald-950 border-emerald-500 text-white font-bold'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{target.avatar}</span>
                        <span className="text-xs">{target.name}</span>
                      </div>
                      {selectedNightTarget === target.id && (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : myPlayer?.role === 'DETECTIVE' ? (
            // DETECTIVE NIGHT VIEW
            <div className="bg-zinc-900 border border-blue-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-blue-950 pb-3">
                <Search className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">مكتب التحريات السري 🔍</h3>
                  <p className="text-xs text-zinc-400">اختر مشتبهاً به للكشف عما إذا كان ينتمي للمافيا</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">اختر شخصاً للتفتيش:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {alivePlayers
                    .filter(p => p.id !== myPlayer.id)
                    .map(target => (
                      <button
                        key={target.id}
                        onClick={() => {
                          setSelectedNightTarget(target.id);
                          sendRoomAction('NIGHT_TARGET', {
                            role: 'DETECTIVE',
                            targetId: target.id,
                          });
                        }}
                        className={`p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                          selectedNightTarget === target.id
                            ? 'bg-blue-950 border-blue-500 text-white font-bold'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{target.avatar}</span>
                          <span className="text-xs">{target.name}</span>
                        </div>
                        <Search className="w-4 h-4 text-blue-400" />
                      </button>
                    ))}
                </div>
              </div>

              {roomData.detectiveLastResult && (
                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/50 text-center font-bold text-sm text-blue-200">
                  نتيجة التحري: {roomData.detectiveLastResult.roleNameAr}
                </div>
              )}
            </div>
          ) : (
            // CITIZEN SLEEPING VIEW
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-3xl">
                🌙
              </div>
              <h3 className="text-xl font-bold text-white">أنت مواطن صالح ونائم بسلام</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                تنتظر طلوع الصباح لتسمع ما جرى وتشارك في النقاش والتصويت لكشف المجرمين.
              </p>
            </div>
          )
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-2">
            <span className="text-xs text-red-400 font-bold">طيف لاعب مستبعد</span>
            <p className="text-sm text-zinc-400">أنت تشاهد الأحداث بهدوء كشبح دون التدخل.</p>
          </div>
        )}

        {/* Host Early Night End Button */}
        {isHost && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-xs text-zinc-400">تحكم المضيف: هل اكتملت تحركات الليل؟</span>
            <button
              onClick={() => sendRoomAction('RESOLVE_NIGHT')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              إنهاء الليل وشروق الصباح ☀️
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= VIEW 5: DAY DISCUSSION & CHAT =================
  if (roomData.status === 'DAY_DISCUSSION') {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-amber-400 font-bold block">صباح الجولة {roomData.roundNumber}</span>
              <h2 className="text-xl font-black text-white">مرحلة النقاش وتبادل الشبهات</h2>
            </div>
          </div>

          {/* Host Voting Trigger Button */}
          {isHost && (
            <button
              onClick={() => sendRoomAction('START_VOTING')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition-all active:scale-95"
            >
              فتح باب التصويت العلني ⚖️
            </button>
          )}
        </div>

        {/* Live Chat & Discussion Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Alive Players Quick List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase">
              الأحياء في البلدة ({alivePlayers.length})
            </h3>
            <div className="space-y-1.5">
              {roomData.players.map(p => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    p.isAlive
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                      : 'bg-zinc-950/40 border-zinc-900 text-zinc-600 line-through'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{p.avatar}</span>
                    <span className="font-bold">{p.name}</span>
                  </div>
                  <span className={p.isAlive ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                    {p.isAlive ? 'حي' : 'مستبعد'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Stream */}
          <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col h-[400px]">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
              {roomData.chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl text-xs ${
                    msg.isSystem
                      ? 'bg-amber-950/30 border border-amber-900/40 text-amber-200 text-center font-bold'
                      : msg.isMafiaOnly
                      ? 'bg-red-950/40 border border-red-900/50 text-red-200'
                      : msg.senderId === playerId
                      ? 'bg-zinc-800 border border-zinc-700 text-white ml-auto max-w-[85%]'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-300 max-w-[85%]'
                  }`}
                >
                  {!msg.isSystem && (
                    <span className="font-bold block text-[11px] text-zinc-400 mb-0.5">
                      {msg.senderName} {msg.isMafiaOnly ? '🩸 [مافيا فقط]' : ''}
                    </span>
                  )}
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={e => handleSendChat(e)} className="flex gap-2 pt-3 border-t border-zinc-800">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="اكتب دليلك أو دافع عن نفسك..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ================= VIEW 6: DAY VOTING =================
  if (roomData.status === 'DAY_VOTING') {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-950 text-red-400 border border-red-800">
            <span>محكمة البلدة العلنية</span>
          </div>
          <h2 className="text-2xl font-black text-white">جلسة التصويت على الإعدام ⚖️</h2>
          <p className="text-xs text-zinc-400">صوت لاختيار المشتبه به الأول أو اختر الامتناع</p>
        </div>

        {myPlayer?.isAlive ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold text-zinc-300">اختر من تصوت ضده:</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {alivePlayers
                .filter(p => p.id !== myPlayer.id)
                .map(target => {
                  const voteCount = Object.values(roomData.dayVotes).filter(
                    v => v === target.id
                  ).length;
                  return (
                    <button
                      key={target.id}
                      onClick={() => {
                        setSelectedVoteTarget(target.id);
                        sendRoomAction('CAST_VOTE', { targetPlayerId: target.id });
                      }}
                      className={`p-3.5 rounded-xl border text-right flex items-center justify-between transition-all ${
                        selectedVoteTarget === target.id || roomData.dayVotes[myPlayer.id] === target.id
                          ? 'bg-red-950 border-red-500 text-white shadow'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{target.avatar}</span>
                        <span className="text-xs font-bold">{target.name}</span>
                      </div>
                      {voteCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">
                          {voteCount} أصوات
                        </span>
                      )}
                    </button>
                  );
                })}

              <button
                onClick={() => {
                  setSelectedVoteTarget('SKIP');
                  sendRoomAction('CAST_VOTE', { targetPlayerId: 'SKIP' });
                }}
                className={`p-3.5 rounded-xl border text-center transition-all col-span-2 ${
                  selectedVoteTarget === 'SKIP' || roomData.dayVotes[myPlayer.id] === 'SKIP'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-bold'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-500'
                }`}
              >
                الامتناع عن التصويت (تخطي)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400">
            أنت مستبعد ولا يمكنك التصويت.
          </div>
        )}

        {/* Host Resolve Day Voting Button */}
        {isHost && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs text-zinc-400">تحكم المضيف: هل أنهى الجميع التصويت؟</span>
            <button
              onClick={() => sendRoomAction('RESOLVE_DAY_VOTING')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 text-white font-bold text-xs shadow transition-all active:scale-95"
            >
              فرز الأصوات وتنفيذ الحكم 🔨
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= VIEW 7: GAME OVER =================
  if (roomData.status === 'GAME_OVER') {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-4xl shadow-inner">
          {roomData.winner === 'MAFIA' ? '🩸' : roomData.winner === 'CITIZENS' ? '🏆' : '🎭'}
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">نهاية المعركة</span>
          <h2 className="text-3xl font-black text-white">
            {roomData.winner === 'MAFIA'
              ? 'انتصرت المافيا!'
              : roomData.winner === 'CITIZENS'
              ? 'انتصر المواطنون الصالحون!'
              : 'فاز الجوكر!'}
          </h2>
        </div>

        {/* Full Role Reveal */}
        <div className="space-y-2 text-right">
          <h3 className="text-xs font-bold text-zinc-400">كشف كافة بطاقات اللاعبين:</h3>
          <div className="space-y-1.5">
            {roomData.players.map(p => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>{p.avatar}</span>
                  <span className="text-sm font-bold text-white">{p.name}</span>
                </div>
                {p.role && <RoleCard role={p.role} compact />}
              </div>
            ))}
          </div>
        </div>

        {/* Rematch button (Host or anyone) */}
        {isHost ? (
          <button
            onClick={() => sendRoomAction('RESET_GAME')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 text-white font-bold text-sm shadow-lg shadow-red-950 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة تعيين وبدء جولة جديدة ➔</span>
          </button>
        ) : (
          <p className="text-xs text-zinc-400">في انتظار المضيف لبدء جولة ثانية...</p>
        )}
      </div>
    );
  }

  return null;
};
