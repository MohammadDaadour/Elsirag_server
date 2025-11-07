import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as bodyParser from 'body-parser';

const server = express();

let app;

declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

async function createApp() {
  if (!app) {
    app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      { logger: ['log', 'error', 'warn', 'debug', 'verbose'] }
    );

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

    app.use(
      bodyParser.json({
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      }),
    );

    await app.init();
  }
  return app;
}

export default async (req, res) => {
  await createApp();
  server(req, res);
};

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

