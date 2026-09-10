import { apiClient } from './apiClient';

export interface VerifyResetOtpDto {
  email: string;
  otp: string;
}

export interface ResetPasswordDto {
  email: string;
  resetToken?: string;
  otp?: string;
  newPassword: string;
}

export const authApi = {
  forgotPassword: async (email: string) => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  verifyResetOtp: async (data: VerifyResetOtpDto) => {
    return apiClient.post('/auth/verify-reset-otp', data) as Promise<{ message: string; resetToken?: string }>;
  },

  resetPassword: async (data: ResetPasswordDto) => {
    return apiClient.post('/auth/reset-password', data);
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    return apiClient.post('/auth/change-password', data);
  },
};
