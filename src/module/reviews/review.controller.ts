import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  async createReview(req: Request, res: Response): Promise<void> {
    const result = await this.service.createReview(
      req.user?.userId as string,
      req.body,
    );

    req.log?.info(
      {
        reviewId: result.id,
        propertyId: result.propertyId,
        createdBy: result.userId,
      },
      "review created",
    );

    ResponseHelper.created(
      res,
      {
        id: result.id,
        propertyId: result.propertyId,
        rateing: result.rating,
        comment: result.comment,
      },
      "Review created successfully!",
    );
  }

  async updateReview(req: Request, res: Response): Promise<void> {
    const result = await this.service.updateReview(
      req.user?.userId as string,
      req.params.id as string,
      req.body as any,
    );

    req.log?.info({ reviewId: result.id, updatedBy: req.user?.userId });

    ResponseHelper.success(
      res,
      {
        id: result.id,
        rating: result.rating,
        comment: result.comment,
      },
      200,
      "review updated successfully!",
    );
  }

  async deleteReview(req: Request, res: Response): Promise<void> {
    const result = await this.service.deleteReview(
      req.user?.userId as string,
      req.params.id as string,
    );
    req.log?.info(
      { reviewId: req.params.id, deletedBy: req.user?.userId },
      "review deleted",
    );

    ResponseHelper.noContent(res);
  }

  async getPropertyReviews(req: Request, res: Response): Promise<void> {
    const result = await this.service.getPropertyReview(
      req.params.propertyId as string,
    );
    ResponseHelper.success(res, result, 200, "property reviews fetched");
  }
}
