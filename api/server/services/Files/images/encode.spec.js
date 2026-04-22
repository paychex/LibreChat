jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@librechat/api', () => ({
  logAxiosError: jest.fn((args) => args.message),
  validateImage: jest.fn().mockResolvedValue({ isValid: true }),
}));

jest.mock('axios');

jest.mock('~/server/services/Files/strategies', () => ({
  getStrategyFunctions: jest.fn(),
}));

jest.mock('librechat-data-provider', () => ({
  ...jest.requireActual('librechat-data-provider'),
  mergeFileConfig: jest.fn().mockReturnValue({}),
  getEndpointFileConfig: jest.fn().mockReturnValue({}),
}));

const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const {
  FileSources,
  VisionModes,
  ContentTypes,
  EModelEndpoint,
  ImageDetail,
} = require('librechat-data-provider');
const { encodeAndFormat } = require('./encode');

const FAKE_BASE64 = Buffer.from('fake image data').toString('base64');

function makeImageFile(overrides = {}) {
  return {
    file_id: 'file-test-123',
    filename: 'test.png',
    filepath: '/uploads/test.png',
    type: 'image/png',
    source: FileSources.local,
    height: 100,
    width: 100,
    embedded: false,
    metadata: {},
    ...overrides,
  };
}

describe('encodeAndFormat', () => {
  let mockPrepareImagePayload;
  const mockReq = { body: { imageDetail: ImageDetail.auto }, config: undefined };

  beforeEach(() => {
    mockPrepareImagePayload = jest.fn();
    getStrategyFunctions.mockReturnValue({
      prepareImagePayload: mockPrepareImagePayload,
      getDownloadStream: jest.fn(),
    });
  });

  describe('returns empty result when given no files', () => {
    it('returns empty files and image_urls arrays', async () => {
      const result = await encodeAndFormat(mockReq, [], { endpoint: EModelEndpoint.anthropic });
      expect(result.files).toHaveLength(0);
      expect(result.image_urls).toHaveLength(0);
    });
  });

  describe('Anthropic image format conversion', () => {
    let file;

    beforeEach(() => {
      file = makeImageFile();
      mockPrepareImagePayload.mockResolvedValue([file, FAKE_BASE64]);
    });

    it('converts to Anthropic format for native anthropic endpoint in agents mode', async () => {
      const result = await encodeAndFormat(
        mockReq,
        [file],
        { endpoint: EModelEndpoint.anthropic },
        VisionModes.agents,
      );

      expect(result.image_urls).toHaveLength(1);
      const part = result.image_urls[0];
      expect(part.type).toBe('image');
      expect(part.source).toEqual({ type: 'base64', media_type: 'image/png', data: FAKE_BASE64 });
      expect(part.image_url).toBeUndefined();
    });

    it('converts to Anthropic format for custom endpoint containing "claude" in agents mode', async () => {
      const result = await encodeAndFormat(
        mockReq,
        [file],
        { endpoint: 'Claude Sonnet 4.5' },
        VisionModes.agents,
      );

      const part = result.image_urls[0];
      expect(part.type).toBe('image');
      expect(part.source).toEqual({ type: 'base64', media_type: 'image/png', data: FAKE_BASE64 });
      expect(part.image_url).toBeUndefined();
    });

    it('converts to Anthropic format for custom endpoint containing "anthropic" in agents mode', async () => {
      const result = await encodeAndFormat(
        mockReq,
        [file],
        { endpoint: 'My Anthropic Custom Endpoint' },
        VisionModes.agents,
      );

      const part = result.image_urls[0];
      expect(part.type).toBe('image');
      expect(part.source).toEqual({ type: 'base64', media_type: 'image/png', data: FAKE_BASE64 });
      expect(part.image_url).toBeUndefined();
    });

    it('matching is case-insensitive for custom endpoint names', async () => {
      const result = await encodeAndFormat(
        mockReq,
        [file],
        { endpoint: 'CLAUDE-3-OPUS' },
        VisionModes.agents,
      );

      const part = result.image_urls[0];
      expect(part.type).toBe('image');
      expect(part.source).toBeDefined();
      expect(part.image_url).toBeUndefined();
    });

    it('does NOT convert to Anthropic format for a non-Anthropic endpoint in agents mode', async () => {
      const result = await encodeAndFormat(
        mockReq,
        [file],
        { endpoint: 'gpt-4o' },
        VisionModes.agents,
      );

      const part = result.image_urls[0];
      expect(part.type).toBe(ContentTypes.IMAGE_URL);
      expect(part.image_url).toBeDefined();
      expect(part.source).toBeUndefined();
    });

    it('converts to Anthropic format for custom claude endpoint outside agents mode', async () => {
      const result = await encodeAndFormat(
        mockReq,
        [file],
        { endpoint: 'Claude Sonnet 4.5' },
        undefined,
      );

      const part = result.image_urls[0];
      expect(part.type).toBe('image');
      expect(part.source).toBeDefined();
      expect(part.image_url).toBeUndefined();
    });

    it('uses provider as fallback when endpoint is not provided', async () => {
      const result = await encodeAndFormat(
        mockReq,
        [file],
        { provider: 'Claude Sonnet 4.5' },
        VisionModes.agents,
      );

      const part = result.image_urls[0];
      expect(part.type).toBe('image');
      expect(part.source).toBeDefined();
    });
  });
});
