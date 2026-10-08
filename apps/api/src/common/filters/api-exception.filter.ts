import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

interface HttpReply {
  status(code: number): { send(body: unknown): void };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpReply>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const details =
      payload && typeof payload === 'object' && 'details' in payload
        ? (payload as { details?: Record<string, unknown> }).details
        : undefined;
    const code =
      payload && typeof payload === 'object' && 'code' in payload
        ? String((payload as { code: unknown }).code)
        : status === HttpStatus.SERVICE_UNAVAILABLE
          ? 'DATABASE_UNAVAILABLE'
          : status === HttpStatus.TOO_MANY_REQUESTS
            ? 'RATE_LIMITED'
            : status === HttpStatus.NOT_IMPLEMENTED
              ? 'NOT_IMPLEMENTED'
              : status >= 500
                ? 'INTERNAL_SERVER_ERROR'
                : `HTTP_${status}`;
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : exception instanceof HttpException && status < 500
          ? exception.message
          : 'An unexpected error occurred';

    response
      .status(status)
      .send({ success: false, error: { code, message, ...(details ? { details } : {}) } });
  }
}
