import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as package_json from '../package.json';
import { createBaseData, createDevData } from './app.bootstrap';
import { ValidationPipe } from '@nestjs/common';
import { Settings } from 'luxon';
import * as process from 'process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle(package_json.name)
    .setDescription(package_json.description)
    .setVersion(package_json.version)
    .addSecurity('ApiKeyAuth2', {
      type: 'apiKey',
      in: 'header',
      name: 'apikey',
    })
    .addSecurity('JwtKeyAuth', {
      type: 'http',
      in: 'header',
      name: 'Authorization',
      bearerFormat: 'JWT',
      scheme: 'bearer',
    })
    .addSecurityRequirements('JwtKeyAuth')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await createBaseData(app);
  if (process.env.NODE_ENV !== 'production') {
    await createDevData(app);
  }

  await app.listen(+process.env.PORT);

  // Set default timezone for dates of DateTime to CET
  Settings.defaultZone = 'utc';
}

bootstrap();
