import { Module, forwardRef } from '@nestjs/common';
import { CartItemService } from './cart-item.service';
import { CartItemController } from './cart-item.controller';
import { CartItem } from './entities/cart-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem]),
  forwardRef(() => AuthModule)
  ],
  controllers: [CartItemController],
  providers: [CartItemService],
  exports: [TypeOrmModule]

})
export class CartItemModule { }
