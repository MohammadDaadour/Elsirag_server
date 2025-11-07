import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Cart } from '../../cart/entities/cart.entity';
import { Product } from '../../product/entities/product.entity';

@Entity()
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cart, (cart) => cart.items)
  cart: Cart;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  product: Product;

  @Column()
  quantity: number;
}
