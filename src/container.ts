import e from "express";
import { redis } from "./config/redis";
import { AuthController } from "./module/authentication/auth.controller";
import { AuthRepository } from "./module/authentication/auth.repository";
import { AuthService } from "./module/authentication/auth.service";
import { RefreshTokenRepository } from "./module/authentication/refreshToken.repository";
import { BookingController } from "./module/bookings/booking.controller";
import { BookingRepository } from "./module/bookings/booking.repository";
import { BookingService } from "./module/bookings/booking.service";
import { PaymentRepository } from "./module/payments/payment.repository";
import { PaymentWebhookService } from "./module/payments/payment.service";
import { WebHookEventRepository } from "./module/payments/webhookEvent.repository";
import { PropertyController } from "./module/property/property.controller";
import { PropertyRepository } from "./module/property/property.repository";
import { PropertyService } from "./module/property/property.service";
import { PropertyImageRepository } from "./module/property/propertyImage.repository";
import { ReviewController } from "./module/reviews/review.controller";
import { ReviewRepository } from "./module/reviews/review.repository";
import { ReviewService } from "./module/reviews/review.service";
import { SavedPropertyController } from "./module/savedProperty/savedproperty.controller";
import { SavedPropertyRepository } from "./module/savedProperty/savedProperty.repository";
import { SavedPropertyService } from "./module/savedProperty/savedproperty.service";
import { SubscriptionRepository } from "./module/subscription/subscription.repository";
import { UserController } from "./module/users/user.controller";
import { UserRepositrory } from "./module/users/user.repository";
import { UserService } from "./module/users/user.service";
import { CacheService } from "./shared/cache/cache";
import { PaymentController } from "./module/payments/payment.controller";

const authRepo = new AuthRepository();
const refreshTokenRepo = new RefreshTokenRepository();
const userRepo = new UserRepositrory();
const propertyRepo = new PropertyRepository();
const propertyImageRepo = new PropertyImageRepository();
const cacheService = new CacheService(redis);
const bookingRepo = new BookingRepository();
const reviewRepo = new ReviewRepository();
const savedPropertyRepo = new SavedPropertyRepository();
const subscriptionRepo = new SubscriptionRepository();
const webhookEventRepo = new WebHookEventRepository();
const paymentRepo = new PaymentRepository();

const authService = new AuthService(authRepo, refreshTokenRepo);
const userService = new UserService(userRepo);
const propertyService = new PropertyService(
  propertyRepo,
  propertyImageRepo,
  bookingRepo,
  cacheService,
);
const bookingService = new BookingService(bookingRepo, propertyRepo, userRepo);
const reviewService = new ReviewService(reviewRepo, bookingRepo);
const savedPropertyService = new SavedPropertyService(
  savedPropertyRepo,
  propertyRepo,
);
const paymentService = new PaymentWebhookService(
  paymentRepo,
  subscriptionRepo,
  userRepo,
  propertyRepo,
  webhookEventRepo,
);

export const authController = new AuthController(authService);
export const userController = new UserController(userService);
export const propertiesController = new PropertyController(propertyService);
export const bookingController = new BookingController(bookingService);
export const reviewController = new ReviewController(reviewService);
export const savedPropertyController = new SavedPropertyController(
  savedPropertyService,
);
export const paymentController = new PaymentController(paymentService);
