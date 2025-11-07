import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';

@Injectable()

export class CartItemService {
  constructor(
    @InjectRepository(CartItem)
    private readonly itemRepo: Repository<CartItem>,
  ) { }

  async removeItem(userId: number, itemId: number) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user', 'product'],
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    console.log('Requesting user ID:', userId);


    if (item.cart.user.id !== userId) {
      throw new ForbiddenException('You are not authorized to delete this item');
    }

    await this.itemRepo.remove(item);

    return {
      message: 'Item removed from cart',
      removedItem: {
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
        },
      },
    };
  }
}
