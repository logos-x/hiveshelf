import { HttpException } from '@nestjs/common';
import { ApiErrorDetail } from '@hiveshelf/shared';

export class AppException extends HttpException {
  constructor(
    code: string,
    message: string,
    status = 400,
    details?: ApiErrorDetail[],
  ) {
    super({ code, message, details }, status);
  }
}
