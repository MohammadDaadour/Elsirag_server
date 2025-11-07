import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum VerificationType {
    EMAIL_VERIFICATION = 'email_verification',
    PASSWORD_RESET = 'password_reset',
}

@Entity()
export class Verification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column()
    code: string;

    @Column({ type: 'enum', enum: VerificationType })
    type: VerificationType;

    @ManyToOne(() => User, user => user.verifications, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'timestamptz', default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;
}
