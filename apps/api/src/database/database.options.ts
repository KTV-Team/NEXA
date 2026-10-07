import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import { appEnvironment } from '../config/environment';
import { coreEntities } from './entities';

const migrations = [
  `${__dirname.replace(/\\/g, '/')}/migrations/*{.ts,.js}`,
];

export const databaseOptions: DataSourceOptions = {
  type: 'postgres',
  host: appEnvironment.DB_HOST,
  port: appEnvironment.DB_PORT,
  username: appEnvironment.DB_USER,
  password: appEnvironment.DB_PASSWORD,
  database: appEnvironment.DB_NAME,
  ssl: appEnvironment.DB_SSL ? { rejectUnauthorized: true } : false,
  entities: [...coreEntities],
  migrations,
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  migrationsRun: false,
  dropSchema: false,
  uuidExtension: 'pgcrypto',
  installExtensions: false,
  logging: false,
};

export const nestDatabaseOptions: TypeOrmModuleOptions = {
  ...databaseOptions,
  retryAttempts: 5,
  retryDelay: 1000,
  autoLoadEntities: false,
};
