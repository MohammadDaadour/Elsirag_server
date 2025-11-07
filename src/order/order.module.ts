import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart-item/entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Cart,
      CartItem,
      Product,
      User,
    ]),
    AuthModule,
    PaymentModule,
    ConfigModule,
    HttpModule
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule { }
