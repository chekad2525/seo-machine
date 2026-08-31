import { Body, Controller, Get, INestApplication, Post, Req, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { prisma, signInternalRequest } from '@seo-machine/db';
import { ApiAuthGuard, AuthenticatedRequest } from './api-auth.guard';
import { IdentityApi, InternalAuthGuard, PublicApi } from './internal-auth.guard';

// CI exercises this same HTTP suite with PostgreSQL; local tests use a strict nonce store.
jest.mock('@seo-machine/db', () => {
  const actual = jest.requireActual('@seo-machine/db');
  if (process.env.RUN_DATABASE_TESTS === 'true') return actual;
  const seen = new Set<string>();
  return { ...actual, prisma: {
    internalApiNonce: {
      create: async ({ data }: { data: { nonce: string } }) => { if (seen.has(data.nonce)) throw { code: 'P2002' }; seen.add(data.nonce); return data; },
      deleteMany: async () => ({ count: 0 }),
    },
    user: { create: async () => ({ id: 'test-user' }), findUnique: async ({ where }: { where: { id: string } }) => where.id === 'test-user' ? { id: where.id } : null, delete: async () => ({}) },
    $disconnect: async () => {},
  } };
});

@Controller()
class ProbeController {
  @Get('health') @PublicApi() health() { return { ok: true }; }
  @Post('identity/probe') @IdentityApi() identity() { return { accepted: true }; }
  @Post('private') @UseGuards(ApiAuthGuard)
  privateRoute(@Req() req: AuthenticatedRequest, @Body() body: unknown) { return { userId: req.userId, body }; }
  @Get('private') @UseGuards(ApiAuthGuard)
  read(@Req() req: AuthenticatedRequest) { return { userId: req.userId }; }
}

describe('Internal authentication over HTTP', () => {
  let app: INestApplication;
  let base: string;
  let userId: string;
  const nonces: string[] = [];
  const secret = 'test-internal-auth-secret-at-least-32-bytes';
  const previous = process.env.INTERNAL_API_SECRET;

  beforeAll(async () => {
    process.env.INTERNAL_API_SECRET = secret;
    userId = (await prisma.user.create({ data: {} })).id;
    const module = await Test.createTestingModule({ controllers: [ProbeController], providers: [ApiAuthGuard, { provide: APP_GUARD, useClass: InternalAuthGuard }] }).compile();
    app = module.createNestApplication({ rawBody: true, logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.internalApiNonce.deleteMany({ where: { nonce: { in: nonces } } });
    await prisma.$disconnect();
    if (previous === undefined) delete process.env.INTERNAL_API_SECRET; else process.env.INTERNAL_API_SECRET = previous;
  });

  function signed(target = '/api/v1/private', body = '{"name":"original"}', scope: 'user' | 'identity' = 'user', now = Date.now(), subject = userId) {
    const nonce = randomUUID(); nonces.push(nonce);
    return signInternalRequest({ method: 'POST', target, body }, { scope, ...(scope === 'user' ? { userId: subject } : {}) }, secret, now, nonce);
  }
  const post = (headers: Record<string, string>, body = '{"name":"original"}', target = '/api/v1/private') => fetch(base + target, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

  it('rejects bare user IDs while leaving health public', async () => {
    expect((await post({ 'x-user-id': userId })).status).toBe(401);
    expect((await fetch(base + '/api/v1/health')).status).toBe(200);
  });
  it('accepts the signed subject and ignores a spoofed legacy header', async () => {
    const result = await post({ ...signed(), 'x-user-id': 'attacker' });
    expect(result.status).toBe(201);
    expect((await result.json()).userId).toBe(userId);
  });
  it.each(['body', 'query', 'subject', 'method', 'scope', 'signature'])('rejects tampering with %s', async (field) => {
    const headers = signed();
    if (field === 'subject') headers['x-internal-user'] = 'other-user';
    if (field === 'scope') headers['x-internal-scope'] = 'identity';
    if (field === 'signature') headers['x-internal-signature'] = 'not-hex';
    const response = field === 'method' ? await fetch(base + '/api/v1/private', { headers }) : await post(headers, field === 'body' ? '{"name":"changed"}' : undefined, field === 'query' ? '/api/v1/private?role=admin' : undefined);
    expect(response.status).toBe(401);
  });
  it.each([-60_000, 60_000])('rejects an expired or future signature (%i ms)', async (offset) => {
    expect((await post(signed(undefined, undefined, undefined, Date.now() + offset))).status).toBe(401);
  });
  it('permits only one concurrent use of an identical signature', async () => {
    const headers = signed();
    const responses = await Promise.all([post(headers), post(headers)]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 401]);
  });
  it('separates identity-service permissions from user permissions', async () => {
    expect((await post(signed(undefined, undefined, 'identity'))).status).toBe(401);
    const path = '/api/v1/identity/probe';
    expect((await post(signed(path), undefined, path)).status).toBe(401);
    expect((await post(signed(path, undefined, 'identity'), undefined, path)).status).toBe(201);
  });
  it('rejects signed requests for a missing user', async () => {
    expect((await post(signed(undefined, undefined, undefined, undefined, 'missing-user'))).status).toBe(401);
  });
  it('fails startup configuration when the signing secret is missing', () => {
    delete process.env.INTERNAL_API_SECRET;
    try { expect(() => new InternalAuthGuard({} as never).onModuleInit()).toThrow('INTERNAL_API_SECRET'); }
    finally { process.env.INTERNAL_API_SECRET = secret; }
  });
});
