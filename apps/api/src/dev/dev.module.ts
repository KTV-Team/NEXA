import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from '../events/entities/event.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationRecipientEntity } from '../notifications/entities/notification-recipient.entity';
import { TeamEntity } from '../teams/entities/team.entity';
import { TeamMemberEntity } from '../teams/entities/team-member.entity';
import { TodoItemEntity } from '../todos/entities/todo-item.entity';
import { TodoListEntity } from '../todos/entities/todo-list.entity';
import { UserEntity } from '../users/entities/user.entity';
import { DevController } from './dev.controller';
import { DevDemoService } from './dev-demo.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    UserEntity,
    TeamEntity,
    TeamMemberEntity,
    TodoItemEntity,
    TodoListEntity,
    EventEntity,
    NotificationEntity,
    NotificationRecipientEntity,
  ])],
  controllers: [DevController],
  providers: [DevDemoService],
})
export class DevModule {}
