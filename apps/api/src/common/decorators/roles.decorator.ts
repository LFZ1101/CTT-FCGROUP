import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** OWNER | ADMIN | DP_MANAGER | ANALYST | AUDITOR | CLIENT | MODERATOR */
export type AppRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DP_MANAGER'
  | 'ANALYST'
  | 'AUDITOR'
  | 'CLIENT'
  | 'MODERATOR';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

/** Moderação da rede colaborativa: OWNER/ADMIN do tenant ou MODERATOR (cross-tenant). */
export const NETWORK_MODERATION_ROLES: AppRole[] = ['OWNER', 'ADMIN', 'MODERATOR'];

export function isNetworkModerator(role?: string | null) {
  return role === 'MODERATOR';
}
