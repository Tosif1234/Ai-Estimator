import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  role: Role;
  tokenVersion: number;
}