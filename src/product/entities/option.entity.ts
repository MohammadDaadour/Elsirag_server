import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, CreateDateColumn, Index } from 'typeorm';
import { Attribute } from './attribute.entity';
import { Variant } from './variant.entity';

@Entity()
// @Index('IDX_OPTION_VALUE', ['value'])
// @Index('IDX_OPTION_ATTRIBUTE_VALUE', ['attribute', 'value'], { unique: true })
export class Option {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Attribute, attribute => attribute.options)
  attribute: Attribute; 

  @Column({ nullable: false })
  value: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToMany(() => Variant, variant => variant.options)
  variants: Variant[];
}