import { Entity, ManyToOne, PrimaryColumn, Column, JoinColumn } from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { Product } from '../../product/entities/product.entity';

@Entity()
export class OrderItem {
  @PrimaryColumn({ name: 'order_id' })
  orderId: number;

  @PrimaryColumn({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int', comment: 'Price per unit in cents' })
  amount_cents: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 3, default: 'EGP' })
  currency: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string;
}