export type User = {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string | null;
  phone?: string | null;
};

export type LoginPayload = {
  email?: string;
  identifier?: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type AuthSession = {
  accessToken: string;
  user: User;
};

export type InviteUserData = {
  email: string;
  role: "admin" | "manager" | "worker" | string;
  temporaryPassword?: string;
};

export type ForgotPasswordData = {
  email: string;
};

export type ForgotPasswordResponse = {
  forgotToken: string;
  otp?: string;
};

export type VerifyOtpData = {
  forgotToken: string;
  otp: string;
};

export type VerifyOtpResponse = {
  resetToken: string;
};

export type ResetPasswordData = {
  resetToken: string;
  newPassword: string;
};

export type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};
