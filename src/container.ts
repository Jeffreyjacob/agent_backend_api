import { AuthController } from "./module/authentication/auth.controller";
import { AuthRepository } from "./module/authentication/auth.repository";
import { AuthService } from "./module/authentication/auth.service";
import { RefreshTokenRepository } from "./module/authentication/refreshToken.repository";

const authRepo = new AuthRepository();
const refreshTokenRepo = new RefreshTokenRepository();

const authService = new AuthService(authRepo, refreshTokenRepo);

export const authController = new AuthController(authService);
