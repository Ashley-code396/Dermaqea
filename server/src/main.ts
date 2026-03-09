import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL,

  });
  const port = process.env.PORT || 5000;
  // Serve uploaded files from /uploads so they can be downloaded/viewed by clients.
  // Files are saved to the project root `uploads` directory by the upload handler.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
