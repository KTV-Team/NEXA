import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthIdentity } from './auth-request';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthIdentity =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user!,
);
