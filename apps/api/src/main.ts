import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — configure origins per environment in production
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API is running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
