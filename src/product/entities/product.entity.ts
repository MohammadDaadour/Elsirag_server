import { Entity, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn, Column, ManyToOne } from 'typeorm';
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

    // Arabic versions; the Arabic site falls back to English when empty.
    @Column({ type: 'varchar', nullable: true })
    nameAr?: string | null;

    @Column({ type: 'text', nullable: true })
    descriptionAr?: string | null;

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

    // Units per carton, shown to trade buyers deciding on quantities.
    @Column({ type: 'int', nullable: true })
    packSize: number | null;

    // Free-form spec rows so a pen and a notebook can describe themselves
    // differently without a schema change per product type.
    @Column({ type: 'json', nullable: true })
    specs: { label: string; value: string }[] | null;

    // Sheet-count price list, e.g. [{ label: '60 sheets', price: 45 }].
    @Column({ type: 'json', nullable: true })
    priceOptions: { label: string; labelAr?: string | null; price: number }[] | null;
}