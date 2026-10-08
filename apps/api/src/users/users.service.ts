import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { UpdateUserDto, UserSummary } from '@nexa/types';
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
    return { data: rows.map((row): UserSummary => ({ id: row.id, name: row.name, ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}) })), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
