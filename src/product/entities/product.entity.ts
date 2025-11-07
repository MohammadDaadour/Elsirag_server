import { Entity, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn, Column, OneToMany, ManyToMany, JoinTable, ManyToOne } from 'typeorm';
import { Attribute } from './attribute.entity';
import { Variant } from './variant.entity';
import { Category } from '../../category/entities/category.entity';

@Entity()
@Index('IDX_PRODUCT_NAME', ['name'])
@Index('IDX_PRODUCT_PRICE', ['price'])
@Index('IDX_PRODUCT_ACTIVE', ['isActive'])
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToOne(() => Category, category => category.products, {
        eager: true,
        onDelete: 'SET NULL',
    })
    category: Category;

    @Column('text')
    description: string;

    @Column({ type: 'numeric', nullable: true })
    price: number;

    @Column({ type: 'json', nullable: true })
    images: {
        url: string;
        public_id: string;
    }[];

    @Column({ default: 0 })
    stock: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ default: false })
    isConfigurable: boolean;

    @OneToMany(() => Variant, variant => variant.product)
    variants: Variant[];

    @ManyToMany(() => Attribute, attribute => attribute.products)
    @JoinTable()
    attributes: Attribute[];
}