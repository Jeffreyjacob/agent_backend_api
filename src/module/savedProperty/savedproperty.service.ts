import { PropertyStatus, SavedProperty } from "@prisma/client";
import { SavedPropertyRepository } from "./savedProperty.repository";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/error";
import {
  IGetSavedPropertyPayload,
  IGetSavedPropertyResponse,
} from "./savedproperty.interface";
import { PropertyRepository } from "../property/property.repository";

export class SavedPropertyService {
  constructor(
    private readonly savedPropertyRepo: SavedPropertyRepository,
    private readonly propertyRepo: PropertyRepository,
  ) {}

  async addSavedPropery(
    userId: string,
    propertyId: string,
  ): Promise<SavedProperty> {
    const checkIfSavedPropertyExist = await this.savedPropertyRepo.exists({
      userId,
      propertyId,
    });

    if (checkIfSavedPropertyExist)
      throw new ConflictError("property already exist on saved list");

    const property = await this.propertyRepo.findById(propertyId);
    if (!property) throw new NotFoundError("unable to find property");

    if (property.status === "DRAFT" || property.status === "INACTIVE")
      throw new BadRequestError("You can't add this property to saved list");

    const savedProperty = await this.savedPropertyRepo.addSavedProperty(
      userId,
      propertyId,
    );

    return savedProperty;
  }

  async removeSavedProperty(userId: string, propertyId: string): Promise<void> {
    const findSavedProperty = await this.savedPropertyRepo.findOne({
      userId,
      propertyId,
    });

    if (!findSavedProperty)
      throw new NotFoundError("unable to find property on saved list");

    await this.savedPropertyRepo.removeSavedProperty(userId, propertyId);
  }

  async getSavedLists(
    userId: string,
    data: IGetSavedPropertyPayload,
  ): Promise<IGetSavedPropertyResponse> {
    return await this.savedPropertyRepo.getSavedProperty(userId, data);
  }
}
