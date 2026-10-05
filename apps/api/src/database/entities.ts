import { AuthAccountEntity } from '../auth/entities/auth-account.entity';
import { EventEntity } from '../events/entities/event.entity';
import { EventParticipantEntity } from '../events/entities/event-participant.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationRecipientEntity } from '../notifications/entities/notification-recipient.entity';
import { TeamEntity } from '../teams/entities/team.entity';
import { TeamMemberEntity } from '../teams/entities/team-member.entity';
import { TodoItemEntity } from '../todos/entities/todo-item.entity';
import { TodoListEntity } from '../todos/entities/todo-list.entity';
import { UserEntity } from '../users/entities/user.entity';

export const coreEntities = [
  UserEntity,
  AuthAccountEntity,
  TeamEntity,
  TeamMemberEntity,
  TodoListEntity,
  TodoItemEntity,
  EventEntity,
  EventParticipantEntity,
  NotificationEntity,
  NotificationRecipientEntity,
] as const;
