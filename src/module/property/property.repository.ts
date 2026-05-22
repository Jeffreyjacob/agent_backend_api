import { Prisma, Property } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";
import {
  IGetPropertyQuery,
  IPropertyListResponse,
  IPropertyResponse,
  PropertySortEnum,
} from "./property.interface";

export class PropertyRepository extends BaseRepository<
  Prisma.PropertyDelegate,
  Property
> {
  constructor() {
    super(prisma.property);
  }

  async findProperties(
    data: IGetPropertyQuery,
  ): Promise<IPropertyListResponse> {
    let query: Prisma.Args<Prisma.PropertyDelegate, "findMany">["where"] = {};
    let orderBy: Prisma.Args<Prisma.PropertyDelegate, "findMany">["orderBy"] = {
      createdAt: "asc",
    };

    if (data.category) {
      query.category = data.category;
    }

    if (data.type) {
      query.type = data.type;
    }

    if ((data.price && data.price.min) || (data.price && data.price?.max)) {
      query.price = {
        ...(data.price.min && { gte: data.price.min }),
        ...(data.price.max && { lte: data.price.max }),
      };
    }

    if (data.city) {
      query.city = data.city;
    }

    if (data.minBedrooms || data.maxBedrooms) {
      query.bedrooms = {
        ...(data.minBedrooms && { gte: data.minBedrooms }),
        ...(data.maxBedrooms && { lte: data.maxBedrooms }),
      };
    }

    if (data.agentId) {
      query.agentId = data.agentId;
    }

    if (data.sort) {
      if (data.sort === PropertySortEnum.PriceAsc) {
        orderBy = { price: "asc" };
      } else if (data.sort === PropertySortEnum.PriceDsc) {
        orderBy = { price: "desc" };
      } else if (data.sort === PropertySortEnum.DateDsc) {
        orderBy = { createdAt: "desc" };
      } else if (data.sort === PropertySortEnum.Featured_First) {
        orderBy = { featured: "asc" };
      }
    }

    const product = await this.findMany({
      where: query,
      orderBy,
      page: data.page,
      limit: data.limit,
    });

    return {
      data: product.data,
      meta: {
        total: product.total,
        totalPages: product.totalPages,
        page: product.page,
      },
    };
  }

  async findProperty(propertyId: string): Promise<IPropertyResponse | null> {
    const property = await this.findOne(
      {
        id: propertyId,
      },
      {
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
            publicId: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    );

    return property as IPropertyResponse | null;
  }
}
