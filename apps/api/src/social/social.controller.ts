import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import type { AuthIdentity } from '../auth/auth-request';
import { ZodValidationPipe } from '../auth/zod-validation.pipe';
import { cancelNotificationSchema, createNotificationSchema, deviceRegistrationSchema, friendRequestQuerySchema, idParamSchema, inboxQuerySchema, installationIdParamSchema, itemIdParamSchema, readInboxSchema, requestIdParamSchema, sendFriendRequestSchema, updateNotificationSchema } from '@nexa/validation';
import type { CancelNotificationDto, CreateNotificationDto, DeviceRegistrationDto, SendFriendRequestDto, SetInboxReadDto, UpdateNotificationDto } from '@nexa/types';
import { SocialService } from './social.service';
import { NoStoreInterceptor } from '../common/interceptors/no-store.interceptor';

type Reply = { status(code: number): unknown };

@Controller()
@UseGuards(AuthGuard)
@UseInterceptors(NoStoreInterceptor)
export class SocialController {
  constructor(private readonly service: SocialService) {}

  @Post('friend-requests') @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async sendRequest(@CurrentAuth() auth: AuthIdentity, @Body(new ZodValidationPipe(sendFriendRequestSchema)) dto: SendFriendRequestDto, @Res({ passthrough: true }) reply: Reply) {
    const result = await this.service.sendRequest(auth.userId, dto.recipientId);
    reply.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.data;
  }
  @Get('friend-requests')
  listRequests(@CurrentAuth() auth: AuthIdentity, @Query(new ZodValidationPipe(friendRequestQuerySchema)) query: { direction: 'incoming'|'outgoing'; page: number; limit: number }) { return this.service.listRequests(auth.userId, query); }
  @Post('friend-requests/:requestId/accept') @HttpCode(200) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  accept(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(requestIdParamSchema)) params: { requestId: string }) { return this.service.accept(auth.userId, params.requestId); }
  @Post('friend-requests/:requestId/reject') @HttpCode(200) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  reject(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(requestIdParamSchema)) params: { requestId: string }) { return this.service.reject(auth.userId, params.requestId); }
  @Delete('friend-requests/:requestId') @HttpCode(204) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  cancelRequest(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(requestIdParamSchema)) params: { requestId: string }) { return this.service.cancelRequest(auth.userId, params.requestId); }
  @Get('friends') listFriends(@CurrentAuth() auth: AuthIdentity, @Query(new ZodValidationPipe(friendRequestQuerySchema.omit({ direction: true }))) query: { page: number; limit: number }) { return this.service.listFriends(auth.userId, query); }
  @Delete('friends/:id') @HttpCode(204) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  removeFriend(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(idParamSchema)) params: { id: string }) { return this.service.removeFriend(auth.userId, params.id); }

  @Post('notifications') @Throttle({ default: { limit: 30, ttl: 60_000 } })
  createNotification(@CurrentAuth() auth: AuthIdentity, @Body(new ZodValidationPipe(createNotificationSchema)) dto: CreateNotificationDto, @Res({ passthrough: true }) reply: Reply) {
    return this.service.createNotification(auth.userId, dto).then((result) => { reply.status(result.created ? 201 : 200); return result.data; });
  }
  @Get('notifications') listNotifications(@CurrentAuth() auth: AuthIdentity, @Query(new ZodValidationPipe(friendRequestQuerySchema.omit({ direction: true }))) query: { page: number; limit: number }) { return this.service.listNotifications(auth.userId, query); }
  @Get('notifications/:id') getNotification(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(idParamSchema)) params: { id: string }) { return this.service.getNotification(auth.userId, params.id); }
  @Patch('notifications/:id') @Throttle({ default: { limit: 30, ttl: 60_000 } })
  updateNotification(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(idParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(updateNotificationSchema)) dto: UpdateNotificationDto) { return this.service.updateNotification(auth.userId, params.id, dto); }
  @Post('notifications/:id/cancel') @HttpCode(200) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  cancelNotification(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(idParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(cancelNotificationSchema)) dto: CancelNotificationDto) { return this.service.cancelNotification(auth.userId, params.id, dto); }

  @Get('inbox/unread-count') unreadCount(@CurrentAuth() auth: AuthIdentity) { return this.service.unreadCount(auth.userId); }
  @Get('inbox') listInbox(@CurrentAuth() auth: AuthIdentity, @Query(new ZodValidationPipe(inboxQuerySchema)) query: { page: number; limit: number; read?: boolean }) { return this.service.listInbox(auth.userId, query); }
  @Get('inbox/:itemId') getInbox(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(itemIdParamSchema)) params: { itemId: string }) { return this.service.getInbox(auth.userId, params.itemId); }
  @Patch('inbox/:itemId') @Throttle({ default: { limit: 120, ttl: 60_000 } })
  setInboxRead(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(itemIdParamSchema)) params: { itemId: string }, @Body(new ZodValidationPipe(readInboxSchema)) dto: SetInboxReadDto) { return this.service.setInboxRead(auth.userId, params.itemId, dto.read); }
  @Post('inbox/read-all') @HttpCode(200) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  readAll(@CurrentAuth() auth: AuthIdentity) { return this.service.readAll(auth.userId); }
  @Delete('inbox/:itemId') @HttpCode(204) @Throttle({ default: { limit: 120, ttl: 60_000 } })
  deleteInbox(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(itemIdParamSchema)) params: { itemId: string }) { return this.service.deleteInbox(auth.userId, params.itemId); }

  @Put('devices/:installationId') @Throttle({ default: { limit: 30, ttl: 60_000 } })
  registerDevice(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(installationIdParamSchema)) params: { installationId: string }, @Body(new ZodValidationPipe(deviceRegistrationSchema)) dto: DeviceRegistrationDto) {
    return this.service.registerDevice(auth.userId, auth.sessionId, params.installationId, dto);
  }
  @Delete('devices/:installationId') @HttpCode(204) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  deleteDevice(@CurrentAuth() auth: AuthIdentity, @Param(new ZodValidationPipe(installationIdParamSchema)) params: { installationId: string }) {
    return this.service.deleteDevice(auth.userId, params.installationId);
  }
}
