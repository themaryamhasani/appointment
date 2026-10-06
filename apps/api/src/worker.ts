import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  await NestFactory.createApplicationContext(AppModule);
  Logger.log('BullMQ workers started', 'Worker');
  // Keep process alive — processors registered via AppModule
}

bootstrap();
