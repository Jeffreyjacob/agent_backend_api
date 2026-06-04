import {
  BookingStatus,
  FeaturedListing,
  Property,
  PropertyStatus,
  Role,
} from "@prisma/client";
import { PropertyRepository } from "./property.repository";
import { PropertyImageRepository } from "./propertyImage.repository";
import {
  ICreatePropertyPayload,
  IFeaturedListingsResponse,
  IGetFeaturedListingPayload,
  IGetPropertyQuery,
  IPropertyListResponse,
  IPropertyResponse,
  IUpdatePropertyPayload,
} from "./property.interface";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/error";
import { getUploadImageQueue } from "../../jobs/queues/uploadImage";
import { logger } from "../../config/logger";
import { CacheService } from "../../shared/cache/cache";
import { CacheKey, generateCacheKeyWithQuery } from "../../shared/utils/helper";
import { cloudinary } from "../../config/cloudinary";
import { BookingRepository } from "../bookings/booking.repository";
import { prisma } from "../../config/database";
import { getCancelBookingQueue } from "../../jobs/queues/cancelBooking";
import { getEmailQueue } from "../../jobs/queues/email";
import { bookingCancelledBuyerEmail } from "../../shared/utils/emailTemplate/bookingCancelledBuyerEmail";
import { FeaturedListingRepository } from "./featuredProperty.repository";
import { SubscriptionRepository } from "../subscription/subscription.repository";
import { UserRepositrory } from "../users/user.repository";
import { stripe } from "../../config/stripe";

export class PropertyService {
  constructor(
    private readonly propertyRepo: PropertyRepository,
    private readonly propertImageRepo: PropertyImageRepository,
    private readonly bookingRepo: BookingRepository,
    private readonly featuredListingRepo: FeaturedListingRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly userRepo: UserRepositrory,
    private readonly cacheService: CacheService,
  ) {}

  async createProperty(
    agentId: string,
    data: ICreatePropertyPayload,
  ): Promise<Property> {
    const checkIfPropertyExist = await this.propertyRepo.exists({
      agentId,
      address: data.address,
      type: data.type,
    });

    if (checkIfPropertyExist) throw new ConflictError("Property already exist");

    const property = await prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          agentId,
          ...data,
          description: data.description ?? "",
        },
      });

      const subscription = await tx.subscription.findFirst({
        where: {
          userId: agentId,
        },
      });

      if (!subscription)
        throw new NotFoundError("unable to find user subscription");

      await tx.packageRecord.update({
        where: {
          subscriptionCycleId: subscription.subscriptionCycleId!,
        },
        data: {
          propertiesUsed: { increment: 1 },
        },
      });

      return property;
    });

    try {
      await this.cacheService.scanAndDelete(`${CacheKey.Properties}:*`);
    } catch (error: any) {
      logger.warn({ err: error }, "unable to invalidate propertie cache");
    }

    return property;
  }

  async uploadImage(
    userId: string,
    propertyId: string,
    files: Express.Multer.File[],
  ): Promise<{ message: string }> {
    const property = await this.propertyRepo.findOne({
      id: propertyId,
      agentId: userId,
    });

    if (!property) throw new NotFoundError("unable to find property");

    // Convert and validate before queuing
    const serializedFiles = files.map((file) => {
      const base64 = file.buffer.toString("base64");

      if (!base64 || base64.length === 0) {
        throw new BadRequestError("Invalid file buffer");
      }

      return {
        mimeType: file.mimetype,
        base64,
        originalName: file.originalname,
        size: file.size,
      };
    });

    try {
      const uploadImageJob = getUploadImageQueue();
      await uploadImageJob.add(
        "uploadPropertyImage",
        {
          propertyId: property.id,
          files: serializedFiles,
        },
        {
          attempts: 3, // retry on failure
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );
    } catch (error: any) {
      logger.warn({ err: error }, "unable to queue upload image job");
      throw new BadRequestError("unable to queue image upload");
    }

    try {
      await this.cacheService.scanAndDelete(`${CacheKey.Properties}:*`);
    } catch (error: any) {
      logger.warn({ err: error }, "unable to invalidate propertie cache");
    }

    return {
      message: "Image's are being uploaded",
    };
  }

  async setImageAsPrimary(
    userId: string,
    propertyId: string,
    imageId: string,
  ): Promise<{ message: string }> {
    const property = await this.propertyRepo.findOne({
      id: propertyId,
      agentId: userId,
    });

    if (!property) throw new NotFoundError("unable to find property");

    const updateImage = await this.propertImageRepo.setPrimaryImage(
      imageId,
      property.id,
    );

    if (!updateImage) throw new BadRequestError("unable to update image");

    try {
      await this.cacheService.scanAndDelete(`${CacheKey.Properties}:*`);
    } catch (error: any) {
      logger.warn({ err: error }, "unable to invalidate propertie cache");
    }

    return {
      message: "image has been set to primary image",
    };
  }

  async deletePropertyImage(
    userId: string,
    propertyId: string,
    imageId: string,
  ): Promise<{ message: string }> {
    const property = await this.propertyRepo.findOne({
      id: propertyId,
      agentId: userId,
    });

    if (!property) throw new NotFoundError("unable to find property");

    const findImage = await this.propertImageRepo.findOne({
      propertyId: property.id,
      id: imageId,
    });

    if (!findImage) throw new NotFoundError("unable to find image");

    await cloudinary.uploader.destroy(findImage.publicId);
    await this.propertImageRepo.deleteImage(findImage.id);

    try {
      await this.cacheService.scanAndDelete(`${CacheKey.Properties}:*`);
    } catch (error: any) {
      logger.warn({ err: error }, "unable to invalidate propertie cache");
    }

    return {
      message: "image has been deleted successfully!",
    };
  }

  async getProperties(data: IGetPropertyQuery): Promise<IPropertyListResponse> {
    // check cache first

    const key = generateCacheKeyWithQuery(CacheKey.Properties, data);

    const cacheResult = await this.cacheService.get<IPropertyListResponse>(key);
    if (cacheResult) return cacheResult;

    const lockAquired = await this.cacheService.acquireLock(key);

    if (lockAquired) {
      try {
        const result = await this.propertyRepo.findProperties(data);
        await this.cacheService.set(key, result, 300);
        return result;
      } finally {
        await this.cacheService.releaseLock(key);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.getProperties(data);
    }
  }

  async getPropertyById(propertyId: string): Promise<IPropertyResponse> {
    const key = `${CacheKey.Property}:${propertyId}`;
    const cacheHit = await this.cacheService.get<IPropertyResponse>(key);
    if (cacheHit) return cacheHit;

    const lockAquired = await this.cacheService.acquireLock(key);

    if (lockAquired) {
      try {
        const property = await this.propertyRepo.findProperty(propertyId);
        if (!property) throw new NotFoundError("unable to find product");
        await this.cacheService.set(key, property, 300);
        return property;
      } finally {
        await this.cacheService.releaseLock(key);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.getPropertyById(propertyId);
    }
  }
  async updateProperty(
    userId: string,
    propertyId: string,
    data: IUpdatePropertyPayload,
    role: Role,
  ): Promise<Property> {
    const property = await this.propertyRepo.findOne({
      id: propertyId,
      ...(role === Role.AGENT && { agentId: userId }),
    });

    if (!property) throw new NotFoundError("unable to find property");

    if (data.status) {
      const statusCheck: Record<PropertyStatus, PropertyStatus[]> = {
        [PropertyStatus.DRAFT]: [PropertyStatus.ACTIVE],
        [PropertyStatus.ACTIVE]: [
          PropertyStatus.PENDING,
          PropertyStatus.RENTED,
          PropertyStatus.SOLD,
          PropertyStatus.INACTIVE,
        ],
        [PropertyStatus.PENDING]: [
          PropertyStatus.ACTIVE,
          PropertyStatus.INACTIVE,
          PropertyStatus.SOLD,
          PropertyStatus.RENTED,
        ],
        [PropertyStatus.INACTIVE]: [PropertyStatus.ACTIVE],
        [PropertyStatus.SOLD]: [],
        [PropertyStatus.RENTED]: [
          PropertyStatus.ACTIVE,
          PropertyStatus.PENDING,
          PropertyStatus.INACTIVE,
        ],
      };

      if (data.status === PropertyStatus.ACTIVE) {
        const images = await this.propertImageRepo.findByPropertyId(propertyId);
        if (images.length === 0) {
          throw new BadRequestError(
            "Cannot publish property without at least one image",
          );
        }
      }

      if (!statusCheck[property.status].includes(data.status))
        throw new BadRequestError("unable to update property to this status");

      if (data.status === "RENTED" || data.status === "SOLD") {
        const pendingBooking = await this.bookingRepo.findMany({
          where: {
            status: "PENDING",
            propertyId: property.id,
          },
          include: {
            buyer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        for (const booking of pendingBooking.data) {
          if (booking.autoConfirmJobId) {
            const cancelQueue = getCancelBookingQueue();
            await cancelQueue.remove(booking.autoConfirmJobId);
          }
        }

        const confirmedBooking = await this.bookingRepo.findMany({
          where: {
            status: "CONFIRMED",
            propertyId: property.id,
          },
          include: {
            reminderJobs: true,
            buyer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        for (const booking of confirmedBooking.data as any) {
          if (booking.reminderJobs.length > 0) {
            const emailJob = getEmailQueue();
            await Promise.all(
              booking.reminderJobs.map(
                async (job: any) => await emailJob.remove(job.reminderJobId),
              ),
            );
          }
        }

        await prisma.$transaction(async (tx) => {
          await tx.booking.updateMany({
            where: {
              propertyId: property.id,
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            },
            data: {
              status: BookingStatus.CANCELLED,
              cancelReason: `Property has been ${data.status?.toLowerCase()}`,
              cancelledBy: userId,
            },
          });

          await tx.bookingReminderJob.deleteMany({
            where: {
              bookingId: {
                in: confirmedBooking.data.map((booking) => booking.id),
              },
            },
          });
        });

        for (const booking of pendingBooking.data) {
          try {
            const emailJob = getEmailQueue();
            await emailJob.add("email", {
              email: (booking as any).buyer.email,
              subject: "Booking Cancelled",
              html: bookingCancelledBuyerEmail({
                buyerName: `${(booking as any).buyer.firstName} ${(booking as any).buyer.lastName}`,
                bookingId: booking.id,
                agentName: `${(booking as any).agent.firstName} ${(booking as any).agent.lastName}`,
                propertyTitle: property.title,
                propertyAddress: property.address,
                viewingDate: booking.startTime.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
                viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                cancelReason: `Property has been ${data.status?.toLowerCase()}`,
              }),
            });
          } catch (error: any) {
            logger.warn({ err: error }, "unable to add email job to queue");
          }
        }

        for (const booking of confirmedBooking.data) {
          try {
            const emailJob = getEmailQueue();
            await emailJob.add("email", {
              email: (booking as any).buyer.email,
              subject: "Booking Cancelled",
              html: bookingCancelledBuyerEmail({
                buyerName: `${(booking as any).buyer.firstName} ${(booking as any).buyer.lastName}`,
                bookingId: booking.id,
                agentName: `${(booking as any).agent.firstName} ${(booking as any).agent.lastName}`,
                propertyTitle: property.title,
                propertyAddress: property.address,
                viewingDate: booking.startTime.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
                viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                cancelReason: `Property has been ${data.status?.toLowerCase()}`,
              }),
            });
          } catch (error: any) {
            logger.warn({ err: error }, "unable to add email job to queue");
          }
        }
      }
    }

    const updateProperty = await this.propertyRepo.update(
      {
        id: property.id,
      },
      {
        ...data,
      },
    );

    if (!updateProperty) throw new BadRequestError("unable to update property");

    const updatedPropertyData =
      await this.propertyRepo.findProperty(propertyId);

    try {
      const key = `${CacheKey.Property}:${propertyId}`;
      await this.cacheService.del(key);
      await this.cacheService.set(key, updatedPropertyData, 300);
    } catch (error: any) {
      logger.warn({ err: error, propertyId }, "unable to cache property");
    }

    try {
      await this.cacheService.scanAndDelete(`${CacheKey.Properties}:*`);
    } catch (err: any) {
      logger.warn({ err, propertyId }, "unable to invalidate property pattern");
    }

    return updateProperty;
  }

  async deleteProperty(
    userId: string,
    propertyId: string,
    role: Role,
  ): Promise<{ message: string }> {
    const property = await this.propertyRepo.findOne({
      id: propertyId,
      ...(role === Role.AGENT && { agentId: userId }),
    });

    if (!property) throw new BadRequestError("Unable to find property");

    if (property.status === PropertyStatus.ACTIVE)
      throw new BadRequestError(
        "You can't delete an active listing, you have to make it inactive ",
      );

    const image = await this.propertImageRepo.findByPropertyId(propertyId);

    if (image.length > 0) {
      await Promise.allSettled(
        image.map((img) => cloudinary.uploader.destroy(img.publicId)),
      );
    }

    await this.propertyRepo.delete({
      id: property.id,
    });

    try {
      const key = `${CacheKey.Property}:${propertyId}`;
      await this.cacheService.del(key);
    } catch (error: any) {
      logger.warn(
        { err: error, propertyId },
        "unable to delete cache on product",
      );
    }

    try {
      await this.cacheService.scanAndDelete(`${CacheKey.Properties}:*`);
    } catch (err: any) {
      logger.warn(
        { err, propertyId },
        "unable to invalidate pattern of properties",
      );
    }

    return {
      message: "Property has been deleted",
    };
  }

  async createFeaturedListing(
    userId: string,
    propertyId: string,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    const property = await this.propertyRepo.findOne({
      id: propertyId,
      agentId: userId,
    });

    if (!property) throw new NotFoundError("unable to find property");

    const subscription = await this.subscriptionRepo.findOne({
      userId,
      status: { in: ["ACTIVE", "TRIAL"] },
    });

    if (!subscription) throw new ForbiddenError("Acitve subscription required");

    const existingFeatured =
      await this.featuredListingRepo.findActiveFeaturedListing(propertyId);

    if (existingFeatured)
      throw new ConflictError("Property is already featured");

    const user = await this.userRepo.findById(userId);
    if (!user?.stripeCustomerId)
      throw new BadRequestError("Please set up payment method first");

    const today = new Date().toISOString().split("T")[0];

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: 1900,
        currency: "usd",
        customer: user.stripeCustomerId,
        metadata: {
          type: "featured_listing",
          propertyId,
          agentId: userId,
        },
        description: `Featured listing for ${property.title}`,
      },
      {
        idempotencyKey: `featured:${propertyId}:${userId}:${today}`,
      },
    );

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }
  async getFeaturedListing(
    userId: string,
    data: IGetFeaturedListingPayload,
  ): Promise<IFeaturedListingsResponse> {
    return await this.featuredListingRepo.getFeaturedListingRepositry(
      userId,
      data,
    );
  }
}
