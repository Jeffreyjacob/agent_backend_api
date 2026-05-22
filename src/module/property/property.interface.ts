import {
  Property,
  PropertyCategory,
  PropertyImage,
  PropertyStatus,
  PropertyType,
  Review,
  User,
} from "@prisma/client";

export enum PropertySortEnum {
  PriceAsc = "PriceAsc",
  PriceDsc = "PriceDsc",
  DateDsc = "DateDsc",
  Featured_First = "Featured_First",
}

export interface ICreatePropertyPayload {
  title: string;
  description?: string;
  type: PropertyType;
  category: PropertyCategory;
  price: number;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  viewingDuration?: number;
}

export interface IUpdatePropertyPayload {
  title?: string;
  description?: string;
  price?: number;
  status?: PropertyStatus;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  viewingDuration?: number;
}

export interface IGetPropertyQuery {
  price?: {
    min: number;
    max: number;
  };
  type?: PropertyType;
  status: PropertyStatus;
  category?: PropertyCategory;
  city?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
  agentId?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  sort?: PropertySortEnum;
}

export interface IPropertyListResponse {
  data: Property[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
  };
}

export interface IUploadImageResponse {
  id: string;
  propertyId: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
}

export interface IPropertyResponse extends Property {
  images: Pick<PropertyImage, "id" | "url" | "isPrimary" | "publicId">[];
  reviews: Pick<Review, "id" | "rating" | "comment" | "createdAt"> &
    {
      user: Pick<User, "id" | "firstName" | "lastName">;
    }[];
  agent: Pick<User, "id" | "firstName" | "lastName" | "email">;
}
