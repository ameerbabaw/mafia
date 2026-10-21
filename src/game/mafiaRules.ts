/**
 * Core Mafia Game Rules & State Calculation
 * Pure decoupled functions for deterministic logic and testability
 */

export type RoleType =
  | 'MAFIA_DON'
  | 'MAFIA'
  | 'DOCTOR'
  | 'DETECTIVE'
  | 'BODYGUARD'
  | 'CITIZEN'
  | 'JOKER';

export type Team = 'MAFIA' | 'CITIZENS' | 'NEUTRAL';

export interface RoleInfo {
  type: RoleType;
  nameAr: string;
  subtitleAr: string;
  descriptionAr: string;
  team: Team;
  iconName: string;
  colorClass: string;
  accentHex: string;
  hasNightAction: boolean;
}

export const ROLES: Record<RoleType, RoleInfo> = {
  MAFIA_DON: {
    type: 'MAFIA_DON',
    nameAr: 'زعيم المافيا (العرّاب)',
    subtitleAr: 'قائد العصابة والمخطط الأول',
    descriptionAr: 'يستيقظ ليلاً مع أفراد المافيا لاختيار الضحية. صوته حاسم في حال تعادل اختيارات المافيا.',
    team: 'MAFIA',
    iconName: 'Crown',
    colorClass: 'text-rose-500 border-rose-500/30 bg-rose-950/20',
    accentHex: '#f43f5e',
    hasNightAction: true,
  },
  MAFIA: {
    type: 'MAFIA',
    nameAr: 'عضو مافيا',
    subtitleAr: 'منفذ العمليات السري',
    descriptionAr: 'تستيقظ ليلاً لاغتيال المواطنين. في النهار، تظاهر بأنك مواطن صالح وشتت الشبهات!',
    team: 'MAFIA',
    iconName: 'Skull',
    colorClass: 'text-red-500 border-red-500/30 bg-red-950/20',
    accentHex: '#ef4444',
    hasNightAction: true,
  },
  DOCTOR: {
    type: 'DOCTOR',
    nameAr: 'الطبيب',
    subtitleAr: 'حامي الأرواح',
    descriptionAr: 'يستيقظ ليلاً لاختيار شخص واحد لحمايته من رصاص المافيا. إذا حمى الضحية المستهدفة تنجو من الموت!',
    team: 'CITIZENS',
    iconName: 'Cross',
    colorClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
    accentHex: '#10b981',
    hasNightAction: true,
  },
  DETECTIVE: {
    type: 'DETECTIVE',
    nameAr: 'المحقق',
    subtitleAr: 'عين العدالة الساهرة',
    descriptionAr: 'يستيقظ ليلاً للتحري عن لاعب واحد ليكتشف هويته الحقيقية (مافيا أم مواطن صالح).',
    team: 'CITIZENS',
    iconName: 'Search',
    colorClass: 'text-blue-400 border-blue-500/30 bg-blue-950/20',
    accentHex: '#3b82f6',
    hasNightAction: true,
  },
  BODYGUARD: {
    type: 'BODYGUARD',
    nameAr: 'القناص / الحارس',
    subtitleAr: 'الدرع الواقي للبلدة',
    descriptionAr: 'يستيقظ ليلاً لحماية لاعب أو قنص مشتبه به حاسم.',
    team: 'CITIZENS',
    iconName: 'Shield',
    colorClass: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
    accentHex: '#f59e0b',
    hasNightAction: true,
  },
  CITIZEN: {
    type: 'CITIZEN',
    nameAr: 'مواطن صالح',
    subtitleAr: 'أمل البلدة في كشف الخونة',
    descriptionAr: 'ينام طوال الليل بسلام. في الصباح، يشارك في النقاشات، يحلل التصرفات، ويصوت لطرد المجرمين.',
    team: 'CITIZENS',
    iconName: 'User',
    colorClass: 'text-teal-400 border-teal-500/30 bg-teal-950/20',
    accentHex: '#14b8a6',
    hasNightAction: false,
  },
  JOKER: {
    type: 'JOKER',
    nameAr: 'المهرج (الجوكر)',
    subtitleAr: 'المخادع المستقل',
    descriptionAr: 'دوره الفوضى المطلقة! هدفه إقناع المواطنين بالتصويت عليه وشنقه في النهار ليفوز باللعبة منفرداً!',
    team: 'NEUTRAL',
    iconName: 'Sparkles',
    colorClass: 'text-purple-400 border-purple-500/30 bg-purple-950/20',
    accentHex: '#a855f7',
    hasNightAction: false,
  },
};

export interface RoleConfigOptions {
  includeDoctor?: boolean;
  includeDetective?: boolean;
  includeBodyguard?: boolean;
  includeJoker?: boolean;
  mafiaCount?: number;
}

/**
 * Distribute roles fairly based on player count (minimum 3 players)
 */
export function calculateRoleDistribution(
  playerCount: number,
  options: RoleConfigOptions = {}
): RoleType[] {
  if (playerCount < 3) {
    throw new Error('الحد الأدنى لعدد اللاعبين هو 3 أشخاص');
  }

  const roles: RoleType[] = [];

  // Determine Mafia count
  let mafiaCount = options.mafiaCount;
  if (mafiaCount === undefined || mafiaCount < 1) {
    if (playerCount <= 4) mafiaCount = 1;
    else if (playerCount <= 7) mafiaCount = 2;
    else if (playerCount <= 11) mafiaCount = 3;
    else mafiaCount = Math.floor(playerCount / 4) + 1;
  }
  // Cap mafia count so citizens start with majority
  mafiaCount = Math.min(mafiaCount, Math.floor((playerCount - 1) / 2));
  if (mafiaCount < 1) mafiaCount = 1;

  // Mafia Don is the primary mafia
  roles.push('MAFIA_DON');
  for (let i = 1; i < mafiaCount; i++) {
    roles.push('MAFIA');
  }

  // Doctor
  const wantDoctor = options.includeDoctor ?? true;
  if (wantDoctor && roles.length < playerCount) {
    roles.push('DOCTOR');
  }

  // Detective (Cop)
  const wantDetective = options.includeDetective ?? (playerCount >= 4);
  if (wantDetective && roles.length < playerCount) {
    roles.push('DETECTIVE');
  }

  // Bodyguard / Sniper
  const wantBodyguard = options.includeBodyguard ?? (playerCount >= 7);
  if (wantBodyguard && roles.length < playerCount) {
    roles.push('BODYGUARD');
  }

  // Joker (optional neutral)
  const wantJoker = options.includeJoker ?? (playerCount >= 8);
  if (wantJoker && roles.length < playerCount) {
    roles.push('JOKER');
  }

  // Fill remaining slots with Citizens
  while (roles.length < playerCount) {
    roles.push('CITIZEN');
  }

  return roles;
}

/**
 * Fisher-Yates shuffle array
 */
export function shuffleArray<T>(array: T[], seedRandom?: () => number): T[] {
  const arr = [...array];
  const rand = seedRandom || Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface NightActionsInput {
  mafiaTargetId?: string | null;
  doctorProtectId?: string | null;
  detectiveInvestigateId?: string | null;
  bodyguardSnipeId?: string | null;
  alivePlayers: { id: string; role: RoleType }[];
}

export interface NightResolutionOutput {
  killedPlayerIds: string[];
  savedPlayerIds: string[];
  detectiveResult?: {
    targetId: string;
    isMafia: boolean;
    roleNameAr: string;
  } | null;
  narrativeAr: string;
}

/**
 * Resolves all night actions deterministically
 */
export function resolveNightActions(input: NightActionsInput): NightResolutionOutput {
  const killedPlayerIds: string[] = [];
  const savedPlayerIds: string[] = [];
  let detectiveResult: NightResolutionOutput['detectiveResult'] = null;

  const { mafiaTargetId, doctorProtectId, detectiveInvestigateId, alivePlayers } = input;

  // Resolve Doctor protection
  if (mafiaTargetId) {
    if (doctorProtectId && doctorProtectId === mafiaTargetId) {
      savedPlayerIds.push(mafiaTargetId);
    } else {
      killedPlayerIds.push(mafiaTargetId);
    }
  }

  // Bodyguard snipe
  if (input.bodyguardSnipeId && !killedPlayerIds.includes(input.bodyguardSnipeId)) {
    // If not protected by doctor
    if (doctorProtectId !== input.bodyguardSnipeId) {
      killedPlayerIds.push(input.bodyguardSnipeId);
    }
  }

  // Resolve Detective investigation
  if (detectiveInvestigateId) {
    const targetPlayer = alivePlayers.find(p => p.id === detectiveInvestigateId);
    if (targetPlayer) {
      const isMafia = targetPlayer.role === 'MAFIA' || targetPlayer.role === 'MAFIA_DON';
      detectiveResult = {
        targetId: detectiveInvestigateId,
        isMafia,
        roleNameAr: isMafia ? 'مافيا مشبوه!' : 'مواطن بريء صالح',
      };
    }
  }

  // Formulate narrative in Arabic
  let narrativeAr = '';
  if (killedPlayerIds.length === 0) {
    narrativeAr = 'أشرق صباح جديد على البلدة والجميع بخير! استطاع الطبيب إنقاذ الضحية أو فشلت المافيا في إصابة هدفها.';
  } else {
    narrativeAr = `استيقظت البلدة على فاجعة أليمة! سقط ضحية غدر رصاص الليل.`;
  }

  return {
    killedPlayerIds,
    savedPlayerIds,
    detectiveResult,
    narrativeAr,
  };
}

export interface DayVotingInput {
  votes: Record<string, string>; // voterId -> targetPlayerId (or 'SKIP')
  alivePlayerIds: string[];
}

export interface DayVotingOutput {
  eliminatedPlayerId: string | null;
  voteCounts: Record<string, number>;
  isTie: boolean;
  skipped: boolean;
  narrativeAr: string;
}

/**
 * Resolves daytime voting to determine who is executed
 */
export function resolveDayVoting(input: DayVotingInput): DayVotingOutput {
  const { votes, alivePlayerIds } = input;
  const voteCounts: Record<string, number> = {};

  // Count votes from alive players only
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (alivePlayerIds.includes(voterId) && targetId) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }
  });

  let maxVotes = 0;
  let topCandidates: string[] = [];

  Object.entries(voteCounts).forEach(([targetId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      topCandidates = [targetId];
    } else if (count === maxVotes) {
      topCandidates.push(targetId);
    }
  });

  // If no votes cast, or skip got majority
  if (maxVotes === 0 || (topCandidates.length === 1 && topCandidates[0] === 'SKIP')) {
    return {
      eliminatedPlayerId: null,
      voteCounts,
      isTie: false,
      skipped: true,
      narrativeAr: 'قرر أهل البلدة الامتناع عن التصويت ولم يُعدم أحد اليوم.',
    };
  }

  // If there is a tie between players
  if (topCandidates.length > 1) {
    return {
      eliminatedPlayerId: null,
      voteCounts,
      isTie: true,
      skipped: false,
      narrativeAr: 'تعادلت الأصوات بين المشتبه بهم! سقطت المشنقة ولم يُعدم أحد لعدم ثبوت الإدانة.',
    };
  }

  const eliminatedPlayerId = topCandidates[0];

  return {
    eliminatedPlayerId,
    voteCounts,
    isTie: false,
    skipped: false,
    narrativeAr: 'أجمعت البلدة على إدانة المشتبه به ونُفذ حكم الإعدام!',
  };
}

export type GameWinner = 'MAFIA' | 'CITIZENS' | 'JOKER' | null;

export interface WinCheckPlayer {
  id: string;
  role: RoleType;
  isAlive: boolean;
}

/**
 * Checks if a win condition has been met
 */
export function checkGameWinner(
  players: WinCheckPlayer[],
  lastDayEliminatedId?: string | null
): GameWinner {
  // 1. Check if Joker was lynched during the day
  if (lastDayEliminatedId) {
    const eliminated = players.find(p => p.id === lastDayEliminatedId);
    if (eliminated && eliminated.role === 'JOKER') {
      return 'JOKER';
    }
  }

  const alivePlayers = players.filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'MAFIA' || p.role === 'MAFIA_DON');
  const aliveNonMafia = alivePlayers.filter(p => p.role !== 'MAFIA' && p.role !== 'MAFIA_DON');

  // If all Mafia are dead -> Citizens win!
  if (aliveMafia.length === 0) {
    return 'CITIZENS';
  }

  // If Mafia equals or outnumbers non-Mafia -> Mafia takes over the town!
  if (aliveMafia.length >= aliveNonMafia.length) {
    return 'MAFIA';
  }

  return null;
}
