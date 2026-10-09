import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { SearchUserSummary, UpdateUserDto } from '@nexa/types';
import { AuthService } from '../auth/auth.service';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>, private readonly auth: AuthService) {}

  async update(userId: string, dto: UpdateUserDto) {
    await this.users.update({ id: userId, deletedAt: IsNull() }, dto);
    return this.auth.getCurrentUser(userId);
  }

  async search(userId: string, q: string, page: number, limit: number) {
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q);
    const query = this.users.createQueryBuilder('user')
      .where('user.deletedAt IS NULL').andWhere('user.id <> :userId', { userId });
    if (email) query.andWhere('user.email = :email', { email: q.trim().toLowerCase() });
    else {
      const escaped = q.replace(/[\\%_]/g, '\\$&');
      query.andWhere("user.name ILIKE :name ESCAPE '\\'", { name: `%${escaped}%` });
    }
    const [rows, total] = await query.select(['user.id', 'user.name', 'user.avatarUrl'])
      .orderBy('user.name', 'ASC').addOrderBy('user.id', 'ASC')
      .skip((page - 1) * limit).take(limit).getManyAndCount();
    if (rows.length === 0) return { data: [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    const relations = await this.users.manager.query(
      `SELECT target.id, f.id AS friendship_id, r.id AS request_id, r.sender_id
       FROM unnest($2::uuid[]) AS target(id)
       LEFT JOIN friendships f ON f.low_user_id = LEAST($1::uuid, target.id)
         AND f.high_user_id = GREATEST($1::uuid, target.id) AND f.removed_at IS NULL
       LEFT JOIN friend_requests r ON r.status = 'PENDING'
         AND LEAST(r.sender_id, r.recipient_id) = LEAST($1::uuid, target.id)
         AND GREATEST(r.sender_id, r.recipient_id) = GREATEST($1::uuid, target.id)`,
      [userId, rows.map((row) => row.id)],
    ) as { id: string; friendship_id: string | null; request_id: string | null; sender_id: string | null }[];
    const byId = new Map(relations.map((relation) => [relation.id, relation]));
    const data = rows.map((row): SearchUserSummary => {
      const relation = byId.get(row.id);
      return {
        id: row.id,
        name: row.name,
        ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
        relationship: relation?.friendship_id ? 'friend' : relation?.request_id
          ? relation.sender_id === userId ? 'outgoing' : 'incoming' : 'none',
        ...(relation?.request_id && !relation.friendship_id ? { requestId: relation.request_id } : {}),
      };
    });
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
