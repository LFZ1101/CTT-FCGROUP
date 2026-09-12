import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest();
    const role = request.user?.role as AppRole | undefined;
    if (!role) throw new ForbiddenException('Perfil não identificado.');

    if (!required.includes(role)) {
      throw new ForbiddenException(
        `Permissão insuficiente. Requer: ${required.join(', ')}. Seu perfil: ${role}.`,
      );
    }
    return true;
  }
}
