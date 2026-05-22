import { Prisma, PropertyImage } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";

export class PropertyImageRepository extends BaseRepository<
  Prisma.PropertyImageDelegate,
  PropertyImage
> {
  constructor() {
    super(prisma.propertyImage);
  }

  async createImage({
    propertyId,
    url,
    publicId,
  }: {
    propertyId: string;
    url: string;
    publicId: string;
  }): Promise<PropertyImage> {
    return await this.create({ propertyId, url, publicId });
  }

  async findByPropertyId(propertyId: string): Promise<PropertyImage[] | []> {
    const result = await this.findMany({ where: { propertyId } });
    return result.data;
  }

  async findbyImageId(id: string): Promise<PropertyImage | null> {
    return await this.findById(id);
  }

  async deleteImage(id: string): Promise<PropertyImage> {
    return await this.delete({ id });
  }

  async setPrimaryImage(
    id: string,
    propertyId: string,
  ): Promise<PropertyImage> {
    await this.updateMany({
      where: {
        propertyId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    return this.update(
      {
        id,
        propertyId,
      },
      {
        isPrimary: true,
      },
    );
  }
}
