import type { SystemRole, TeamRole } from '@nexa/types';

const userIds = {
  alice: '00000000-0000-4000-8000-000000000001',
  bob: '00000000-0000-4000-8000-000000000002',
  carol: '00000000-0000-4000-8000-000000000003',
  dave: '00000000-0000-4000-8000-000000000004',
} as const;

const teamIds = {
  alpha: '10000000-0000-4000-8000-000000000001',
  beta: '10000000-0000-4000-8000-000000000002',
} as const;

export const seedUserFixtures: ReadonlyArray<{
  id: string;
  email: string;
  name: string;
  systemRole: SystemRole;
}> = [
  { id: userIds.alice, email: 'alice@example.test', name: 'Alice', systemRole: 'ADMIN' },
  { id: userIds.bob, email: 'bob@example.test', name: 'Bob', systemRole: 'USER' },
  { id: userIds.carol, email: 'carol@example.test', name: 'Carol', systemRole: 'USER' },
  { id: userIds.dave, email: 'dave@example.test', name: 'Dave', systemRole: 'USER' },
];

export const seedTeamFixtures = [
  { id: teamIds.alpha, name: 'NEXA Alpha' },
  { id: teamIds.beta, name: 'NEXA Beta' },
] as const;

export const seedMembershipFixtures: ReadonlyArray<{
  teamId: string;
  userId: string;
  role: TeamRole;
}> = [
  { teamId: teamIds.alpha, userId: userIds.alice, role: 'OWNER' },
  { teamId: teamIds.alpha, userId: userIds.bob, role: 'ADMIN' },
  { teamId: teamIds.alpha, userId: userIds.carol, role: 'MEMBER' },
  { teamId: teamIds.beta, userId: userIds.bob, role: 'OWNER' },
  { teamId: teamIds.beta, userId: userIds.alice, role: 'MEMBER' },
  { teamId: teamIds.beta, userId: userIds.dave, role: 'ADMIN' },
];

export const seedIds = {
  users: userIds,
  teams: teamIds,
  lists: {
    personal: '20000000-0000-4000-8000-000000000001',
    alpha: '20000000-0000-4000-8000-000000000002',
    beta: '20000000-0000-4000-8000-000000000003',
  },
  todos: Array.from({ length: 6 }, (_, index) => `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`),
  events: Array.from({ length: 3 }, (_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`),
  notifications: Array.from({ length: 4 }, (_, index) => `50000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`),
} as const;

export const seedTimestamp = '2030-01-07T09:00:00.000Z';
