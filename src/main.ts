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
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

// For AWS Lambda
import * as awsServerlessExpress from 'aws-serverless-express';
// For Vercel / other Express-based serverless
import * as express from 'express';

let cachedServer: any; // Will hold the server for Lambda or the Express app for Vercel

async function bootstrap() {
  Logger.log('Starting NestJS application...');

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://www.elsirag.com',
      'https://elsirag.com',
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

  // Critical: initialize HTTP adapter (no listen!)
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance() as express.Application;

  // Vercel expects `module.exports = expressApp`
  if (process.env.VERCEL || process.env.NOW_REGION) {
    Logger.log('Running on Vercel');
    module.exports = expressApp;
    return;
  }

  // AWS Lambda / Serverless Framework / SAM
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    Logger.log('Running on AWS Lambda');
    const server = awsServerlessExpress.createServer(expressApp);
    cachedServer = server;
    return;
  }

  // Local development fallback
  const port = process.env.PORT || 3200;
  await app.listen(port);
  Logger.log(`🚀 Server running locally on http://localhost:${port}`);
}

// Start bootstrap
bootstrap();

// Export Lambda handler
export const handler = async (event: any, context: any) => {
  if (!cachedServer) {
    await bootstrap(); // ensures server is created
  }
  return awsServerlessExpress.proxy(cachedServer, event, context);
};