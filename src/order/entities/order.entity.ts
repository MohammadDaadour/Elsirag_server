import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Expose } from 'class-transformer';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.orders, { cascade: true })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: ['insert', 'update'],
    onDelete: 'CASCADE',
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'int' }) // Store in cents
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  shipping?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: {
      street: string;
      city: string;
      country: string;
      building?: string;
      floor?: string;
      apartment?: string;
      postalCode?: string;
      state?: string;
    };
  };

  @Column()
  paymentMethod: string;

  @Column({ nullable: true })
  notes?: string;

  @Column()
  currency: string = 'EGP';

  @Column()
  deliveryNeeded: boolean;

  @Column({ nullable: true })
  paymentGatewayId: string;

  @Column({ nullable: true })
  paymentGateway: string;

  @Column({ type: 'jsonb', nullable: true })
  paymentGatewayMetadata: any;

  @Expose()
  paymentUrl?: string;
}