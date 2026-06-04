import { Role } from "@prisma/client";

export interface IBuyerRegistrationPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface IAgentRegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}

export interface IResendOtpPayload {
  email: string;
}

export interface IForgetPasswordPayload {
  email: string;
}

export interface IResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export interface ILoginResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface IAuthMessageResponse {
  message: string;
}

export interface IRefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}
