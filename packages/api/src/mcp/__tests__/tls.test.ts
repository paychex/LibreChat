import { buildMCPClientTLSConnectOptions } from '~/mcp/tls';

describe('buildMCPClientTLSConnectOptions', () => {
  it('returns undefined when the transport has no TLS configuration', () => {
    expect(
      buildMCPClientTLSConnectOptions({
        url: 'https://example.com/mcp',
      }),
    ).toBeUndefined();
  });

  it('builds TLS connect options from a base64-encoded PFX bundle', () => {
    const result = buildMCPClientTLSConnectOptions({
      url: 'https://play.clientssl.ain2a.paychex.com/mcp',
      tls: {
        pfx: 'UEtDUzEyLURBVEE=',
        ca: '-----BEGIN CERTIFICATE-----\\nTEST-CA\\n-----END CERTIFICATE-----',
        passphrase: 'super-secret',
      },
    });

    expect(result).toEqual({
      servername: 'play.clientssl.ain2a.paychex.com',
      pfx: Buffer.from('PKCS12-DATA'),
      ca: '-----BEGIN CERTIFICATE-----\nTEST-CA\n-----END CERTIFICATE-----',
      passphrase: 'super-secret',
    });
  });

  it('builds TLS connect options from PEM certificate and key material', () => {
    const result = buildMCPClientTLSConnectOptions({
      url: 'https://internal.example.com/events',
      tls: {
        cert: '-----BEGIN CERTIFICATE-----\\nCLIENT\\n-----END CERTIFICATE-----',
        key: '-----BEGIN PRIVATE KEY-----\\nKEY\\n-----END PRIVATE KEY-----',
        servername: 'override.example.com',
        rejectUnauthorized: false,
      },
    });

    expect(result).toEqual({
      servername: 'override.example.com',
      cert: '-----BEGIN CERTIFICATE-----\nCLIENT\n-----END CERTIFICATE-----',
      key: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----',
      rejectUnauthorized: false,
    });
  });
});
