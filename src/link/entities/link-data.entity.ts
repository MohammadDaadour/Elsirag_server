import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('link_data')
export class LinkData {
  @PrimaryColumn()
  token: string;

  @Column()
  userId: string;

  @Column()
  provider: string;

  @Column()
  socialId: string;

  @Column()
  expiresAt: Date;
}