import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
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
