import { createPromptHubResolveInsertHandler } from './handlers';

describe('createPromptHubResolveInsertHandler', () => {
  const createResponse = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return res;
  };

  it('returns the prompt content and forwards user identity headers', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 254,
        title: 'Neurodiversity-Friendly Rewriter',
        content: 'Prompt body',
        version: 2,
      }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubResolveInsertHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
      timeoutMs: 5000,
    });

    const req = {
      body: { promptCatalogId: 254 },
      user: {
        email: 'teammate@paychex.com',
        name: 'Teammate Example',
      },
    } as Parameters<ReturnType<typeof createPromptHubResolveInsertHandler>>[0];
    const res = createResponse();

    await handler(req, res as never);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://prompt-catalog.example.com/api/prompts/254',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'x-forwarded-user-email': 'teammate@paychex.com',
          'x-forwarded-user-name': 'Teammate Example',
        },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      promptId: 254,
      title: 'Neurodiversity-Friendly Rewriter',
      content: 'Prompt body',
      version: 2,
    });
  });

  it('rejects invalid prompt IDs', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    const handler = createPromptHubResolveInsertHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ body: { promptCatalogId: 'abc' } } as never, res as never);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'promptCatalogId is required' });
  });

  it('returns 500 when the Prompt Catalog base URL is not configured', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    const handler = createPromptHubResolveInsertHandler({
      getPromptCatalogApiUrl: () => undefined,
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ body: { promptCatalogId: 254 } } as never, res as never);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'PROMPT_CATALOG_API_URL is not configured' });
  });

  it('passes through Prompt Catalog errors', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({ error: 'Prompt not found' }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubResolveInsertHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ body: { promptCatalogId: 999 } } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Prompt not found' });
  });

  it('returns 502 when Prompt Catalog does not include prompt text', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 254, title: 'Missing content' }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubResolveInsertHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ body: { promptCatalogId: 254 } } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Prompt Catalog response did not include prompt text',
    });
  });
});
