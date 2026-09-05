import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { VerifiedRequest } from './internal-auth.guard';

export type AuthenticatedRequest = VerifiedRequest & { userId: string };

/**
 * Identity is set only by the global signature/replay guard, never by a browser header.
 */
@Injectable()
export class ApiAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.internalIdentity?.scope === 'user' ? request.internalIdentity.userId : undefined;
    if (!userId) throw new UnauthorizedException('A verified canonical identity is required.');
    request.userId = userId;
    return true;
  }
}
