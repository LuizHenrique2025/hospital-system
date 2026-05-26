import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('cors.origin');
  const allowedOrigins = corsOrigin
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.use(compression());

  app.enableCors({
    origin: allowedOrigins?.length ? allowedOrigins : false,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Hospital System API')
    .setDescription('API para gerenciamento de sistema hospitalar')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Endpoints de autenticacao')
    .addTag('users', 'Endpoints de usuarios')
    .addTag('patients', 'Endpoints de pacientes')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
  logger.log(`Aplicacao rodando na porta ${port}`);
  logger.log(`Documentacao Swagger: http://localhost:${port}/api/docs`);
}

void bootstrap();
