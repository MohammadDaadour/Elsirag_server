import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, JoinColumn, Index, CreateDateColumn,
  UpdateDateColumn, } from 'typeorm';
import { Product } from './product.entity';
import { Option } from './option.entity';

@Entity()
@Index('IDX_VARIANT_SKU', ['sku'])
@Index('IDX_VARIANT_PRODUCT', ['product'])
export class Variant {
  @PrimaryGeneratedColumn()
  id: number; 

  @ManyToOne(() => Product, product => product.variants)
  @JoinColumn({ name: 'productId' })
  product: Product; 

  @Column({ unique: true })
  sku: string; 

  @Column({ type: 'numeric', nullable: true })
  price: number; 

  @Column({ default: 0, type: 'integer' })
  stock: number; 

  // @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  // weight: number; 

  // @Column({ type: 'jsonb', nullable: true })
  // dimensions: object; 

  @CreateDateColumn()
  createdAt: Date; 

  @ManyToMany(() => Option, option => option.variants)
  @JoinTable()
  options: Option[]; 
}