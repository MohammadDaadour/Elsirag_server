import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guard/roles.guard';
import { JwtAuthGuard } from './auth/guard/jwt-auth.guard';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { CartModule } from './cart/cart.module';
import { CartItemModule } from './cart-item/cart-item.module';
import { OrderModule } from './order/order.module';
import { OrderItemModule } from './order-item/order-item.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { FavoriteModule } from './favourite/favourite.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    // ONLY ONCE – Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Mailer – port fixed with +
    // 2. Replace your entire MailerModule.forRootAsync with this:
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): MailerOptions => {
        return {
          transport: {
            host: configService.get<string>('MAIL_HOST')!,
            port: +(configService.get<string>('MAIL_PORT') ?? 587),
            secure: false,
            auth: {
              user: configService.get<string>('MAIL_USER')!,
              pass: configService.get<string>('MAIL_PASS')!,
            },
          },
          defaults: {
            from: '"ELSirag" <no-reply@elsirag.com>',
          },
          template: {
            dir: join(__dirname, '..', 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.get<string>('DATABASE_URL'),
        ssl: false,
        extra: {
          max: 1, // ⚠️ CRITICAL: Only 1 connection per serverless function
          min: 0,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        },
        autoLoadEntities: true,
        synchronize: false,
        keepConnectionAlive: false, // ⚠️ CRITICAL: Don't persist connections
        retryAttempts: 2,
        retryDelay: 3000,
      }),
    }),

    UserModule,
    AuthModule,
    ProductModule,
    CategoryModule,
    CartModule,
    CartItemModule,
    OrderModule,
    OrderItemModule,
    CloudinaryModule,
    FavoriteModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule { }



// ConfigModule.forRoot(),
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         type: 'postgres',
//         host: configService.get('DB_HOST'),
//         port: +configService.get('DB_PORT'),
//         username: configService.get('DB_USERNAME'),
//         password: configService.get('DB_PASSWORD'),
//         database: configService.get('DB_NAME'),
//         synchronize: true,
//         autoLoadEntities: true,
//       }),
//     }),
// i need to change the db config?
