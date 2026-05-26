import { Request, Response } from "express";
import { SavedPropertyService } from "./savedproperty.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class SavedPropertyController {
  constructor(private readonly service: SavedPropertyService) {}

  async addSavedProperty(req: Request, res: Response): Promise<void> {
    const result = await this.service.addSavedPropery(
      req.user?.userId as string,
      req.params.propertyId as string,
    );
    req.log?.info(
      { properyId: result.propertyId, userId: result.userId },
      "property added on user saved list",
    );
    ResponseHelper.success(res, result, 200, "property added to saved list");
  }

  async removeSavedProperty(req: Request, res: Response): Promise<void> {
    await this.service.removeSavedProperty(
      req.user?.userId as string,
      req.params.propertyId as string,
    );

    req.log?.info(
      { propertyId: req.params.propertyId, userId: req.user?.userId },
      "property removed from saved list",
    );

    ResponseHelper.success(
      res,
      {
        id: req.params.propertyId,
      },
      200,
      "property removed from saved list ",
    );
  }

  async getSavedList(req: Request, res: Response): Promise<void> {
    const result = await this.service.getSavedLists(
      req.user?.userId as string,
      req.body as any,
    );

    ResponseHelper.success(
      res,
      result.savedProperty,
      200,
      "user saved property fetched",
      {
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
      },
    );
  }
}
