import { PropertyCategory, PropertyStatus, PropertyType } from "@prisma/client";

export interface IGetSavedPropertyResponse {
  savedProperty: {
    id: string;
    property: {
      id: string;
      title: string;
      price: number;
      city: string;
      type: PropertyType;
      category: PropertyCategory;
      status: PropertyStatus;
      primaryImage: string | null;
    };
    createdAt: Date;
  }[];
  totalPages: number;
  page: number;
  total: number;
}

export interface IGetSavedPropertyPayload {
  page: number;
  limit: number;
}
