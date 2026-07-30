import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { getLocalE2EEnv, getE2EBaseURL, neutralizeProxyEnvForLoopback } from './setup/env';

neutralizeProxyEnvForLoopback();

/**
 * The mock profile is a self-contained localhost harness. If a developer's
 * `.env` sets `E2E_BASE_URL` to a real deployment (for the real profile), the
 * `dotenv.config()` calls inside globalSetup (`authenticate.ts`) leak that URL
 * into the parent process env. Playwright then spawns test workers that
 * re-import this config, and `getE2EBaseURL()` picks up the leaked URL — so
 * every mock test navigates to production and lands on the ADFS login page.
 * We scrub it here and pin the mock baseURL to the loopback default so the
 * worker re-imports see a clean state.
 */
delete process.env.E2E_BASE_URL;

const rootPath = path.resolve(__dirname, '..');
const serverPath = path.resolve(rootPath, 'e2e/setup/start-server.js');
const mcpHttpServerPath = path.resolve(rootPath, 'e2e/setup/fake-mcp-http-server.js');
/** Must match the `e2e-http` server URL in e2e/config/librechat.e2e.yaml. */
const MCP_HTTP_PORT = process.env.E2E_MCP_HTTP_PORT || '8765';
const fakeModelHookPath = path.resolve(rootPath, 'e2e/setup/fake-model.js');
const configTemplatePath = path.resolve(rootPath, 'e2e/config/librechat.e2e.yaml');
const configPath = path.resolve(rootPath, 'e2e/.generated/librechat.e2e.yaml');
const reportPath = path.resolve(rootPath, 'e2e/playwright-report');
const deploymentSkillsPath = path.resolve(rootPath, 'e2e/fixtures/deployment-skills');

const baseURL = getE2EBaseURL();
const chromiumChannel = process.env.E2E_CHROMIUM_CHANNEL || undefined;

const vanillaOverrides = {
  TENANT_ISOLATION_STRICT: 'false',
  OPENAI_API_KEY: 'user_provided',
  OPENID_CLIENT_ID: '',
  OPENID_ISSUER: '',
  OPENID_AUTO_REDIRECT: 'false',
  ALLOW_SOCIAL_LOGIN: 'false',
  ALLOW_SOCIAL_REGISTRATION: 'false',
  STREAM_KEEP_COMPLETED_JOBS: 'true',
};

const baseEnv = {
  ...getLocalE2EEnv(),
  CONFIG_PATH: configPath,
  DEPLOYMENT_SKILLS_DIR: deploymentSkillsPath,
  /** Loaded in-process by `@librechat/api`'s `createRun` to swap in a fake model. */
  LIBRECHAT_TEST_RUN_HOOK: fakeModelHookPath,
  ...vanillaOverrides,
};

const SECRET_KEY_PATTERN = /(API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIALS|CLIENT_ID|_KEY)$/i;
const preservedCredentialEnvKeys = new Set([
  ...Object.keys(baseEnv),
  'E2E_USER_PASSWORD',
  'E2E_USER_B_PASSWORD',
]);

/**
 * The custom endpoints in the template point at an unreachable baseURL; the fake
 * model injected via `LIBRECHAT_TEST_RUN_HOOK` overrides the run before any
 * request is made, so no real (or mock HTTP) provider is contacted.
 */
function writeRuntimeMockConfig() {
  const template = fs.readFileSync(configTemplatePath, 'utf8');
  const config =
    process.env.E2E_MODEL_SPECS_ENFORCE === 'true'
      ? template.replace('\n  enforce: false\n', '\n  enforce: true\n')
      : template;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, config);
}

function neutralizeCredentialEnv(env: NodeJS.ProcessEnv, keep: Set<string>) {
  for (const key of Object.keys(env)) {
    if (!keep.has(key) && SECRET_KEY_PATTERN.test(key)) {
      env[key] = '';
    }
  }
}

/** Blank any credential-like vars from a local `.env` so they never reach the test server. */
function neutralizeDotenvSecrets(envFile: string, keep: Set<string>) {
  if (!fs.existsSync(envFile)) {
    return;
  }
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) {
      continue;
    }
    const key = match[1];
    if (keep.has(key)) {
      continue;
    }
    if (SECRET_KEY_PATTERN.test(key)) {
      process.env[key] = '';
    }
  }
}

writeRuntimeMockConfig();
neutralizeCredentialEnv(process.env, preservedCredentialEnvKeys);
Object.assign(process.env, baseEnv);
neutralizeDotenvSecrets(path.resolve(rootPath, '.env'), preservedCredentialEnvKeys);

export default defineConfig({
  globalSetup: require.resolve('./setup/global-setup'),
  globalTeardown: require.resolve('./setup/global-teardown.mock'),
  testDir: 'specs/mock/',
  outputDir: 'specs/.test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html', { outputFolder: reportPath, open: 'never' }], ['line']]
    : [['html', { outputFolder: reportPath }], ['list']],
  use: {
    baseURL,
    /**
     * Video recording requires Playwright's bundled ffmpeg binary, which CI does
     * not install: the workflow sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` and runs
     * `playwright install-deps chrome` (OS libraries for the system Chrome channel
     * only). With `on-first-retry`, every retry #1 aborted with "Executable doesn't
     * exist ... ffmpeg-linux" before running a single assertion, silently reducing
     * the retry budget from 2 to 1 and turning flaky specs into hard failures.
     * `trace: 'retain-on-failure'` below already captures DOM snapshots, network
     * activity, and per-action screenshots, which is strictly more useful for
     * debugging than a video.
     */
    video: 'off',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    headless: true,
    storageState: path.resolve(process.cwd(), 'e2e/storageState.json'),
    screenshot: 'only-on-failure',
    /**
     * The Paychex fork loads the Pendo analytics SDK for every authenticated
     * user (see client/src/hooks/Pendo/usePendo.ts). Pendo periodically pops
     * its Resource Center "onboarding" guides ("Find your past messages", etc.)
     * over the app, which steals clicks and covers the model selector, sidebar,
     * and message input — this was the single largest source of e2e flakiness
     * after the 0.8.7 upgrade. We blackhole the Pendo CDN so the SDK never
     * loads; the app itself still runs unchanged.
     */
    launchOptions: {
      args: [
        '--host-resolver-rules=MAP cdn.pendo.io 127.0.0.1:1,MAP app.pendo.io 127.0.0.1:1,MAP data.pendo.io 127.0.0.1:1,MAP pendo-static-*.storage.googleapis.com 127.0.0.1:1',
      ],
    },
  },
  expect: {
    timeout: 10000,
  },
  projects: [
    {
      name: chromiumChannel ?? 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumChannel ? { channel: chromiumChannel } : {}),
      },
    },
  ],
  webServer: [
    {
      command: `node ${serverPath}`,
      cwd: rootPath,
      url: baseURL,
      stdout: 'pipe',
      ignoreHTTPSErrors: true,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      // URL-based MCP fixture for the allowlist-override spec (its health route is GET /).
      command: `node ${mcpHttpServerPath}`,
      cwd: rootPath,
      env: { ...process.env, E2E_MCP_HTTP_PORT: MCP_HTTP_PORT },
      url: `http://127.0.0.1:${MCP_HTTP_PORT}/`,
      stdout: 'pipe',
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
