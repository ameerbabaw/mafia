import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  RoleType,
  calculateRoleDistribution,
  shuffleArray,
  resolveNightActions,
  resolveDayVoting,
  checkGameWinner,
  ROLES,
} from './src/game/mafiaRules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  isAlive: boolean;
  role: RoleType | null;
  secretRevealed: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isMafiaOnly?: boolean;
}

export type GamePhase =
  | 'LOBBY'
  | 'DEALING'
  | 'NIGHT'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTING'
  | 'DAY_DEFENSE'
  | 'GAME_OVER';

export interface RoomSettings {
  discussionTime: number; // in seconds
  votingTime: number;
  defenseTime: number;
  includeDoctor: boolean;
  includeDetective: boolean;
  includeBodyguard: boolean;
  includeJoker: boolean;
  mafiaCount: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  status: GamePhase;
  roundNumber: number;
  phaseDeadline: number | null;
  nightStep: 'MAFIA' | 'DOCTOR' | 'DETECTIVE' | 'BODYGUARD' | 'NIGHT_END';
  nightActions: {
    mafiaTargetId?: string | null;
    doctorProtectId?: string | null;
    detectiveInvestigateId?: string | null;
    bodyguardSnipeId?: string | null;
  };
  detectiveLastResult?: {
    targetId: string;
    isMafia: boolean;
    roleNameAr: string;
  } | null;
  dayVotes: Record<string, string>; // voterId -> targetId or 'SKIP'
  accusedPlayerId: string | null;
  gameHistory: string[];
  winner: 'MAFIA' | 'CITIZENS' | 'JOKER' | null;
  settings: RoomSettings;
  chatMessages: ChatMessage[];
  lastActivity: number;
}

const rooms = new Map<string, RoomState>();
const clientSockets = new Map<string, Set<WebSocket>>(); // roomCode -> Set<WebSocket>
const socketMeta = new WeakMap<WebSocket, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const BOT_NAMES = [
  'فهد الذكي',
  'سارة المحققة',
  'عمر الغامض',
  'نورة الحكيمة',
  'خالد الشجاع',
  'ريم الهادئة',
  'زياد المترقب',
  'منى الدقيقة',
];

const BOT_AVATARS = ['🕵️', '🎩', '🐺', '🩺', '🛡️', '🎭', '⚖️', '👤'];

function getMaskedRoomState(room: RoomState, requesterId?: string): unknown {
  const isHost = room.hostId === requesterId;
  const requester = room.players.find(p => p.id === requesterId);
  const isRequesterMafia = requester?.role === 'MAFIA' || requester?.role === 'MAFIA_DON';
  const isGameOver = room.status === 'GAME_OVER';

  const maskedPlayers = room.players.map(p => {
    // Show role if game is over, or it's self, or both are mafia members, or host in GM reveal
    const showRole =
      isGameOver ||
      p.id === requesterId ||
      (isRequesterMafia && (p.role === 'MAFIA' || p.role === 'MAFIA_DON'));

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isReady: p.isReady,
      isBot: p.isBot,
      isAlive: p.isAlive,
      role: showRole ? p.role : null,
      secretRevealed: p.secretRevealed,
    };
  });

  // Filter chat messages: mafia chat is only visible to mafia or after game over
  const visibleMessages = room.chatMessages.filter(msg => {
    if (!msg.isMafiaOnly) return true;
    return isGameOver || isRequesterMafia;
  });

  // Detective result only visible to detective
  const showDetectiveResult =
    requester?.role === 'DETECTIVE' || isGameOver ? room.detectiveLastResult : null;

  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    roundNumber: room.roundNumber,
    phaseDeadline: room.phaseDeadline,
    nightStep: room.nightStep,
    dayVotes: room.status === 'DAY_VOTING' || isGameOver ? room.dayVotes : {},
    accusedPlayerId: room.accusedPlayerId,
    gameHistory: room.gameHistory,
    winner: room.winner,
    settings: room.settings,
    players: maskedPlayers,
    chatMessages: visibleMessages,
    detectiveLastResult: showDetectiveResult,
    myPlayerId: requesterId,
    isHost,
  };
}

function broadcastRoom(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const sockets = clientSockets.get(roomCode);
  if (!sockets) return;

  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      const meta = socketMeta.get(ws);
      const payload = {
        type: 'ROOM_UPDATE',
        room: getMaskedRoomState(room, meta?.playerId),
      };
      ws.send(JSON.stringify(payload));
    }
  }
}

// REST Endpoints
app.post('/api/rooms', (req: Request, res: Response) => {
  const { hostName, avatar } = req.body;
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const hostPlayer: Player = {
    id: 'host_' + Math.random().toString(36).substring(2, 9),
    name: hostName?.trim() || 'المضيف',
    avatar: avatar || '🎩',
    isHost: true,
    isReady: true,
    isBot: false,
    isAlive: true,
    role: null,
    secretRevealed: false,
  };

  const newRoom: RoomState = {
    code,
    hostId: hostPlayer.id,
    players: [hostPlayer],
    status: 'LOBBY',
    roundNumber: 0,
    phaseDeadline: null,
    nightStep: 'MAFIA',
    nightActions: {},
    dayVotes: {},
    accusedPlayerId: null,
    gameHistory: ['تم إنشاء الغرفة بنجاح. في انتظار اكتمال اللاعبين...'],
    winner: null,
    settings: {
      discussionTime: 60,
      votingTime: 30,
      defenseTime: 20,
      includeDoctor: true,
      includeDetective: true,
      includeBodyguard: false,
      includeJoker: false,
      mafiaCount: 1,
    },
    chatMessages: [
      {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: 'الراوي',
        text: `أهلاً بكم في غرفة المافيا ${code}! الحد الأدنى للبدء هو 3 لاعبين.`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ],
    lastActivity: Date.now(),
  };

  rooms.set(code, newRoom);

  res.json({
    roomCode: code,
    playerId: hostPlayer.id,
    room: getMaskedRoomState(newRoom, hostPlayer.id),
  });
});

app.post('/api/rooms/:code/join', (req: Request, res: Response) => {
  const { code } = req.params;
  const { playerName, avatar } = req.body;
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    return res.status(404).json({ error: 'الغرفة غير موجودة' });
  }

  if (room.status !== 'LOBBY') {
    return res.status(400).json({ error: 'اللعبة بدأت بالفعل في هذه الغرفة' });
  }

  if (room.players.length >= 18) {
    return res.status(400).json({ error: 'الغرفة ممتلئة بالكامل' });
  }

  const newPlayer: Player = {
    id: 'p_' + Math.random().toString(36).substring(2, 9),
    name: playerName?.trim() || `لاعب ${room.players.length + 1}`,
    avatar: avatar || '👤',
    isHost: false,
    isReady: false,
    isBot: false,
    isAlive: true,
    role: null,
    secretRevealed: false,
  };

  room.players.push(newPlayer);
  room.lastActivity = Date.now();
  room.chatMessages.push({
    id: 'msg_' + Date.now(),
    senderId: 'SYSTEM',
    senderName: 'الراوي',
    text: `انضم اللاعب ${newPlayer.name} إلى الغرفة!`,
    timestamp: Date.now(),
    isSystem: true,
  });

  broadcastRoom(room.code);

  res.json({
    roomCode: room.code,
    playerId: newPlayer.id,
    room: getMaskedRoomState(room, newPlayer.id),
  });
});

app.get('/api/rooms/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const playerId = req.query.playerId as string;
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    return res.status(404).json({ error: 'الغرفة غير موجودة' });
  }

  res.json({
    room: getMaskedRoomState(room, playerId),
  });
});

app.post('/api/rooms/:code/action', (req: Request, res: Response) => {
  const { code } = req.params;
  const { playerId, action, payload } = req.body;
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    return res.status(404).json({ error: 'الغرفة غير موجودة' });
  }

  const player = room.players.find(p => p.id === playerId);
  const isHost = room.hostId === playerId;
  room.lastActivity = Date.now();

  switch (action) {
    case 'TOGGLE_READY': {
      if (player) {
        player.isReady = !player.isReady;
      }
      break;
    }

    case 'ADD_BOT': {
      if (!isHost) return res.status(403).json({ error: 'فقط المضيف يمكنه إضافة لاعبين تجريبيين' });
      if (room.status !== 'LOBBY') return res.status(400).json({ error: 'لا يمكن إضافة لاعب أثناء اللعبة' });
      const botIndex = room.players.filter(p => p.isBot).length;
      const botName = BOT_NAMES[botIndex % BOT_NAMES.length] || `بوت ${botIndex + 1}`;
      const botAvatar = BOT_AVATARS[botIndex % BOT_AVATARS.length] || '🤖';
      const botPlayer: Player = {
        id: 'bot_' + Math.random().toString(36).substring(2, 9),
        name: botName,
        avatar: botAvatar,
        isHost: false,
        isReady: true,
        isBot: true,
        isAlive: true,
        role: null,
        secretRevealed: true,
      };
      room.players.push(botPlayer);
      break;
    }

    case 'REMOVE_PLAYER': {
      if (!isHost) return res.status(403).json({ error: 'فقط المضيف يمكنه طرد اللاعبين' });
      const targetId = payload?.targetPlayerId;
      if (targetId && targetId !== room.hostId) {
        room.players = room.players.filter(p => p.id !== targetId);
      }
      break;
    }

    case 'UPDATE_SETTINGS': {
      if (!isHost) return res.status(403).json({ error: 'فقط المضيف يمكنه تعديل الإعدادات' });
      room.settings = { ...room.settings, ...payload };
      break;
    }

    case 'START_GAME': {
      if (!isHost) return res.status(403).json({ error: 'فقط المضيف يمكنه بدء اللعبة' });
      if (room.players.length < 3) {
        return res.status(400).json({ error: 'الحد الأدنى للبدء هو 3 لاعبين' });
      }

      // Distribute roles
      const rolesPool = calculateRoleDistribution(room.players.length, {
        includeDoctor: room.settings.includeDoctor,
        includeDetective: room.settings.includeDetective,
        includeBodyguard: room.settings.includeBodyguard,
        includeJoker: room.settings.includeJoker,
        mafiaCount: room.settings.mafiaCount,
      });

      const shuffledRoles = shuffleArray(rolesPool);

      room.players.forEach((p, idx) => {
        p.role = shuffledRoles[idx];
        p.isAlive = true;
        p.secretRevealed = p.isBot; // bots automatically know
      });

      room.roundNumber = 1;
      room.status = 'DEALING';
      room.nightActions = {};
      room.dayVotes = {};
      room.winner = null;
      room.gameHistory = ['بدأت اللعبة! تم توزيع البطاقات السرية على الجميع.'];
      room.chatMessages.push({
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: 'الراوي',
        text: 'بدأت اللعبة! تفقد بطاقتك السرية واحذر من الفضوليين.',
        timestamp: Date.now(),
        isSystem: true,
      });
      break;
    }

    case 'PROCEED_TO_NIGHT': {
      if (room.status === 'DEALING' || room.status === 'LOBBY') {
        room.status = 'NIGHT';
        room.nightStep = 'MAFIA';
        room.nightActions = {};
        room.phaseDeadline = Date.now() + 35000;
        room.gameHistory.push(`الليلة ${room.roundNumber}: حل الظلام على البلدة والجميع يغط في نوم عميق...`);
        room.chatMessages.push({
          id: 'sys_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: 'الراوي',
          text: `حل الظلام على البلدة في الليلة ${room.roundNumber}... المافيا تستيقظ الآن لاختيار الضحية!`,
          timestamp: Date.now(),
          isSystem: true,
        });

        // Auto execute bot night actions after small delay
        setTimeout(() => handleBotNightActions(room.code), 1200);
      }
      break;
    }

    case 'NIGHT_TARGET': {
      const { role, targetId } = payload;
      if (!player || !player.isAlive) return res.status(400).json({ error: 'اللاعب غير متاح' });

      if (role === 'MAFIA' || role === 'MAFIA_DON') {
        room.nightActions.mafiaTargetId = targetId;
        room.chatMessages.push({
          id: 'mafia_' + Date.now(),
          senderId: player.id,
          senderName: player.name,
          text: `🎯 اتفقت المافيا على استهداف اللاعب: ${room.players.find(p => p.id === targetId)?.name || 'أحدهم'}`,
          timestamp: Date.now(),
          isMafiaOnly: true,
        });
      } else if (role === 'DOCTOR') {
        room.nightActions.doctorProtectId = targetId;
      } else if (role === 'DETECTIVE') {
        room.nightActions.detectiveInvestigateId = targetId;
        const target = room.players.find(p => p.id === targetId);
        if (target) {
          const isMafia = target.role === 'MAFIA' || target.role === 'MAFIA_DON';
          room.detectiveLastResult = {
            targetId,
            isMafia,
            roleNameAr: isMafia ? 'عضو مافيا مجرم!' : 'مواطن بريء شريف',
          };
        }
      } else if (role === 'BODYGUARD') {
        room.nightActions.bodyguardSnipeId = targetId;
      }
      break;
    }

    case 'RESOLVE_NIGHT': {
      if (!isHost && room.status !== 'NIGHT') {
        return res.status(403).json({ error: 'غير مصرح' });
      }

      const aliveRoles = room.players
        .filter(p => p.isAlive)
        .map(p => ({ id: p.id, role: p.role! }));

      const resolution = resolveNightActions({
        mafiaTargetId: room.nightActions.mafiaTargetId,
        doctorProtectId: room.nightActions.doctorProtectId,
        detectiveInvestigateId: room.nightActions.detectiveInvestigateId,
        bodyguardSnipeId: room.nightActions.bodyguardSnipeId,
        alivePlayers: aliveRoles,
      });

      // Apply deaths
      resolution.killedPlayerIds.forEach(id => {
        const victim = room.players.find(p => p.id === id);
        if (victim) {
          victim.isAlive = false;
        }
      });

      room.gameHistory.push(resolution.narrativeAr);

      // Check win condition
      const winner = checkGameWinner(
        room.players.map(p => ({ id: p.id, role: p.role!, isAlive: p.isAlive }))
      );

      if (winner) {
        room.winner = winner;
        room.status = 'GAME_OVER';
        room.gameHistory.push(
          winner === 'MAFIA' ? 'انتصرت المافيا وسيطرت على المدينة بالكامل!' : 'انتصر المواطنون الصالحون وطهروا البلدة من المجرمين!'
        );
      } else {
        // Move to Day Discussion
        room.status = 'DAY_DISCUSSION';
        room.phaseDeadline = Date.now() + room.settings.discussionTime * 1000;
        room.chatMessages.push({
          id: 'sys_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: 'الراوي',
          text: resolution.killedPlayerIds.length > 0
            ? `أشرق الصباح بحزن! سقط ${resolution.killedPlayerIds.map(id => room.players.find(p => p.id === id)?.name).join(', ')} قتيلاً في الليل.`
            : 'أشرق الصباح بسلام! لم يُقتل أحد في هذه الليلة بفضل الله ثم الطبيب.',
          timestamp: Date.now(),
          isSystem: true,
        });
      }
      break;
    }

    case 'START_VOTING': {
      if (room.status === 'DAY_DISCUSSION') {
        room.status = 'DAY_VOTING';
        room.dayVotes = {};
        room.phaseDeadline = Date.now() + room.settings.votingTime * 1000;
        room.chatMessages.push({
          id: 'sys_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: 'الراوي',
          text: 'بدأت مرحلة التصويت العلني! اختاروا من ترونه مذنباً أو تخطوا التصويت.',
          timestamp: Date.now(),
          isSystem: true,
        });

        // Trigger bot votes
        setTimeout(() => handleBotVotes(room.code), 2000);
      }
      break;
    }

    case 'CAST_VOTE': {
      if (room.status !== 'DAY_VOTING') return res.status(400).json({ error: 'التصويت غير متاح الآن' });
      if (!player || !player.isAlive) return res.status(400).json({ error: 'فقط الأحياء يصوتون' });
      const targetId = payload?.targetPlayerId;
      room.dayVotes[playerId] = targetId;
      break;
    }

    case 'RESOLVE_DAY_VOTING': {
      if (room.status !== 'DAY_VOTING') return res.status(400).json({ error: 'غير متاح' });
      const alivePlayerIds = room.players.filter(p => p.isAlive).map(p => p.id);
      const voteResult = resolveDayVoting({
        votes: room.dayVotes,
        alivePlayerIds,
      });

      if (voteResult.eliminatedPlayerId) {
        const condemned = room.players.find(p => p.id === voteResult.eliminatedPlayerId);
        if (condemned) {
          condemned.isAlive = false;
          room.gameHistory.push(`قررت البلدة إعدام ${condemned.name}. وكان دوره: ${ROLES[condemned.role!].nameAr}`);
          room.chatMessages.push({
            id: 'sys_' + Date.now(),
            senderId: 'SYSTEM',
            senderName: 'الراوي',
            text: `تم تنفيذ حكم الإعدام بحق ${condemned.name}! والدور كان: ${ROLES[condemned.role!].nameAr}.`,
            timestamp: Date.now(),
            isSystem: true,
          });
        }
      } else {
        room.gameHistory.push(voteResult.narrativeAr);
        room.chatMessages.push({
          id: 'sys_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: 'الراوي',
          text: voteResult.narrativeAr,
          timestamp: Date.now(),
          isSystem: true,
        });
      }

      // Check win condition
      const winner = checkGameWinner(
        room.players.map(p => ({ id: p.id, role: p.role!, isAlive: p.isAlive })),
        voteResult.eliminatedPlayerId
      );

      if (winner) {
        room.winner = winner;
        room.status = 'GAME_OVER';
      } else {
        // Next Night!
        room.roundNumber += 1;
        room.status = 'NIGHT';
        room.nightStep = 'MAFIA';
        room.nightActions = {};
        room.dayVotes = {};
        room.phaseDeadline = Date.now() + 35000;
        room.chatMessages.push({
          id: 'sys_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: 'الراوي',
          text: `حل الليل مجدداً في الجولة ${room.roundNumber}... ناموا يا أهل البلدة.`,
          timestamp: Date.now(),
          isSystem: true,
        });

        setTimeout(() => handleBotNightActions(room.code), 1500);
      }
      break;
    }

    case 'SEND_CHAT': {
      const { text, isMafiaOnly } = payload;
      if (!text || !player) return res.status(400).json({ error: 'الرسالة فارغة' });
      room.chatMessages.push({
        id: 'msg_' + Date.now() + Math.random().toString(36).substring(2, 5),
        senderId: player.id,
        senderName: player.name,
        text: text.trim(),
        timestamp: Date.now(),
        isMafiaOnly: !!isMafiaOnly,
      });
      break;
    }

    case 'RESET_GAME': {
      if (!isHost) return res.status(403).json({ error: 'فقط المضيف يمكنه إعادة تعيين اللعبة' });
      room.status = 'LOBBY';
      room.roundNumber = 0;
      room.nightActions = {};
      room.dayVotes = {};
      room.winner = null;
      room.detectiveLastResult = null;
      room.players.forEach(p => {
        p.role = null;
        p.isAlive = true;
        p.isReady = p.isBot;
        p.secretRevealed = false;
      });
      room.chatMessages.push({
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: 'الراوي',
        text: 'تمت إعادة ضبط اللعبة إلى بهو الانتظار لجولة جديدة!',
        timestamp: Date.now(),
        isSystem: true,
      });
      break;
    }
  }

  broadcastRoom(room.code);
  res.json({ success: true, room: getMaskedRoomState(room, playerId) });
});

// Helper for Bot actions during Night
function handleBotNightActions(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'NIGHT') return;

  const alivePlayers = room.players.filter(p => p.isAlive);
  const botMafia = alivePlayers.filter(p => p.isBot && (p.role === 'MAFIA' || p.role === 'MAFIA_DON'));
  const botDoctor = alivePlayers.find(p => p.isBot && p.role === 'DOCTOR');
  const botDetective = alivePlayers.find(p => p.isBot && p.role === 'DETECTIVE');

  // If mafia hasn't picked target, pick non-mafia
  if (botMafia.length > 0 && !room.nightActions.mafiaTargetId) {
    const targets = alivePlayers.filter(p => p.role !== 'MAFIA' && p.role !== 'MAFIA_DON');
    if (targets.length > 0) {
      const pick = targets[Math.floor(Math.random() * targets.length)];
      room.nightActions.mafiaTargetId = pick.id;
    }
  }

  // Doctor bot heals
  if (botDoctor && !room.nightActions.doctorProtectId) {
    const healPick = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    if (healPick) room.nightActions.doctorProtectId = healPick.id;
  }

  // Detective bot inspects
  if (botDetective && !room.nightActions.detectiveInvestigateId) {
    const inspectCandidates = alivePlayers.filter(p => p.id !== botDetective.id);
    if (inspectCandidates.length > 0) {
      const inspectPick = inspectCandidates[Math.floor(Math.random() * inspectCandidates.length)];
      room.nightActions.detectiveInvestigateId = inspectPick.id;
    }
  }

  broadcastRoom(roomCode);
}

// Helper for Bot votes during Day
function handleBotVotes(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'DAY_VOTING') return;

  const alivePlayers = room.players.filter(p => p.isAlive);
  const botPlayers = alivePlayers.filter(p => p.isBot);

  botPlayers.forEach(bot => {
    if (!room.dayVotes[bot.id]) {
      const otherPlayers = alivePlayers.filter(p => p.id !== bot.id);
      if (otherPlayers.length > 0) {
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        room.dayVotes[bot.id] = target.id;
      } else {
        room.dayVotes[bot.id] = 'SKIP';
      }
    }
  });

  broadcastRoom(roomCode);
}

async function startServer() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'JOIN_ROOM') {
          const roomCode = (data.roomCode || '').toUpperCase();
          const playerId = data.playerId;
          socketMeta.set(ws, { roomCode, playerId });

          if (!clientSockets.has(roomCode)) {
            clientSockets.set(roomCode, new Set());
          }
          clientSockets.get(roomCode)!.add(ws);

          const room = rooms.get(roomCode);
          if (room) {
            ws.send(JSON.stringify({
              type: 'ROOM_UPDATE',
              room: getMaskedRoomState(room, playerId),
            }));
          }
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    });

    ws.on('close', () => {
      const meta = socketMeta.get(ws);
      if (meta?.roomCode) {
        clientSockets.get(meta.roomCode)?.delete(ws);
      }
    });
  });

  // Setup Vite in development or static serve in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Mafia Game server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
