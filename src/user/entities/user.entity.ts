import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { Cart } from '../../cart/entities/cart.entity';
import { Order } from '../../order/entities/order.entity';
import { Favourite } from '../../favourite/entities/favourite.entity';
import { Verification } from '../../auth/entities/verification.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: false })
  emailVerified: boolean;

  @OneToMany(() => Favourite, (f) => f.user, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  favourites: Favourite[];

  @OneToOne(() => Cart, (cart) => cart.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  cart: Cart;

  @OneToMany(() => Order, order => order.user, {
    // cascade: true,
    // onDelete: 'CASCADE'
  })
  orders: Order[];

  @OneToMany(() => Verification, verification => verification.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  verifications: Verification[];

  @Column({ nullable: true })
  facebookId: string;

  @Column({ nullable: true })
  googleId: string;
}
