import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** OWNER | ADMIN | DP_MANAGER | ANALYST | AUDITOR | CLIENT */
export type AppRole = 'OWNER' | 'ADMIN' | 'DP_MANAGER' | 'ANALYST' | 'AUDITOR' | 'CLIENT';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
