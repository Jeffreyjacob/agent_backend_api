import { Logger } from "pino";
import { ITokenPayload } from "../module/authentication/auth.interface";

declare module "express-serve-static-core" {
  interface Request {
    user?: ITokenPayload;
    requestId?: string;
    log?: Logger;
    token?: string;
  }
}
