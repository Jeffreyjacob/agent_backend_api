import { redis } from "./config/redis";
import { AuthController } from "./module/authentication/auth.controller";
import { AuthRepository } from "./module/authentication/auth.repository";
import { AuthService } from "./module/authentication/auth.service";
import { RefreshTokenRepository } from "./module/authentication/refreshToken.repository";
import { BookingController } from "./module/bookings/booking.controller";
import { BookingRepository } from "./module/bookings/booking.repository";
import { BookingService } from "./module/bookings/booking.service";
import { PropertyController } from "./module/property/property.controller";
import { PropertyRepository } from "./module/property/property.repository";
import { PropertyService } from "./module/property/property.service";
import { PropertyImageRepository } from "./module/property/propertyImage.repository";
import { UserController } from "./module/users/user.controller";
import { UserRepositrory } from "./module/users/user.repository";
import { UserService } from "./module/users/user.service";
import { CacheService } from "./shared/cache/cache";

const authRepo = new AuthRepository();
const refreshTokenRepo = new RefreshTokenRepository();
const userRepo = new UserRepositrory();
const propertyRepo = new PropertyRepository();
const propertyImageRepo = new PropertyImageRepository();
const cacheService = new CacheService(redis);
const bookingRepo = new BookingRepository();

const authService = new AuthService(authRepo, refreshTokenRepo);
const userService = new UserService(userRepo);
const propertyService = new PropertyService(
  propertyRepo,
  propertyImageRepo,
  bookingRepo,
  cacheService,
);
const bookingService = new BookingService(bookingRepo, propertyRepo, userRepo);

export const authController = new AuthController(authService);
export const userController = new UserController(userService);
export const propertiesController = new PropertyController(propertyService);
export const bookingController = new BookingController(bookingService);
