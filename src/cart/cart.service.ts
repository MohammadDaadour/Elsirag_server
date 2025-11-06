import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';
import { Product } from 'src/product/entities/product.entity';
import { User } from 'src/user/entities/user.entity';
import { CreateCartItemDto } from 'src/cart-item/dto/create-cart-item.dto';
import { UpdateCartItemDto } from 'src/cart-item/dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) { }

  async createCartForUser(user: User) {
    const cart = this.cartRepo.create({ user });
    return this.cartRepo.save(cart);
  }


  async getCart(userId: number) {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });
    return cart ?? { items: [] };
  }

  async addToCart(userId: number, dto: CreateCartItemDto) {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      cart = this.cartRepo.create({ user, items: [] });
      await this.cartRepo.save(cart);
    }

    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existingItem = cart.items.find(item => item.product.id === dto.productId);
    if (existingItem) {
      existingItem.quantity += dto.quantity;
      return this.itemRepo.save(existingItem);
    }

    const newItem = this.itemRepo.create({
      cart,
      product,
      quantity: dto.quantity,
    });

    await this.itemRepo.save(newItem);
    return this.getCart(userId);
  }

  async updateItem(
    itemId: number,
    dto: UpdateCartItemDto,
    userId: number,
  ) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user', 'product'],
    });

    if (!item) throw new NotFoundException('Item not found');
    if (!item.cart?.user || item.cart.user.id !== userId) {
      throw new ForbiddenException('Not your cart');
    }

    item.quantity = dto.quantity;
    const updatedItem = await this.itemRepo.save(item);

    return {
      id: updatedItem.id,
      quantity: updatedItem.quantity,
      product: {
        id: updatedItem.product.id,
        name: updatedItem.product.name,
        price: updatedItem.product.price,
      }
    };
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user', 'product'],
    });

    if (!item || item.cart.user.id !== userId) {
      throw new NotFoundException('Item not found or not yours');
    }

    return {
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
      }
    };
  }

  async mergeCarts(userId: number, localItems: CreateCartItemDto[]) {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      cart = this.cartRepo.create({ user, items: [] });
      await this.cartRepo.save(cart);
    }

    for (const localItem of localItems) {
      const product = await this.productRepo.findOne({
        where: { id: localItem.productId }
      });

      if (!product) continue; 

      const existingItem = cart.items.find(
        item => item.product.id === localItem.productId
      );

      if (existingItem) {
        existingItem.quantity = localItem.quantity;
        await this.itemRepo.save(existingItem);
      } else {
        const newItem = this.itemRepo.create({
          cart,
          product,
          quantity: localItem.quantity,
        });
        await this.itemRepo.save(newItem);
      }
    }

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items'],
    });

    if (!cart) return;

    await this.itemRepo.remove(cart.items);
  }
}

