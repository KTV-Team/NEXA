import {
  Controller,
  Get,
  NotImplementedException,
  Patch,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll(): never {
    throw new NotImplementedException('User management is not implemented yet');
  }

  @Get('me')
  getMe(): never {
    throw new NotImplementedException('User management is not implemented yet');
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
