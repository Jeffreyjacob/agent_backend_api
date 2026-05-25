import { Prisma, Review } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";
import { IGetPropertyReview, IUpdateReviewPayload } from "./review.interface";

export class ReviewRepository extends BaseRepository<
  Prisma.ReviewDelegate,
  Review
> {
  constructor() {
    super(prisma.review);
  }

  async updateReview(
    reviewId: string,
    data: IUpdateReviewPayload,
  ): Promise<Review | null> {
    return await this.update(
      {
        id: reviewId,
      },
      {
        ...data,
      },
    );
  }

  async getPropertiesReview(propertyId: string): Promise<IGetPropertyReview> {
    const [reviews, aggregate] = await Promise.all([
      await this.findMany({
        where: { propertyId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      await prisma.review.aggregate({
        where: {
          propertyId,
        },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      reviews: reviews.data.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        user: {
          id: (review as any).user.id as string,
          firstName: (review as any).user.firstName as string,
          lastName: (review as any).user.lastName as string,
          email: (review as any).user.email as string,
        },
        createdAt: review.createdAt,
      })),
      averageRating: aggregate._avg.rating ?? 0,
      totalReviews: aggregate._count,
    };
  }
}
