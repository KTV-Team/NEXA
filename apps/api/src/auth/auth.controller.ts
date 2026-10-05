import { Controller, HttpCode, HttpStatus, NotImplementedException, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(): never {
    throw new NotImplementedException('Authentication is not implemented yet');
  }

  @Post('logout')
  logout(): never {
    throw new NotImplementedException('Authentication is not implemented yet');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(): never {
    throw new NotImplementedException('Authentication is not implemented yet');
  }
}
