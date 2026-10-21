import { RoleType } from '../game/mafiaRules.ts';

export type AppMode = 'ONLINE' | 'OFFLINE_PASS_PLAY' | 'MODERATOR_TOOL';

export interface OfflinePlayer {
  id: string;
  name: string;
  role: RoleType;
  isAlive: boolean;
  avatar: string;
}

export interface OnlineRoomData {
  code: string;
  hostId: string;
  status:
    | 'LOBBY'
    | 'DEALING'
    | 'NIGHT'
    | 'DAY_DISCUSSION'
    | 'DAY_VOTING'
    | 'DAY_DEFENSE'
    | 'GAME_OVER';
  roundNumber: number;
  phaseDeadline: number | null;
  nightStep: 'MAFIA' | 'DOCTOR' | 'DETECTIVE' | 'BODYGUARD' | 'NIGHT_END';
  dayVotes: Record<string, string>;
  accusedPlayerId: string | null;
  gameHistory: string[];
  winner: 'MAFIA' | 'CITIZENS' | 'JOKER' | null;
  settings: {
    discussionTime: number;
    votingTime: number;
    defenseTime: number;
    includeDoctor: boolean;
    includeDetective: boolean;
    includeBodyguard: boolean;
    includeJoker: boolean;
    mafiaCount: number;
  };
  players: {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    isReady: boolean;
    isBot: boolean;
    isAlive: boolean;
    role: RoleType | null;
    secretRevealed: boolean;
  }[];
  chatMessages: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
    isMafiaOnly?: boolean;
  }[];
  detectiveLastResult?: {
    targetId: string;
    isMafia: boolean;
    roleNameAr: string;
  } | null;
  myPlayerId?: string;
  isHost?: boolean;
}
