import { hash, verify, argon2id } from 'argon2';
import type { DataSource, EntityManager } from 'typeorm';
import { appEnvironment } from '../../config/environment';
import { AuthAccountEntity } from '../../auth/entities/auth-account.entity';
import { EventParticipantEntity } from '../../events/entities/event-participant.entity';
import { EventEntity } from '../../events/entities/event.entity';
import { NotificationRecipientEntity } from '../../notifications/entities/notification-recipient.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { TeamMemberEntity } from '../../teams/entities/team-member.entity';
import { TeamEntity } from '../../teams/entities/team.entity';
import { TodoItemEntity } from '../../todos/entities/todo-item.entity';
import { TodoListEntity } from '../../todos/entities/todo-list.entity';
import { UserEntity } from '../../users/entities/user.entity';
import {
  seedIds,
  seedMembershipFixtures,
  seedTeamFixtures,
  seedTimestamp,
  seedUserFixtures,
} from './fixtures';

export function assertSeedAllowed(): string {
  const allowedDatabase = appEnvironment.DB_NAME === 'nexa_dev' || appEnvironment.DB_NAME === 'nexa_test';
  const allowedHost = ['localhost', '127.0.0.1'].includes(appEnvironment.DB_HOST.toLowerCase());
  const password = appEnvironment.DEV_SEED_PASSWORD?.trim();
  if (
    appEnvironment.NODE_ENV === 'production' ||
    !['development', 'test'].includes(appEnvironment.NODE_ENV) ||
    !allowedDatabase ||
    !allowedHost ||
    !allowedPasswordFlag() ||
    !password
  ) {
    throw new Error('Seed blocked: use a local nexa_dev/nexa_test database, ALLOW_DEV_SEED=true, and DEV_SEED_PASSWORD');
  }
  return password;
}

function allowedPasswordFlag(): boolean {
  return appEnvironment.ALLOW_DEV_SEED;
}

export async function seedFixtures(dataSource: DataSource, password: string): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await seedUsers(manager);
    await seedAccounts(manager, password);
    await seedTeamsAndMembers(manager);
    await seedListsAndTodos(manager);
    await seedEvents(manager);
    await seedNotifications(manager);
  });
}

const at = (offsetHours = 0) => new Date(Date.parse(seedTimestamp) + offsetHours * 3_600_000);

async function seedUsers(manager: EntityManager): Promise<void> {
  const repository = manager.getRepository(UserEntity);
  for (const fixture of seedUserFixtures) {
    await repository.save(repository.create({
      ...fixture,
      avatarUrl: null,
      createdAt: at(),
      updatedAt: at(),
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
    }));
  }
}

async function seedAccounts(manager: EntityManager, password: string): Promise<void> {
  const repository = manager.getRepository(AuthAccountEntity);
  for (const user of seedUserFixtures) {
    const existing = await repository.createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.user_id = :userId AND account.provider = :provider', {
        userId: user.id,
        provider: 'password',
      })
      .getOne();
    const passwordHash = existing?.passwordHash && await verify(existing.passwordHash, password)
      ? existing.passwordHash
      : await hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await repository.save(repository.create({
      id: existing?.id,
      userId: user.id,
      user: { id: user.id } as UserEntity,
      provider: 'password',
      providerSubject: user.id,
      passwordHash,
      createdAt: existing?.createdAt ?? at(),
      updatedAt: at(),
    }));
  }
}

async function seedTeamsAndMembers(manager: EntityManager): Promise<void> {
  const teams = manager.getRepository(TeamEntity);
  for (const fixture of seedTeamFixtures) {
    await teams.save(teams.create({
      ...fixture,
      version: 1,
      createdAt: at(),
      updatedAt: at(),
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
    }));
  }
  const members = manager.getRepository(TeamMemberEntity);
  for (const fixture of seedMembershipFixtures) {
    await members.save(members.create({
      ...fixture,
      team: { id: fixture.teamId } as TeamEntity,
      user: { id: fixture.userId } as UserEntity,
      createdAt: at(),
      updatedAt: at(),
      createdBy: null,
      updatedBy: null,
    }));
  }
}

async function seedListsAndTodos(manager: EntityManager): Promise<void> {
  const lists = manager.getRepository(TodoListEntity);
  const listFixtures = [
    { id: seedIds.lists.personal, name: 'Alice Personal', ownerUserId: seedIds.users.alice, teamId: null },
    { id: seedIds.lists.alpha, name: 'Alpha Work', ownerUserId: null, teamId: seedIds.teams.alpha },
    { id: seedIds.lists.beta, name: 'Beta Work', ownerUserId: null, teamId: seedIds.teams.beta },
  ];
  for (const fixture of listFixtures) {
    await lists.save(lists.create({
      ...fixture,
      ownerUser: fixture.ownerUserId ? { id: fixture.ownerUserId } as UserEntity : null,
      team: fixture.teamId ? { id: fixture.teamId } as TeamEntity : null,
      version: 1,
      createdAt: at(), updatedAt: at(), createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    }));
  }

  const todos = manager.getRepository(TodoItemEntity);
  const rows = [
    { title: 'Plan the week', listId: seedIds.lists.personal, priority: 'HIGH' as const, dueAt: 24, complete: false },
    { title: 'Review notes', listId: seedIds.lists.personal, priority: 'NORMAL' as const, dueAt: null, complete: true },
    { title: 'Prepare team agenda', listId: seedIds.lists.alpha, priority: 'URGENT' as const, dueAt: 48, complete: false },
    { title: 'Share project update', listId: seedIds.lists.alpha, priority: 'NORMAL' as const, dueAt: null, complete: false },
    { title: 'Check supplier list', listId: seedIds.lists.beta, priority: 'LOW' as const, dueAt: 72, complete: false },
    { title: 'Archive last sprint', listId: seedIds.lists.beta, priority: 'NORMAL' as const, dueAt: null, complete: true },
  ];
  for (const [index, row] of rows.entries()) {
    await todos.save(todos.create({
      id: seedIds.todos[index],
      listId: row.listId,
      list: { id: row.listId } as TodoListEntity,
      title: row.title,
      note: null,
      dueAt: row.dueAt === null ? null : at(row.dueAt),
      priority: row.priority,
      completedAt: row.complete ? at(-1) : null,
      position: index,
      version: 1,
      createdAt: at(), updatedAt: at(), createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    }));
  }
}

async function seedEvents(manager: EntityManager): Promise<void> {
  const events = manager.getRepository(EventEntity);
  const rows = [
    { title: 'Doctor appointment', kind: 'APPOINTMENT' as const, ownerUserId: seedIds.users.alice, teamId: null, start: 30 },
    { title: 'Alpha planning', kind: 'EVENT' as const, ownerUserId: null, teamId: seedIds.teams.alpha, start: 96 },
    { title: 'Dave birthday', kind: 'BIRTHDAY' as const, ownerUserId: seedIds.users.dave, teamId: null, start: 240 },
  ];
  for (const [index, row] of rows.entries()) {
    await events.save(events.create({
      id: seedIds.events[index],
      title: row.title,
      note: 'Development fixture',
      location: null,
      kind: row.kind,
      startsAt: at(row.start),
      endsAt: at(row.start + 1),
      timezone: 'UTC',
      allDay: false,
      ownerUserId: row.ownerUserId,
      ownerUser: row.ownerUserId ? { id: row.ownerUserId } as UserEntity : null,
      teamId: row.teamId,
      team: row.teamId ? { id: row.teamId } as TeamEntity : null,
      version: 1,
      createdAt: at(), updatedAt: at(), createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    }));
  }

  const participants = manager.getRepository(EventParticipantEntity);
  const rowsForRsvp = [
    { eventId: seedIds.events[0], userId: seedIds.users.alice, rsvp: 'GOING' as const },
    { eventId: seedIds.events[1], userId: seedIds.users.alice, rsvp: 'MAYBE' as const },
    { eventId: seedIds.events[1], userId: seedIds.users.bob, rsvp: 'NOT_GOING' as const },
    { eventId: seedIds.events[2], userId: seedIds.users.dave, rsvp: null },
  ];
  for (const row of rowsForRsvp) {
    await participants.save(participants.create({
      ...row,
      event: { id: row.eventId } as EventEntity,
      user: { id: row.userId } as UserEntity,
      respondedAt: row.rsvp ? at() : null,
      createdAt: at(), updatedAt: at(), createdBy: null, updatedBy: null,
    }));
  }
}

async function seedNotifications(manager: EntityManager): Promise<void> {
  const repository = manager.getRepository(NotificationEntity);
  const rows = [
    { title: 'Draft update', status: 'DRAFT' as const, teamId: null, scheduledAt: null, sentAt: null, cancelledAt: null },
    { title: 'Scheduled reminder', status: 'SCHEDULED' as const, teamId: seedIds.teams.alpha, scheduledAt: at(120), sentAt: null, cancelledAt: null },
    { title: 'Sent team update', status: 'SENT' as const, teamId: seedIds.teams.beta, scheduledAt: null, sentAt: at(-12), cancelledAt: null },
    { title: 'Cancelled announcement', status: 'CANCELLED' as const, teamId: null, scheduledAt: null, sentAt: null, cancelledAt: at(-6) },
  ];
  for (const [index, row] of rows.entries()) {
    await repository.save(repository.create({
      id: seedIds.notifications[index],
      title: row.title,
      body: 'This notification is local development data.',
      status: row.status,
      targetTeamId: row.teamId,
      targetTeam: row.teamId ? { id: row.teamId } as TeamEntity : null,
      eventId: null,
      event: null,
      scheduledAt: row.scheduledAt,
      sentAt: row.sentAt,
      cancelledAt: row.cancelledAt,
      version: 1,
      createdAt: at(), updatedAt: at(), createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    }));
  }

  const recipients = manager.getRepository(NotificationRecipientEntity);
  const recipientFixtures = [
    { notificationId: seedIds.notifications[2], userId: seedIds.users.alice, readAt: at() },
    { notificationId: seedIds.notifications[2], userId: seedIds.users.bob, readAt: null },
    { notificationId: seedIds.notifications[2], userId: seedIds.users.dave, readAt: null },
    { notificationId: seedIds.notifications[1], userId: seedIds.users.alice, readAt: null },
    { notificationId: seedIds.notifications[1], userId: seedIds.users.carol, readAt: null },
  ];
  for (const fixture of recipientFixtures) {
    await recipients.save(recipients.create({
      ...fixture,
      notification: { id: fixture.notificationId } as NotificationEntity,
      user: { id: fixture.userId } as UserEntity,
      createdAt: at(), updatedAt: at(), createdBy: null, updatedBy: null,
    }));
  }
}

export async function runSeed(dataSource: DataSource): Promise<void> {
  const password = assertSeedAllowed();
  if (!dataSource.isInitialized) await dataSource.initialize();
  try {
    await seedFixtures(dataSource, password);
  } finally {
    await dataSource.destroy();
  }
}
