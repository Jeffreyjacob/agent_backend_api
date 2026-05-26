import { Prisma, SavedProperty } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";
import {
  IGetSavedPropertyPayload,
  IGetSavedPropertyResponse,
} from "./savedproperty.interface";

export class SavedPropertyRepository extends BaseRepository<
  Prisma.SavedPropertyDelegate,
  SavedProperty
> {
  constructor() {
    super(prisma.savedProperty);
  }

  async addSavedProperty(
    userId: string,
    propertyId: string,
  ): Promise<SavedProperty> {
    return await this.create({
      userId,
      propertyId,
    });
  }

  async removeSavedProperty(userId: string, propertyId: string): Promise<void> {
    await this.delete({
      userId_propertyId: {
        userId,
        propertyId,
      },
    });
  }

  async getSavedProperty(
    userId: string,
    data: IGetSavedPropertyPayload,
  ): Promise<IGetSavedPropertyResponse> {
    const properties = await this.findMany({
      where: {
        userId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            city: true,
            type: true,
            category: true,
            status: true,
            images: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
      page: data.page,
      limit: data.limit,
    });

    return {
      savedProperty: properties.data.map((p: any) => ({
        id: p.id,
        property: {
          id: p.property.id,
          title: p.property.title,
          price: p.property.price,
          city: p.property.city,
          type: p.property.type,
          category: p.property.category,
          status: p.property.status,
          primaryImage:
            p.property.images.find((img: any) => img.isPrimary)?.url ?? null,
        },
        createdAt: p.createdAt,
      })),
      total: properties.total,
      totalPages: properties.totalPages,
      page: properties.page,
    };
  }
}
