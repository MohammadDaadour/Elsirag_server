import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartItem } from '../cart-item/entities/cart-item.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Product, User]), 
    forwardRef(() => AuthModule)
  ],
  controllers: [CartController],
  providers: [CartService],

  exports: [TypeOrmModule]
})
export class CartModule { }
