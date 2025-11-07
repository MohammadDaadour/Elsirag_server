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
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { Logger } from '@nestjs/common';

const server = express();

async function createNestApp(expressInstance: express.Express) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: ['error', 'warn', 'log'],
    }
  );

  app.use(cookieParser());

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://www.elsirag.com',
      'https://elsirag.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

// For Vercel serverless
let nestApp: any;

async function bootstrap() {
  if (!nestApp) {
    nestApp = await createNestApp(server);
  }
  return server;
}

// Export for Vercel
module.exports = bootstrap().then(app => app);

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3200;
  bootstrap().then(app => {
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  });
}