'use strict';

const cookies = require('cookie');
const openIdClient = require('openid-client');
const { logger } = require('@librechat/data-schemas');
const { isEnabled } = require('@librechat/api');
const { getOpenIdConfig } = require('~/strategies');
const { setOpenIDAuthTokens } = require('~/server/services/AuthService');

/**
 * Per-user in-flight refresh promise map.
 * Prevents concurrent requests for the same user from each independently calling
 * refreshTokenGrant and triggering a rotate-on-use invalidation race (invalid_grant).
 *
 * @type {Map<string, Promise<unknown>>}
 */
const _inflight = new Map();

/**
 * Parse a JWT and return the decoded payload without signature verification.
 * Returns null for opaque tokens (non-JWT strings).
 *
 * @param {string} token
 * @returns {Record<string, unknown> | null}
 */
function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Returns true when the access_token JWT is expired or will expire within `bufferSeconds`.
 * Returns false for opaque tokens (cannot determine expiry without network call).
 *
 * @param {string} accessToken
 * @param {number} [bufferSeconds=30]
 * @returns {boolean}
 */
function isAccessTokenExpiredOrExpiringSoon(accessToken, bufferSeconds = 30) {
  const payload = parseJwtPayload(accessToken);
  if (!payload || !payload.exp) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return now >= /** @type {number} */ (payload.exp) - bufferSeconds;
}

/**
 * Middleware that proactively refreshes an expired or expiring OpenID access_token
 * before the request reaches the agent/MCP handler.
 *
 * Problem this solves:
 *   LibreChat authenticates users with the OpenID id_token (~60+ min lifetime).
 *   Downstream agents such as Paxton receive the access_token forwarded via the
 *   {{LIBRECHAT_OPENID_ACCESS_TOKEN}} placeholder, which can have a shorter lifetime
 *   (e.g. ~15 min for Azure AD). After the access_token expires the id_token may
 *   still be valid, so requireJwtAuth succeeds but the agent call returns 401.
 *
 * This middleware detects an expired/expiring access_token and performs a silent
 * refresh using the stored refresh_token before the request continues.
 *
 * Only active when:
 *   - OPENID_REUSE_TOKENS is enabled (required for token forwarding to agents)
 *   - token_provider cookie is 'openid'
 *   - req.user.federatedTokens contains an access_token
 *   - The access_token is expired or expires within 30 seconds
 *   - A refresh_token is available in the session or refreshToken cookie
 *
 * On refresh failure the middleware logs a warning and proceeds so that the
 * downstream 401 surfaces normally rather than silently breaking the request.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const refreshOpenIDToken = async (req, res, next) => {
  if (!isEnabled(process.env.OPENID_REUSE_TOKENS)) {
    return next();
  }

  const cookieHeader = req.headers.cookie;
  const parsedCookies = cookieHeader ? cookies.parse(cookieHeader) : {};

  if (parsedCookies.token_provider !== 'openid') {
    return next();
  }

  const accessToken = req.user?.federatedTokens?.access_token;
  if (!accessToken || !isAccessTokenExpiredOrExpiringSoon(accessToken)) {
    return next();
  }

  const refreshToken = req.session?.openidTokens?.refreshToken || parsedCookies.refreshToken;

  if (!refreshToken) {
    logger.warn('[refreshOpenIDToken] Access token expired but no refresh token available');
    return next();
  }

  const userId = req.user?.id;

  try {
    logger.debug('[refreshOpenIDToken] Access token expired or expiring soon — refreshing');

    let refreshPromise = userId ? _inflight.get(userId) : null;

    if (!refreshPromise) {
      const openIdConfig = getOpenIdConfig();
      const refreshParams = process.env.OPENID_SCOPE ? { scope: process.env.OPENID_SCOPE } : {};
      refreshPromise = openIdClient
        .refreshTokenGrant(openIdConfig, refreshToken, refreshParams)
        .finally(() => {
          if (userId) {
            _inflight.delete(userId);
          }
        });
      if (userId) {
        _inflight.set(userId, refreshPromise);
      }
    }

    const tokenset = await refreshPromise;

    /** Persist new tokens in session + update response cookies */
    setOpenIDAuthTokens(tokenset, req, res, userId, refreshToken);

    /** Update req.user.federatedTokens so the current request uses the fresh access_token */
    req.user.federatedTokens = {
      access_token: tokenset.access_token,
      id_token: tokenset.id_token,
      refresh_token: tokenset.refresh_token || refreshToken,
      expires_at: tokenset.expires_at,
    };

    logger.info('[refreshOpenIDToken] Access token refreshed successfully');
  } catch (err) {
    logger.warn(
      '[refreshOpenIDToken] Failed to refresh access token — proceeding with expired token',
      {
        error: err.message,
      },
    );
  }

  return next();
};

module.exports = refreshOpenIDToken;
