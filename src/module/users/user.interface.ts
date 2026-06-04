export interface IUpdateBuyerPayload {
  firstName?: string;
  lastName?: string;
}

export interface IUpdateAgentPayload {
  firstName?: string;
  lastName?: string;
  defaultViewingDuration?: number;
}

export interface IChangePassword {
  currentPassword: string;
  newPassword: string;
}

export interface IGetUserProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  defaultViewingDuration: number | null;
  isActive: boolean;
}

export interface IUpdateBuyerResponse {
  id: string;
  firstName: string;
  lastName: string;
}

export interface IUpdateAgentResponse {
  id: string;
  firstName: string;
  lastName: string;
  defaultViewingDuration: number | null;
}
