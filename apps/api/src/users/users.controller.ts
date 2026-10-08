import { Controller, Get, Header, NotImplementedException, Patch, Query, UseGuards, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import type { AuthIdentity } from '../auth/auth-request';
import { UsersService } from './users.service';
import { ZodValidationPipe } from '../auth/zod-validation.pipe';
import { updateUserSchema, userSearchSchema } from '@nexa/validation';
import type { UpdateUserDto } from '@nexa/types';

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}

  @Get()
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findAll(@CurrentAuth() identity: AuthIdentity, @Query(new ZodValidationPipe(userSearchSchema)) query: { q: string; page: number; limit: number }) {
    return this.users.search(identity.userId, query.q, query.page, query.limit);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'no-store')
  getMe(@CurrentAuth() identity: AuthIdentity) {
    return this.auth.getCurrentUser(identity.userId);
  }

  @Get(':id')
  findOne(): never {
    throw new NotImplementedException('User management is not implemented yet');
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  updateMe(@CurrentAuth() identity: AuthIdentity, @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto) {
    return this.users.update(identity.userId, dto);
  }
}
