import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

@Injectable()
export class ApiEnvelopeInterceptor<T> implements NestInterceptor<T, { success: true; data: T }> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<{ success: true; data: T }> {
    return next.handle().pipe(map((data: T) => ({ success: true as const, data })));
  }
}
