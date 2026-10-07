import {
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import type { UserEntity } from '../../users/entities/user.entity';

export abstract class TimestampEntity {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

export abstract class AuditedEntity extends TimestampEntity {
  @ManyToOne('UserEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'fk_audit_created_by' })
  createdBy!: UserEntity | null;

  @ManyToOne('UserEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by', foreignKeyConstraintName: 'fk_audit_updated_by' })
  updatedBy!: UserEntity | null;
}

export abstract class SoftDeletableEntity extends AuditedEntity {
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne('UserEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deleted_by', foreignKeyConstraintName: 'fk_audit_deleted_by' })
  deletedBy!: UserEntity | null;
}

export abstract class VersionedEntity extends SoftDeletableEntity {
  @VersionColumn({ name: 'version', type: 'integer', default: 1 })
  version!: number;
}

export abstract class VersionedTimestampEntity extends TimestampEntity {
  @VersionColumn({ name: 'version', type: 'integer', default: 1 })
  version!: number;
}

export abstract class AuditedVersionedEntity extends VersionedEntity {}

export abstract class AuditedTimestampEntity extends TimestampEntity {
  @ManyToOne('UserEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'fk_audit_created_by' })
  createdBy!: UserEntity | null;

  @ManyToOne('UserEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by', foreignKeyConstraintName: 'fk_audit_updated_by' })
  updatedBy!: UserEntity | null;
}
