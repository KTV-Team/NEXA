import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DevDemoData } from '@nexa/types';
import { IsNull, In, Repository } from 'typeorm';
import { EventEntity } from '../events/entities/event.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationRecipientEntity } from '../notifications/entities/notification-recipient.entity';
import { TeamEntity } from '../teams/entities/team.entity';
import { TeamMemberEntity } from '../teams/entities/team-member.entity';
import { TodoItemEntity } from '../todos/entities/todo-item.entity';
import { TodoListEntity } from '../todos/entities/todo-list.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class DevDemoService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(TeamEntity) private readonly teams: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity) private readonly members: Repository<TeamMemberEntity>,
    @InjectRepository(TodoItemEntity) private readonly todos: Repository<TodoItemEntity>,
    @InjectRepository(TodoListEntity) private readonly lists: Repository<TodoListEntity>,
    @InjectRepository(EventEntity) private readonly events: Repository<EventEntity>,
    @InjectRepository(NotificationEntity) private readonly notifications: Repository<NotificationEntity>,
  ) {}

  async getDemo(): Promise<DevDemoData> {
    try {
      const [users, teams, todoItems, events, notifications] = await Promise.all([
        this.users.find({
          select: { id: true, name: true, systemRole: true },
          where: { deletedAt: IsNull() },
          order: { id: 'ASC' },
          take: 5,
        }),
        this.teams.find({
          select: { id: true, name: true },
          where: { deletedAt: IsNull() },
          order: { id: 'ASC' },
          take: 2,
        }),
        this.todos.createQueryBuilder('todo')
          .innerJoin('todo.list', 'list', 'list.deleted_at IS NULL')
          .leftJoin('list.team', 'team')
          .where('todo.deleted_at IS NULL')
          .andWhere('(list.owner_user_id IS NOT NULL OR team.deleted_at IS NULL)')
          .getCount(),
        this.events.createQueryBuilder('event')
          .leftJoin('event.team', 'team')
          .where('event.deleted_at IS NULL')
          .andWhere('(event.owner_user_id IS NOT NULL OR team.deleted_at IS NULL)')
          .getCount(),
        this.notifications.count({ where: { deletedAt: IsNull() } }),
      ]);

      const activeTeamIds = teams.map((team) => team.id);
      const members = activeTeamIds.length > 0
        ? await this.members.find({ where: { teamId: In(activeTeamIds) }, order: { userId: 'ASC' } })
        : [];
      const membersByTeam = new Map<string, Array<{ userId: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' }>>();
      for (const member of members) {
        const group = membersByTeam.get(member.teamId) ?? [];
        group.push({ userId: member.userId, role: member.role });
        membersByTeam.set(member.teamId, group);
      }

      return {
        database: 'connected',
        users: users.map(({ id, name, systemRole }) => ({ id, name, systemRole })),
        teams: teams.map(({ id, name }) => ({ id, name, members: membersByTeam.get(id) ?? [] })),
        counts: { todoItems, events, notifications },
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }
}
