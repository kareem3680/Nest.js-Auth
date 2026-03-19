import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiErrorException extends HttpException {
  public readonly statusCode: number;
  public readonly errorStatus: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    const errorStatus = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    super(
      {
        message,
        status: errorStatus,
        statusCode,
      },
      statusCode,
    );

    this.statusCode = statusCode;
    this.errorStatus = errorStatus;
    this.isOperational = true;
  }
}
