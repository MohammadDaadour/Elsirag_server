// src/favorite/entities/favorite.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Product } from '../../product/entities/product.entity';

@Entity()
export class Favourite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.favourites, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' })
  product: Product;
}
