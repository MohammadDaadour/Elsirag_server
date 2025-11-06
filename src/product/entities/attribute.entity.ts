import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Option } from './option.entity';
import { Product } from './product.entity';

@Entity()
// @Index('IDX_ATTRIBUTE_NAME', ['name']) 
export class Attribute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  name: string;

  @Column()
  type: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => Option, option => option.attribute, { cascade: true, onDelete: 'CASCADE' })
  options: Option[];

  @ManyToMany(() => Product, product => product.attributes)
  products: Product[];
}