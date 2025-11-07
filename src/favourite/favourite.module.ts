// src/favorite/favorite.module.ts
import { Module } from '@nestjs/common';
import { FavouriteService } from './favourite.service';
import { FavouriteController } from './favourite.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favourite } from './entities/favourite.entity';
import { User } from '../user/entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Favourite, User, Product]), AuthModule],
  controllers: [FavouriteController],
  providers: [FavouriteService],
})
export class FavoriteModule { }
