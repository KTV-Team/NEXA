import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { nestDatabaseOptions } from './database.options';

@Module({ imports: [TypeOrmModule.forRoot(nestDatabaseOptions)] })
export class DatabaseModule {}
