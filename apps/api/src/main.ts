import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { appEnvironment } from './config/environment';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — configure origins per environment in production
  app.enableCors({
    origin: appEnvironment.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = appEnvironment.PORT;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API is running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
