import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base/entities';

@Entity({ name: 'teams' })
export class TeamEntity extends VersionedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;
}
