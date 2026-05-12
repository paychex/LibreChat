'use strict';

const refreshOpenIDToken = require('./refreshOpenIDToken');

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('@librechat/api', () => ({
  isEnabled: jest.fn(),
}));

jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('~/strategies', () => ({
  getOpenIdConfig: jest.fn(),
}));

jest.mock('~/server/services/AuthService', () => ({
  setOpenIDAuthTokens: jest.fn(),
}));

jest.mock('openid-client', () => ({
  refreshTokenGrant: jest.fn(),
}));

const cookieLib = require('cookie');
const { isEnabled } = require('@librechat/api');
const { getOpenIdConfig } = require('~/strategies');
const { setOpenIDAuthTokens } = require('~/server/services/AuthService');
const openIdClient = require('openid-client');

/**
 * Build a compact JWT with the given payload (unsigned, for test purposes only).
 */
function buildTestJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function makeReq({ cookieStr = 'token_provider=openid', user = null, session = null } = {}) {
  return {
    headers: { cookie: cookieStr },
    user,
    session,
  };
}

function makeRes() {
  return { cookie: jest.fn() };
}

describe('refreshOpenIDToken middleware', () => {
  const now = Math.floor(Date.now() / 1000);

  beforeEach(() => {
    jest.clearAllMocks();
    isEnabled.mockReturnValue(true);
    cookieLib.parse.mockReturnValue({ token_provider: 'openid' });
    getOpenIdConfig.mockReturnValue({ issuer: 'https://example.com' });
  });

  it('calls next immediately when OPENID_REUSE_TOKENS is disabled', async () => {
    isEnabled.mockReturnValue(false);
    const next = jest.fn();
    await refreshOpenIDToken(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(openIdClient.refreshTokenGrant).not.toHaveBeenCalled();
  });

  it('calls next immediately when token_provider is not openid', async () => {
    cookieLib.parse.mockReturnValue({ token_provider: 'librechat' });
    const next = jest.fn();
    await refreshOpenIDToken(makeReq({ cookieStr: 'token_provider=librechat' }), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(openIdClient.refreshTokenGrant).not.toHaveBeenCalled();
  });

  it('calls next immediately when user has no federatedTokens', async () => {
    const next = jest.fn();
    await refreshOpenIDToken(makeReq({ user: { id: 'u1' } }), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(openIdClient.refreshTokenGrant).not.toHaveBeenCalled();
  });

  it('calls next immediately when access_token is still valid', async () => {
    const validToken = buildTestJwt({ exp: now + 3600 });
    const req = makeReq({
      user: { id: 'u1', federatedTokens: { access_token: validToken } },
    });
    const next = jest.fn();
    await refreshOpenIDToken(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(openIdClient.refreshTokenGrant).not.toHaveBeenCalled();
  });

  it('calls next without refresh when access_token is an opaque token (no exp)', async () => {
    const next = jest.fn();
    const req = makeReq({
      user: { id: 'u1', federatedTokens: { access_token: 'opaque-token-string' } },
    });
    await refreshOpenIDToken(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(openIdClient.refreshTokenGrant).not.toHaveBeenCalled();
  });

  it('calls next with warning when access_token is expired but no refresh_token available', async () => {
    const expiredToken = buildTestJwt({ exp: now - 60 });
    const next = jest.fn();
    cookieLib.parse.mockReturnValue({ token_provider: 'openid' }); // no refreshToken cookie
    const req = makeReq({
      cookieStr: 'token_provider=openid',
      user: { id: 'u1', federatedTokens: { access_token: expiredToken } },
      session: { openidTokens: {} }, // no refreshToken in session
    });
    await refreshOpenIDToken(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(openIdClient.refreshTokenGrant).not.toHaveBeenCalled();
  });

  it('refreshes expired access_token using session refresh_token', async () => {
    const expiredToken = buildTestJwt({ exp: now - 60 });
    const newTokenset = {
      access_token: 'new-access-token',
      id_token: 'new-id-token',
      refresh_token: 'new-refresh-token',
      expires_at: now + 3600,
    };
    openIdClient.refreshTokenGrant.mockResolvedValue(newTokenset);

    const next = jest.fn();
    const req = makeReq({
      user: { id: 'u1', federatedTokens: { access_token: expiredToken } },
      session: { openidTokens: { refreshToken: 'old-refresh-token' } },
    });
    const res = makeRes();

    await refreshOpenIDToken(req, res, next);

    expect(openIdClient.refreshTokenGrant).toHaveBeenCalledWith(
      expect.anything(),
      'old-refresh-token',
      expect.anything(),
    );
    expect(setOpenIDAuthTokens).toHaveBeenCalledWith(
      newTokenset,
      req,
      res,
      'u1',
      'old-refresh-token',
    );
    expect(req.user.federatedTokens).toEqual({
      access_token: 'new-access-token',
      id_token: 'new-id-token',
      refresh_token: 'new-refresh-token',
      expires_at: now + 3600,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('refreshes expired access_token using refreshToken cookie as fallback', async () => {
    const expiredToken = buildTestJwt({ exp: now - 60 });
    const newTokenset = {
      access_token: 'new-access-token',
      id_token: 'new-id-token',
      refresh_token: undefined,
      expires_at: now + 3600,
    };
    openIdClient.refreshTokenGrant.mockResolvedValue(newTokenset);
    cookieLib.parse.mockReturnValue({ token_provider: 'openid', refreshToken: 'cookie-refresh' });

    const next = jest.fn();
    const req = makeReq({
      user: { id: 'u1', federatedTokens: { access_token: expiredToken } },
      session: { openidTokens: {} }, // no refreshToken in session
    });

    await refreshOpenIDToken(req, makeRes(), next);

    expect(openIdClient.refreshTokenGrant).toHaveBeenCalledWith(
      expect.anything(),
      'cookie-refresh',
      expect.anything(),
    );
    expect(req.user.federatedTokens.refresh_token).toBe('cookie-refresh');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('refreshes token expiring within 30-second buffer', async () => {
    const soonExpiring = buildTestJwt({ exp: now + 15 }); // expires in 15s < 30s buffer
    const newTokenset = {
      access_token: 'new-access-token',
      id_token: 'new-id-token',
      refresh_token: 'new-refresh-token',
      expires_at: now + 3600,
    };
    openIdClient.refreshTokenGrant.mockResolvedValue(newTokenset);

    const next = jest.fn();
    const req = makeReq({
      user: { id: 'u1', federatedTokens: { access_token: soonExpiring } },
      session: { openidTokens: { refreshToken: 'old-refresh-token' } },
    });

    await refreshOpenIDToken(req, makeRes(), next);

    expect(openIdClient.refreshTokenGrant).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next and logs warning when refresh grant fails', async () => {
    const { logger } = require('@librechat/data-schemas');
    const expiredToken = buildTestJwt({ exp: now - 60 });
    openIdClient.refreshTokenGrant.mockRejectedValue(new Error('invalid_grant'));

    const next = jest.fn();
    const req = makeReq({
      user: { id: 'u1', federatedTokens: { access_token: expiredToken } },
      session: { openidTokens: { refreshToken: 'stale-refresh-token' } },
    });

    await refreshOpenIDToken(req, makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to refresh'),
      expect.objectContaining({ error: 'invalid_grant' }),
    );
    expect(req.user.federatedTokens.access_token).toBe(expiredToken);
  });

  it('passes OPENID_SCOPE as refresh params when env var is set', async () => {
    const expiredToken = buildTestJwt({ exp: now - 60 });
    process.env.OPENID_SCOPE = 'openid profile email';
    openIdClient.refreshTokenGrant.mockResolvedValue({
      access_token: 'new-token',
      id_token: 'id',
      refresh_token: 'rt',
      expires_at: now + 3600,
    });

    const next = jest.fn();
    const req = makeReq({
      user: { id: 'u1', federatedTokens: { access_token: expiredToken } },
      session: { openidTokens: { refreshToken: 'rt' } },
    });

    await refreshOpenIDToken(req, makeRes(), next);

    expect(openIdClient.refreshTokenGrant).toHaveBeenCalledWith(
      expect.anything(),
      'rt',
      { scope: 'openid profile email' },
    );

    delete process.env.OPENID_SCOPE;
    expect(next).toHaveBeenCalledTimes(1);
  });
});
