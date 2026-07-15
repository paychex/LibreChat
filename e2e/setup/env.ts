import crypto from 'crypto';
import path from 'path';

const DEFAULT_BASE_URL = 'http://localhost:3080';
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/LibreChat-e2e';
const DEFAULT_RUNTIME_ENV_PATH = path.resolve(__dirname, '../specs/.test-results/runtime-env.json');
const GENERATED_CREDS_KEY = crypto.randomBytes(32).toString('hex');
const GENERATED_CREDS_IV = crypto.randomBytes(16).toString('hex');
const GENERATED_JWT_SECRET = crypto.randomBytes(32).toString('hex');
const GENERATED_JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
const PASSTHROUGH_ENV_KEYS = [
  'APPDATA',
  'CI',
  'FORCE_COLOR',
  'HOME',
  'LOCALAPPDATA',
  'NO_COLOR',
  'NO_PROXY',
  'NODE_OPTIONS',
  'PATH',
  'PLAYWRIGHT_BROWSERS_PATH',
  'SHELL',
  'TEMP',
  'TMP',
  'TMPDIR',
  'USER',
  'USERNAME',
  'http_proxy',
  'https_proxy',
  'no_proxy',
  'HTTP_PROXY',
  'HTTPS_PROXY',
];

export function getE2EBaseURL() {
  return process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL;
}

export function getE2EServerAddress(baseURL = getE2EBaseURL()) {
  const url = new URL(baseURL);
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');

  return { host, port };
}

export function getRuntimeEnvPath() {
  return process.env.E2E_RUNTIME_ENV_PATH ?? DEFAULT_RUNTIME_ENV_PATH;
}

function getPassthroughEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const passthroughKeys = [
    ...PASSTHROUGH_ENV_KEYS,
    ...(process.env.E2E_PASSTHROUGH_ENV?.split(',') ?? []),
  ];

  for (const key of passthroughKeys) {
    const value = process.env[key.trim()];
    if (value != null) {
      env[key.trim()] = value;
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('MONGOMS_') && value != null) {
      env[key] = value;
    }
  }

  return env;
}

export function getBaseE2EEnv(): Record<string, string> {
  const baseURL = getE2EBaseURL();
  const { host, port } = getE2EServerAddress(baseURL);

  return {
    ...getPassthroughEnv(),
    NODE_ENV: 'CI',
    HOST: process.env.E2E_HOST ?? host,
    PORT: process.env.E2E_PORT ?? port,
    MONGO_URI: process.env.MONGO_URI ?? DEFAULT_MONGO_URI,
    DOMAIN_CLIENT: process.env.E2E_DOMAIN_CLIENT ?? baseURL,
    DOMAIN_SERVER: process.env.E2E_DOMAIN_SERVER ?? baseURL,
    E2E_RUNTIME_ENV_PATH: getRuntimeEnvPath(),
    E2E_USE_MEMORY_MONGO: process.env.E2E_USE_MEMORY_MONGO ?? 'auto',
    NO_INDEX: process.env.NO_INDEX ?? 'true',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? 'user_provided',
    CREDS_KEY: process.env.CREDS_KEY ?? GENERATED_CREDS_KEY,
    CREDS_IV: process.env.CREDS_IV ?? GENERATED_CREDS_IV,
    JWT_SECRET: process.env.JWT_SECRET ?? GENERATED_JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? GENERATED_JWT_REFRESH_SECRET,
    EMAIL_HOST: '',
    SEARCH: 'false',
    SESSION_EXPIRY: process.env.SESSION_EXPIRY ?? '3600000',
    ALLOW_REGISTRATION: 'true',
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY ?? '3600000',
  };
}

/**
 * Playwright's webServer plugin uses `proxy-from-env` to decide whether to
 * proxy its readiness HTTP probe. That library also picks up `npm_config_proxy`
 * (which npm injects when Playwright is invoked via `npm`/`npx`), so a
 * corporate proxy configured only in ~/.npmrc will route the probe against
 * localhost through the proxy — the proxy returns 200 (a "403 Forbidden" HTML
 * page from the proxy) and Playwright reports the port as already in use.
 *
 * When the target is loopback we strip these vars from the current process env
 * so the probe stays local. This is safe: real credentialed traffic still uses
 * the OS-level proxy configuration (if any).
 */
export function neutralizeProxyEnvForLoopback(baseURL = getE2EBaseURL()) {
  const { host } = getE2EServerAddress(baseURL);
  const normalized = host.toLowerCase();
  if (normalized !== 'localhost' && normalized !== '127.0.0.1' && normalized !== '::1') {
    return;
  }
  const keys = [
    'HTTP_PROXY',
    'http_proxy',
    'HTTPS_PROXY',
    'https_proxy',
    'ALL_PROXY',
    'all_proxy',
    'npm_config_proxy',
    'npm_config_http_proxy',
    'npm_config_https_proxy',
  ];
  for (const key of keys) {
    delete process.env[key];
  }
  const existingNoProxy = process.env.NO_PROXY ?? process.env.no_proxy ?? '';
  const parts = new Set(
    existingNoProxy
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  );
  parts.add('localhost');
  parts.add('127.0.0.1');
  parts.add('::1');
  const noProxy = Array.from(parts).join(',');
  process.env.NO_PROXY = noProxy;
  process.env.no_proxy = noProxy;
}

export function getLocalE2EEnv(): Record<string, string> {
  return {
    ...getBaseE2EEnv(),
    TITLE_CONVO: 'false',
    LOGIN_VIOLATION_SCORE: '0',
    REGISTRATION_VIOLATION_SCORE: '0',
    CONCURRENT_VIOLATION_SCORE: '0',
    MESSAGE_VIOLATION_SCORE: '0',
    NON_BROWSER_VIOLATION_SCORE: '0',
    FORK_VIOLATION_SCORE: '0',
    IMPORT_VIOLATION_SCORE: '0',
    TTS_VIOLATION_SCORE: '0',
    STT_VIOLATION_SCORE: '0',
    FILE_UPLOAD_VIOLATION_SCORE: '0',
    RESET_PASSWORD_VIOLATION_SCORE: '0',
    VERIFY_EMAIL_VIOLATION_SCORE: '0',
    TOOL_CALL_VIOLATION_SCORE: '0',
    CONVO_ACCESS_VIOLATION_SCORE: '0',
    ILLEGAL_MODEL_REQ_SCORE: '0',
    LOGIN_MAX: '20',
    LOGIN_WINDOW: '1',
    REGISTER_MAX: '20',
    REGISTER_WINDOW: '1',
    LIMIT_CONCURRENT_MESSAGES: 'false',
    CONCURRENT_MESSAGE_MAX: '20',
    LIMIT_MESSAGE_IP: 'false',
    MESSAGE_IP_MAX: '100',
    MESSAGE_IP_WINDOW: '1',
    LIMIT_MESSAGE_USER: 'false',
    MESSAGE_USER_MAX: '100',
    MESSAGE_USER_WINDOW: '1',
  };
}
