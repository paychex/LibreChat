import type { ConnectionOptions as TLSConnectionOptions } from 'node:tls';
import type * as t from './types';

type TLSConnectField =
  | 'ca'
  | 'cert'
  | 'key'
  | 'passphrase'
  | 'pfx'
  | 'rejectUnauthorized'
  | 'servername';

export type MCPClientTLSConnectOptions = Pick<TLSConnectionOptions, TLSConnectField>;

const normalizeMultilineSecret = (value: string | undefined): string | undefined =>
  value?.replace(/\\n/g, '\n');

const normalizeBase64Bundle = (value: string): string => value.replace(/\\n/g, '').replace(/\s+/g, '');

export function buildMCPClientTLSConnectOptions(
  options: Pick<t.SSEOptions | t.StreamableHTTPOptions, 'url' | 'tls'>,
): MCPClientTLSConnectOptions | undefined {
  const tls = options.tls;
  if (tls == null) {
    return undefined;
  }

  const connectOptions: MCPClientTLSConnectOptions = {
    servername: normalizeMultilineSecret(tls.servername) ?? new URL(options.url).hostname,
  };

  const ca = normalizeMultilineSecret(tls.ca);
  if (ca != null) {
    connectOptions.ca = ca;
  }

  const passphrase = normalizeMultilineSecret(tls.passphrase);
  if (passphrase != null) {
    connectOptions.passphrase = passphrase;
  }

  if (tls.rejectUnauthorized != null) {
    connectOptions.rejectUnauthorized = tls.rejectUnauthorized;
  }

  if ('pfx' in tls) {
    connectOptions.pfx = Buffer.from(normalizeBase64Bundle(tls.pfx), 'base64');
    return connectOptions;
  }

  connectOptions.cert = normalizeMultilineSecret(tls.cert);
  connectOptions.key = normalizeMultilineSecret(tls.key);
  return connectOptions;
}
