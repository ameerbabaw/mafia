import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoleDistribution,
  resolveNightActions,
  resolveDayVoting,
  checkGameWinner,
  ROLES,
} from './mafiaRules.ts';

test('calculateRoleDistribution: works for minimum 3 players', () => {
  const roles = calculateRoleDistribution(3);
  assert.equal(roles.length, 3);
  // Must have 1 Mafia, 1 Doctor or Detective, and Citizens
  assert.equal(roles.filter(r => r === 'MAFIA_DON').length, 1);
  assert.equal(roles.includes('DOCTOR'), true);
});

test('calculateRoleDistribution: scales accurately with larger player counts', () => {
  const roles5 = calculateRoleDistribution(5);
  assert.equal(roles5.length, 5);
  // Doctor and Detective included
  assert.equal(roles5.includes('DOCTOR'), true);
  assert.equal(roles5.includes('DETECTIVE'), true);

  const roles8 = calculateRoleDistribution(8);
  assert.equal(roles8.length, 8);
  const mafiaCount = roles8.filter(r => r === 'MAFIA' || r === 'MAFIA_DON').length;
  assert.ok(mafiaCount >= 2);
});

test('resolveNightActions: Doctor saves victim from Mafia', () => {
  const players = [
    { id: 'p1', role: 'MAFIA_DON' as const },
    { id: 'p2', role: 'DOCTOR' as const },
    { id: 'p3', role: 'CITIZEN' as const },
  ];

  const result = resolveNightActions({
    mafiaTargetId: 'p3',
    doctorProtectId: 'p3',
    detectiveInvestigateId: null,
    alivePlayers: players,
  });

  assert.deepEqual(result.killedPlayerIds, []);
  assert.deepEqual(result.savedPlayerIds, ['p3']);
});

test('resolveNightActions: Mafia kills unprotected victim and Detective investigates correctly', () => {
  const players = [
    { id: 'p1', role: 'MAFIA_DON' as const },
    { id: 'p2', role: 'DOCTOR' as const },
    { id: 'p3', role: 'DETECTIVE' as const },
    { id: 'p4', role: 'CITIZEN' as const },
  ];

  const result = resolveNightActions({
    mafiaTargetId: 'p4',
    doctorProtectId: 'p2', // doctor healed p2 instead
    detectiveInvestigateId: 'p1',
    alivePlayers: players,
  });

  assert.deepEqual(result.killedPlayerIds, ['p4']);
  assert.notEqual(result.detectiveResult, null);
  assert.equal(result.detectiveResult?.isMafia, true);
});

test('resolveDayVoting: majority candidate is eliminated', () => {
  const result = resolveDayVoting({
    votes: {
      p1: 'p2',
      p3: 'p2',
      p4: 'p1',
    },
    alivePlayerIds: ['p1', 'p2', 'p3', 'p4'],
  });

  assert.equal(result.eliminatedPlayerId, 'p2');
  assert.equal(result.isTie, false);
});

test('resolveDayVoting: ties result in no elimination', () => {
  const result = resolveDayVoting({
    votes: {
      p1: 'p2',
      p3: 'p1',
    },
    alivePlayerIds: ['p1', 'p2', 'p3'],
  });

  assert.equal(result.eliminatedPlayerId, null);
  assert.equal(result.isTie, true);
});

test('checkGameWinner: Citizens win when all mafia eliminated', () => {
  const players = [
    { id: 'p1', role: 'MAFIA_DON' as const, isAlive: false },
    { id: 'p2', role: 'DOCTOR' as const, isAlive: true },
    { id: 'p3', role: 'CITIZEN' as const, isAlive: true },
  ];
  assert.equal(checkGameWinner(players), 'CITIZENS');
});

test('checkGameWinner: Mafia wins when mafia count >= innocents', () => {
  const players = [
    { id: 'p1', role: 'MAFIA_DON' as const, isAlive: true },
    { id: 'p2', role: 'DOCTOR' as const, isAlive: true },
    { id: 'p3', role: 'CITIZEN' as const, isAlive: false },
  ];
  // 1 mafia vs 1 innocent
  assert.equal(checkGameWinner(players), 'MAFIA');
});

test('checkGameWinner: Joker wins when voted out in daytime', () => {
  const players = [
    { id: 'p1', role: 'MAFIA_DON' as const, isAlive: true },
    { id: 'p2', role: 'DOCTOR' as const, isAlive: true },
    { id: 'p3', role: 'JOKER' as const, isAlive: false },
  ];
  assert.equal(checkGameWinner(players, 'p3'), 'JOKER');
});
