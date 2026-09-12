import { CanActivate, ExecutionContext, Injectable, Logger, OnModuleInit, RawBodyRequest, ServiceUnavailableException, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { internalApiSecret, prisma, verifyInternalRequest } from '@seo-machine/db';

const PUBLIC_API = 'seo-machine:public-api';
const IDENTITY_API = 'seo-machine:identity-api';
export const PublicApi = () => SetMetadata(PUBLIC_API, true);
export const IdentityApi = () => SetMetadata(IDENTITY_API, true);
export type VerifiedRequest = RawBodyRequest<Request> & { internalIdentity?: { scope: 'user' | 'identity'; userId: string }; userId?: string };

@Injectable()
export class InternalAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(InternalAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}
  onModuleInit() { internalApiSecret(); }

  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_API, targets)) return true;
    const request = context.switchToHttp().getRequest<VerifiedRequest>();
    const headers: Record<string, string | undefined> = {};
    for (const name of ['x-internal-time', 'x-internal-nonce', 'x-internal-scope', 'x-internal-user', 'x-internal-signature']) {
      const value = request.headers[name];
      if (Array.isArray(value)) throw new UnauthorizedException('Invalid internal request.');
      headers[name] = value;
    }
    // Only sign JSON bodies. Reject unparsed content instead of hashing an empty body.
    if (!['GET', 'HEAD'].includes(request.method) && !request.is('application/json')) throw new UnauthorizedException('A signed JSON request is required.');
    const identity = verifyInternalRequest({ method: request.method, target: request.originalUrl, body: request.rawBody }, headers, internalApiSecret());
    const expectedScope = this.reflector.getAllAndOverride<boolean>(IDENTITY_API, targets) ? 'identity' : 'user';
    if (!identity || identity.scope !== expectedScope) throw new UnauthorizedException('Invalid or expired internal request.');
    try {
      await prisma.internalApiNonce.create({ data: { nonce: identity.nonce, expiresAt: identity.expiresAt } });
      // Indexed cleanup is safe: future-skewed signatures remain stored through their entire validity window.
      await prisma.internalApiNonce.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      if (identity.scope === 'user' && !await prisma.user.findUnique({ where: { id: identity.userId }, select: { id: true } })) throw new UnauthorizedException('User no longer exists.');
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new UnauthorizedException('Internal request was already used.');
      const details = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
      this.logger.error(`Internal authentication database check failed: ${details}`);
      throw new ServiceUnavailableException('Internal authentication is temporarily unavailable.');
    }
    request.internalIdentity = { scope: identity.scope, userId: identity.userId };
    if (identity.scope === 'user') request.userId = identity.userId;
    return true;
  }
}
