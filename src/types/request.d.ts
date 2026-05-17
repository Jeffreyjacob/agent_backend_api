import { Logger } from "pino";

export interface ITokenPayload {
  id: string;
  email: string;
  role: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: ITokenPayload;
    requestId?: string;
    log?: Logger;
    token?: string;
  }
}
