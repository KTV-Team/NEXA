import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { FriendRequestStatus } from '@nexa/types';

@Entity({ name: 'friend_requests' })
export class FriendRequestEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'sender_id', type: 'uuid' }) senderId!: string;
  @Column({ name: 'recipient_id', type: 'uuid' }) recipientId!: string;
  @Column({ type: 'varchar', length: 16 }) status!: FriendRequestStatus;
  @Column({ name: 'friendship_id', type: 'uuid', nullable: true }) friendshipId!: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', insert: false, update: false }) updatedAt!: Date;
}
