import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { appEnvironment } from './config/environment';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import fastifyCookie from '@fastify/cookie';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
          censor: '[REDACTED]',
        },
      },
    }),
  );
  await app.register(fastifyCookie);
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalFilters(new ApiExceptionFilter());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — configure origins per environment in production
  app.enableCors({
    origin: [...new Set([...appEnvironment.CORS_ORIGIN, ...appEnvironment.AUTH_WEB_ORIGINS])],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Client'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = appEnvironment.PORT;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API is running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
