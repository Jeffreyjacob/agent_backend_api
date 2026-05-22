import { Property, PropertyStatus, Role } from "@prisma/client";
import { PropertyRepository } from "./property.repository";
import { PropertyImageRepository } from "./propertyImage.repository";
import {
  ICreatePropertyPayload,
  IGetPropertyQuery,
  IPropertyListResponse,
  IPropertyResponse,
  IUpdatePropertyPayload,
} from "./property.interface";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/error";
import { getUploadImageQueue } from "../../jobs/queues/uploadImage";
import { logger } from "../../config/logger";
import { CacheService } from "../../shared/cache/cache";
import { CacheKey, generateCacheKeyWithQuery } from "../../shared/utils/helper";
import { cloudinary } from "../../config/cloudinary";

export class PropertyService {
  constructor(
    private readonly propertyRepo: PropertyRepository,
    private readonly propertImageRepo: PropertyImageRepository,
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

    const property = await this.propertyRepo.create({
      agentId,
      ...data,
      description: data.description ?? "",
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

    try {
      const uploadImageJob = getUploadImageQueue();
      await uploadImageJob.add("uploadPropertyImage", {
        propertyId: property.id,
        files: files.map((file) => ({
          mimeType: file.mimetype,
          base64: file.buffer.toString("base64"),
        })),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "unable to queue upload image job ");
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
}
