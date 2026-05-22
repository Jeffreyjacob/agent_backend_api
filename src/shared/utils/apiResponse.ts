import { Response } from "express";

interface ApiResponse<T> {
  success: boolean;
  data?: T | T[];
  message: string;
  meta?: any;
  error?: {
    code: string;
    details?: unknown;
    stack?: string;
  };
}

export class ResponseHelper {
  static success<T>(
    res: Response,
    data: T,
    statusCode: number,
    message: string,
    meta?: any,
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      ...(meta && { meta }),
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = "Resource created successfully!",
  ): Response {
    return this.success(res, data, 200, message);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode: number,
    code: string,
    details?: any,
  ) {
    const response: ApiResponse<null> = {
      success: false,
      message,
      error: {
        code,
        ...(details && { details }),
      },
    };

    return res.status(statusCode).json(response);
  }
}
