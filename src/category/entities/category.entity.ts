// src/category/entities/category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from '../../product/entities/product.entity';

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    // @Column({ unique: true })  // Ensure uniqueness
    // slug: string;  // Stores the URL-friendly version

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description?: string;

    @OneToMany(() => Product, product => product.category)
    products: Product[];
}
