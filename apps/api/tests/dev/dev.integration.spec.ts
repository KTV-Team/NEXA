import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import { appEnvironment } from '../../src/config/environment';
import { ApiExceptionFilter } from '../../src/common/filters/api-exception.filter';
import { databaseOptions } from '../../src/database/database.options';
import { assertDedicatedTestDatabase } from '../../src/database/test-database';
import { seedFixtures } from '../../src/database/seeds/seed-data';
import { AppModule } from '../../src/app.module';
import type { ApiResponse, DevDemoData, HealthStatus } from '@nexa/types';

describe('development demo API integration', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    const source = new DataSource(databaseOptions);
    await source.initialize();
    await source.runMigrations();
    const password = appEnvironment.DEV_SEED_PASSWORD;
    if (!password) throw new Error('DEV_SEED_PASSWORD is required for database integration tests');
    await seedFixtures(source, password);
    await source.destroy();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns the shared envelope with database-backed records', async () => {
    const reply = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/api/v1/dev/demo' });
    expect(reply.statusCode).toBe(200);
    const result = reply.json() as ApiResponse<DevDemoData>;
    expect(result.success).toBe(true);
    expect(result.data?.database).toBe('connected');
    expect(result.data?.users).toHaveLength(4);
    expect(result.data?.teams).toHaveLength(2);
    expect(result.data?.counts).toEqual({ todoItems: 6, events: 3, notifications: 4 });
  });

  it('wraps health data for the shared API client', async () => {
    const reply = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/api/v1/health' });
    expect(reply.statusCode).toBe(200);
    expect((reply.json() as ApiResponse<HealthStatus>).data?.status).toBe('ok');
  });

  it('does not include stub tokens or users', async () => {
    const login = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'alice@example.test', password: 'not-a-real-password' },
    });
    expect(login.statusCode).toBe(501);
    expect(login.json()).toMatchObject({ success: false, error: { code: 'NOT_IMPLEMENTED' } });

    const users = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/api/v1/users' });
    expect(users.statusCode).toBe(501);
  });

  it('maps a database failure to a sanitized 503 response', async () => {
    await app.get<DataSource>(DataSource).destroy();
    const reply = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/api/v1/dev/demo' });
    expect(reply.statusCode).toBe(503);
    expect(reply.json()).toMatchObject({ success: false, error: { code: 'DATABASE_UNAVAILABLE' } });
    expect(reply.body).not.toContain('SELECT');
  });
});
