// src/favorite/favorite.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favourite } from './entities/favourite.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Product } from 'src/product/entities/product.entity';

@Injectable()
export class FavouriteService {
  constructor(
    @InjectRepository(Favourite) private favRepo: Repository<Favourite>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) { }

  async addToFavorites(userId: number, productId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const product = await this.productRepo.findOne({ where: { id: productId } });

    if (!user || !product)
      throw new NotFoundException('User or Product not found');

    const existing = await this.favRepo.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (existing)
      throw new BadRequestException('Product already in wishlist');

    const favorite = this.favRepo.create({ user, product });
    return this.favRepo.save(favorite);
  }

  async getUserFavorites(userId: number) {
    return this.favRepo.find({
      where: { user: { id: userId } },
      relations: ['product'],
    });
  }

  async removeFavorite(userId: number, productId: number) {
    const favorite = await this.favRepo.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (!favorite)
      throw new NotFoundException('Product not found in wishlist');

    return this.favRepo.remove(favorite);
  }
}
