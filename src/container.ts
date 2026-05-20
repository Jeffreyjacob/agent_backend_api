import { AuthController } from "./module/authentication/auth.controller";
import { AuthRepository } from "./module/authentication/auth.repository";
import { AuthService } from "./module/authentication/auth.service";
import { RefreshTokenRepository } from "./module/authentication/refreshToken.repository";
import { UserController } from "./module/users/user.controller";
import { UserRepositrory } from "./module/users/user.repository";
import { UserService } from "./module/users/user.service";

const authRepo = new AuthRepository();
const refreshTokenRepo = new RefreshTokenRepository();
const userRepo = new UserRepositrory();

const authService = new AuthService(authRepo, refreshTokenRepo);
const userService = new UserService(userRepo);

export const authController = new AuthController(authService);
export const userController = new UserController(userService);
