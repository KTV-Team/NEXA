import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface HttpReply {
  status(code: number): { send(body: unknown): void };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpReply>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = status === HttpStatus.SERVICE_UNAVAILABLE
      ? 'DATABASE_UNAVAILABLE'
      : status === HttpStatus.NOT_IMPLEMENTED
        ? 'NOT_IMPLEMENTED'
        : status >= 500
          ? 'INTERNAL_SERVER_ERROR'
          : `HTTP_${status}`;
    const message = exception instanceof HttpException
      ? exception.message
      : 'An unexpected error occurred';

    response.status(status).send({ success: false, error: { code, message } });
  }
}
