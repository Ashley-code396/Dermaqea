import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // In production require FRONTEND_URL to be set to a valid origin (or a
  // comma-separated list of origins). Fail fast if it's missing to avoid
  // serving the wrong CORS header that breaks the deployed frontend.
  const frontendEnv = process.env.FRONTEND_URL;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !frontendEnv) {
    console.error('Missing required environment variable FRONTEND_URL in production.');
    console.error('Set FRONTEND_URL to your production frontend origin, e.g. https://dermaqea.vercel.app');
    // Exit with non-zero so deployment fails and you can fix configuration.
    process.exit(1);
  }

  // Normalize allowed origins (support comma-separated list)
  const allowedOrigins = (frontendEnv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: function (origin, callback) {
      // In development, completely disable CORS restrictions to ensure UI connects smoothly
      if (!isProd) return callback(null, true);
      
      // Allow non-browser requests (like curl, server-to-server) when origin is undefined
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
