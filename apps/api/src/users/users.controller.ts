import { Controller, Get, Header, NotImplementedException, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import type { AuthIdentity } from '../auth/auth-request';

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  findAll(): never {
    throw new NotImplementedException('User management is not implemented yet');
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
  updateMe(): never {
    throw new NotImplementedException('User management is not implemented yet');
  }
}
