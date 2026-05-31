import { FeaturedListing, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { BaseRepository } from "../../shared/repository/baseRepository";
import {
  IFeaturedListingsResponse,
  IGetFeaturedListingPayload,
} from "./property.interface";

export class FeaturedListingRepository extends BaseRepository<
  Prisma.FeaturedListingDelegate,
  FeaturedListing
> {
  constructor() {
    super(prisma.featuredListing);
  }

  async getFeaturedListingRepositry(
    userId: string,
    data: IGetFeaturedListingPayload,
  ): Promise<IFeaturedListingsResponse> {
    let where: Prisma.Args<
      Prisma.FeaturedListingDelegate,
      "findMany"
    >["where"] = { agentId: userId };

    if (data.status) {
      where.status = data.status;
    }

    const featuredListings = await this.findMany({
      where,
      orderBy: {
        expiresAt: "asc",
      },
      include: {
        property: {
          select: {
            title: true,
            address: true,
            price: true,
            city: true,
            category: true,
            type: true,
          },
        },
      },
      page: data.page,
      limit: data.limit,
    });

    return {
      data: featuredListings.data,
      meta: {
        total: featuredListings.total,
        totalPages: featuredListings.totalPages,
        page: featuredListings.page,
      },
    };
  }

  async findActiveFeaturedListing(
    propertyId: string,
  ): Promise<FeaturedListing | null> {
    return await this.findOne({
      propertyId,
      status: "ACTIVE",
    });
  }
}
