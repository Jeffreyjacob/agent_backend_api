import { Request, Response } from "express";
import { PropertyService } from "./property.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";
import { BadRequestError } from "../../shared/error";
import { Role } from "@prisma/client";

export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  async createProperty(req: Request, res: Response): Promise<void> {
    const result = await this.service.createProperty(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info({ propertyId: result.id }, "property created");
    ResponseHelper.created(res, result, "Property created successfully!");
  }

  async uploadImage(req: Request, res: Response): Promise<void> {
    if (!req.files) throw new BadRequestError("Please upload a image file");
    const propertyId = req.params.id as string;
    const result = await this.service.uploadImage(
      req.user?.userId as string,
      propertyId,
      req.files as Express.Multer.File[],
    );
    req.log?.info({ propertyId: req.params.id }, "image uploaded for property");
    ResponseHelper.success(res, { propertyId }, 200, result.message);
  }

  async setImageAsPrimary(req: Request, res: Response): Promise<void> {
    const propertyId = req.params.id as string;
    const imageId = req.params.imageId as string;
    const result = await this.service.setImageAsPrimary(
      req.user?.userId as string,
      propertyId,
      imageId,
    );
    req.log?.info({ propertyId, imageId }, "image set to primary image");
    ResponseHelper.success(res, { propertyId, imageId }, 200, result.message);
  }

  async deleteImage(req: Request, res: Response): Promise<void> {
    const propertyId = req.params.id as string;
    const imageId = req.params.imageId as string;

    await this.service.deletePropertyImage(
      req.user?.userId as string,
      propertyId,
      imageId,
    );

    req.log?.info({ propertyId, imageId }, "image deleted from property");
    ResponseHelper.noContent(res);
  }

  async getProperties(req: Request, res: Response): Promise<void> {
    const result = await this.service.getProperties(req.query as any);
    ResponseHelper.success(
      res,
      result.data,
      200,
      "properties fetched",
      result.meta,
    );
  }

  async getPropertyById(req: Request, res: Response): Promise<void> {
    const propertyId = req.params.id as string;
    const result = await this.service.getPropertyById(propertyId);
    ResponseHelper.success(res, result, 200, "property fetched");
  }

  async updateProperty(req: Request, res: Response): Promise<void> {
    const propertyId = req.params.id as string;
    const result = await this.service.updateProperty(
      req.user?.userId as string,
      propertyId,
      req.body as any,
      req.user?.role as Role,
    );

    req.log?.info({ propertyId }, "property updated");
    ResponseHelper.success(res, result, 200, "property updated successfully!");
  }

  async deleteProperty(req: Request, res: Response): Promise<void> {
    const propertyId = req.params.id as string;
    await this.service.deleteProperty(
      req.user?.userId as string,
      propertyId,
      req.user?.role as Role,
    );
    req.log?.info({ propertyId }, "property deleted");
    ResponseHelper.noContent(res);
  }

  async createFeaturedListing(req: Request, res: Response): Promise<void> {
    const propertyId = req.params.propertyId as string;
    const result = await this.service.createFeaturedListing(
      req.user?.userId as string,
      propertyId,
    );
    req.log?.info(
      { propertyId, userId: req.user?.userId },
      "property has been featured",
    );
    ResponseHelper.success(res, result, 200, "");
  }

  async getFeaturedListings(req: Request, res: Response): Promise<void> {
    const result = await this.service.getFeaturedListing(
      req.user?.userId as string,
      req.query as any,
    );
    ResponseHelper.success(
      res,
      result.data,
      200,
      "featured listing fetched",
      result.meta,
    );
  }
}
