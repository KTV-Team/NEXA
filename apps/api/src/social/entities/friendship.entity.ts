import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'friendships' })
export class FriendshipEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'low_user_id', type: 'uuid' }) lowUserId!: string;
  @Column({ name: 'high_user_id', type: 'uuid' }) highUserId!: string;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
  @Column({ name: 'removed_at', type: 'timestamptz', nullable: true }) removedAt!: Date | null;
}
