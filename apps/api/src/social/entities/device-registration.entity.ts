import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'device_registrations' })
export class DeviceRegistrationEntity {
  @PrimaryColumn({ name: 'installation_id', type: 'uuid' }) installationId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'session_id', type: 'uuid', nullable: true }) sessionId!: string | null;
  @Column({ type: 'varchar', length: 8 }) platform!: 'android' | 'ios';
  @Column({ name: 'push_token', type: 'varchar', length: 512, nullable: true }) pushToken!: string | null;
  @Column({ name: 'permission_status', type: 'varchar', length: 16 }) permissionStatus!: 'granted' | 'provisional' | 'denied' | 'undetermined';
  @Column({ name: 'updated_at', type: 'timestamptz', insert: false, update: false }) updatedAt!: Date;
}
