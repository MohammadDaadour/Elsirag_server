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

    // Arabic versions. The Arabic site falls back to the English text when
    // these are empty, so they can be filled in gradually.
    @Column({ type: 'varchar', nullable: true })
    nameAr?: string | null;

    @Column({ type: 'varchar', nullable: true })
    descriptionAr?: string | null;

    // Tile image for the catalogue index. Nullable so existing categories stay
    // valid until someone uploads one.
    @Column({ type: 'json', nullable: true })
    image?: { url: string; public_id: string } | null;

    @OneToMany(() => Product, product => product.category)
    products: Product[];
}
