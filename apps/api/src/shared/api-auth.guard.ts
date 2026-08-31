import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export type AuthenticatedRequest = Request & { userId: string };

/**
 * The web app sends the Auth.js user id through this internal boundary.
 * In production this header is set only by the server-side Next.js proxy.
 * Local development can set x-user-id to exercise the API without OAuth.
 */
@Injectable()
export class ApiAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.header('x-user-id');
    if (!userId || userId.length > 128) throw new UnauthorizedException('A canonical user identity is required.');
    request.userId = userId;
    return true;
  }
}
