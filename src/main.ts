// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';
// import * as cookieParser from 'cookie-parser';
// import { Logger } from '@nestjs/common';
// import * as bodyParser from 'body-parser';

// import { IncomingMessage } from 'http';

// declare module 'http' {
//   interface IncomingMessage {
//     rawBody?: Buffer;
//   }
// }

// async function bootstrap() {
//   Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);
//   const app = await NestFactory.create(AppModule);

//   app.use(cookieParser());

//   app.enableCors({
//     origin: [
//       process.env.FRONTEND_URL || 'http://localhost:3000',
//       'https://www.elsirag.com',
//       'https://elsirag.com'
//     ],
//     credentials: true,
//   });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   app.use(
//     bodyParser.json({
//       verify: (req, res, buf) => {
//         req.rawBody = buf;
//       },
//     }),
//   );

//   await app.listen(process.env.PORT ?? 3200);

// }
// bootstrap();


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://www.elsirag.com',
      'https://elsirag.com'
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3200;
  
  // For Vercel - export the app instance
  if (process.env.VERCEL) {
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();
    module.exports = expressApp;
  } else {
    // For local development
    await app.listen(port);
    console.log(`🚀 Server running on port ${port}`);
  }
}

// Start the application
bootstrap();