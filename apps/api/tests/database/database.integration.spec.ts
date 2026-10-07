import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { appEnvironment } from '../../src/config/environment';
import { TeamMemberEntity } from '../../src/teams/entities/team-member.entity';
import { TodoListEntity } from '../../src/todos/entities/todo-list.entity';
import { UserEntity } from '../../src/users/entities/user.entity';
import { databaseOptions } from '../../src/database/database.options';
import { assertDedicatedTestDatabase } from '../../src/database/test-database';
import { seedFixtures } from '../../src/database/seeds/seed-data';
import { seedIds, seedTimestamp } from '../../src/database/seeds/fixtures';

describe('PostgreSQL schema and seed integration', () => {
  let source: DataSource;

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    source = new DataSource(databaseOptions);
    await source.initialize();
    await source.runMigrations();
    await cleanupSeedFixtures();
  });

  afterAll(async () => {
    if (source?.isInitialized) await cleanupSeedFixtures();
    if (source?.isInitialized) await source.destroy();
  });

  afterEach(async () => {
    await cleanupSeedFixtures();
  });

  it('applies both migrations and can revert auth sessions without losing existing users', async () => {
    expect(await source.query('SELECT 1 AS connected')).toEqual([{ connected: 1 }]);
    expect(await source.showMigrations()).toBe(false);

    const tables = await source.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('users', 'auth_accounts', 'auth_sessions', 'teams', 'team_members', 'todo_lists', 'todo_items', 'events', 'event_participants', 'notifications', 'notification_recipients')
    `);
    expect(tables).toHaveLength(11);

    const existingUserId = randomUUID();
    await source.getRepository(UserEntity).insert({
      id: existingUserId,
      email: `${existingUserId}@example.test`,
      name: 'Migration sentinel',
      systemRole: 'USER',
    });
    try {
      await source.undoLastMigration();
      expect(await source.query("SELECT to_regclass('auth_sessions') AS table_name")).toEqual([
        { table_name: null },
      ]);
      expect(
        await source.getRepository(UserEntity).findOneBy({ id: existingUserId }),
      ).not.toBeNull();
      await source.runMigrations();
      expect(await source.showMigrations()).toBe(false);
      expect(
        await source.getRepository(UserEntity).findOneBy({ id: existingUserId }),
      ).not.toBeNull();
    } finally {
      await source.getRepository(UserEntity).delete({ id: existingUserId });
    }
  });

  it('enforces unique identity, owner, and exclusive list scope constraints', async () => {
    const fixedDate = new Date(seedTimestamp);
    await source.manager.insert(UserEntity, {
      id: seedIds.users.alice,
      email: 'alice@example.test',
      name: 'Alice',
      systemRole: 'ADMIN',
      createdAt: fixedDate,
      updatedAt: fixedDate,
    });
    await source.manager.insert(UserEntity, {
      id: seedIds.users.bob,
      email: 'bob@example.test',
      name: 'Bob',
      systemRole: 'USER',
      createdAt: fixedDate,
      updatedAt: fixedDate,
    });

    await expect(
      source.manager.insert(UserEntity, {
        id: '90000000-0000-4000-8000-000000000001',
        email: 'alice@example.test',
        name: 'Duplicate',
        systemRole: 'USER',
      }),
    ).rejects.toThrow();

    await source.manager.insert('teams', {
      id: seedIds.teams.alpha,
      name: 'Test team',
      version: 1,
      created_at: fixedDate,
      updated_at: fixedDate,
    });
    await source.manager.insert(TeamMemberEntity, {
      teamId: seedIds.teams.alpha,
      userId: seedIds.users.alice,
      role: 'OWNER',
    });
    await expect(
      source.manager.insert(TeamMemberEntity, {
        teamId: seedIds.teams.alpha,
        userId: '90000000-0000-4000-8000-000000000002',
        role: 'OWNER',
      }),
    ).rejects.toThrow();

    await expect(
      source.manager.insert(TodoListEntity, {
        id: '90000000-0000-4000-8000-000000000003',
        name: 'Invalid scope',
        ownerUserId: null,
        teamId: null,
      }),
    ).rejects.toThrow();
  });

  it('seeds deterministic relationships and remains idempotent', async () => {
    const password = appEnvironment.DEV_SEED_PASSWORD;
    if (!password) throw new Error('DEV_SEED_PASSWORD is required for database integration tests');

    await seedFixtures(source, password);
    await seedFixtures(source, password);

    expect(await source.getRepository(UserEntity).count()).toBe(4);
    expect(await source.getRepository('teams').count()).toBe(2);
    expect(await source.getRepository('team_members').count()).toBe(6);
    expect(await source.getRepository('todo_items').count()).toBe(6);
    expect(await source.getRepository('events').count()).toBe(3);
    expect(await source.getRepository('notifications').count()).toBe(4);
  });

  async function cleanupSeedFixtures(): Promise<void> {
    await source.query('DELETE FROM notifications WHERE id = ANY($1::uuid[])', [
      seedIds.notifications,
    ]);
    await source.query('DELETE FROM events WHERE id = ANY($1::uuid[])', [seedIds.events]);
    await source.query('DELETE FROM todo_items WHERE id = ANY($1::uuid[])', [seedIds.todos]);
    await source.query('DELETE FROM todo_lists WHERE id = ANY($1::uuid[])', [
      Object.values(seedIds.lists),
    ]);
    await source.query('DELETE FROM team_members WHERE team_id = ANY($1::uuid[])', [
      Object.values(seedIds.teams),
    ]);
    await source.query('DELETE FROM teams WHERE id = ANY($1::uuid[])', [
      Object.values(seedIds.teams),
    ]);
    await source.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
      Object.values(seedIds.users),
    ]);
  }
});
