import {
  createPromptHubResolveInsertHandler,
  createPromptHubCatalogListHandler,
  createPromptHubCatalogCategoriesHandler,
  createPromptHubCatalogTagsHandler,
  createPromptHubCatalogCreateHandler,
  createPromptHubCatalogUpdateHandler,
  createPromptHubCatalogDeleteHandler,
} from './handlers';

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return res;
};

describe('createPromptHubResolveInsertHandler', () => {
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

describe('createPromptHubCatalogListHandler', () => {
  it('forwards all query params and the identity headers to the Prompt Catalog API', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ prompts: [], pagination: {} }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubCatalogListHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });

    const req = {
      query: {
        search: 'alpha',
        category: 'general',
        tag: 'onboarding',
        page: '2',
        pageSize: '50',
        sortBy: 'title',
        sortOrder: 'asc',
        showMyPrompts: 'true',
      },
      user: { email: 'teammate@paychex.com', name: 'Teammate Example' },
    } as never;
    const res = createResponse();

    await handler(req, res as never);

    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    const url = new URL(calledUrl as string);
    expect(url.pathname).toBe('/api/prompts');
    expect(url.searchParams.get('search')).toBe('alpha');
    expect(url.searchParams.get('category')).toBe('general');
    expect(url.searchParams.get('tag')).toBe('onboarding');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('50');
    expect(url.searchParams.get('sortBy')).toBe('title');
    expect(url.searchParams.get('sortOrder')).toBe('asc');
    expect(url.searchParams.get('showMyPrompts')).toBe('true');
    expect((calledInit as RequestInit).headers).toEqual({
      Accept: 'application/json',
      'x-forwarded-user-email': 'teammate@paychex.com',
      'x-forwarded-user-name': 'Teammate Example',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 when PROMPT_CATALOG_API_URL is not configured', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    const handler = createPromptHubCatalogListHandler({
      getPromptCatalogApiUrl: () => undefined,
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ query: {} } as never, res as never);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'PROMPT_CATALOG_API_URL is not configured' });
  });

  it('propagates the upstream status when the request fails', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response);
    const handler = createPromptHubCatalogListHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ query: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch Prompt Catalog' });
  });

  it('returns 502 when the upstream request throws', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('network down'));
    const handler = createPromptHubCatalogListHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    const res = createResponse();

    await handler({ query: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ message: 'Prompt Catalog service unavailable' });
  });
});

describe('createPromptHubCatalogCategoriesHandler', () => {
  it('fetches /api/prompts/categories with identity headers', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ categories: ['general', 'hr'] }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubCatalogCategoriesHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ user: { email: 'a@paychex.com' } } as never, res as never);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://prompt-catalog.example.com/api/prompts/categories',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-forwarded-user-email': 'a@paychex.com' }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ categories: ['general', 'hr'] });
  });

  it('returns 500 when PROMPT_CATALOG_API_URL is not configured', async () => {
    const handler = createPromptHubCatalogCategoriesHandler({
      getPromptCatalogApiUrl: () => undefined,
    });
    const res = createResponse();

    await handler({} as never, res as never);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('createPromptHubCatalogTagsHandler', () => {
  it('fetches /api/prompts/tags with identity headers', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ tags: [{ name: 'alpha', usage_count: 3 }] }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubCatalogTagsHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ user: {} } as never, res as never);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://prompt-catalog.example.com/api/prompts/tags',
      expect.any(Object),
    );
    expect(res.json).toHaveBeenCalledWith({ tags: [{ name: 'alpha', usage_count: 3 }] });
  });

  it('returns 502 when the fetch call throws', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('boom'));
    const handler = createPromptHubCatalogTagsHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    const res = createResponse();

    await handler({} as never, res as never);

    expect(res.status).toHaveBeenCalledWith(502);
  });
});

describe('createPromptHubCatalogCreateHandler', () => {
  it('POSTs the body to /api/prompts with identity headers and Content-Type', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 10 }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubCatalogCreateHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler(
      {
        body: { title: 'New Prompt', content: 'Body' },
        user: { email: 'a@paychex.com', name: 'A' },
      } as never,
      res as never,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://prompt-catalog.example.com/api/prompts',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'x-forwarded-user-email': 'a@paychex.com',
          'x-forwarded-user-name': 'A',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Prompt', content: 'Body' }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 10 });
  });

  it('returns the upstream status when creation fails', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: 'Title is required' }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubCatalogCreateHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ body: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create Prompt Catalog prompt' });
  });
});

describe('createPromptHubCatalogUpdateHandler', () => {
  it('PUTs the body to /api/prompts/:id', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 42 }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const handler = createPromptHubCatalogUpdateHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler(
      { params: { id: '42' }, body: { title: 'Updated' }, user: {} } as never,
      res as never,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://prompt-catalog.example.com/api/prompts/42',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ title: 'Updated' }) }),
    );
    expect(res.json).toHaveBeenCalledWith({ id: 42 });
  });

  it('rejects an invalid id without calling fetch', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    const handler = createPromptHubCatalogUpdateHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ params: { id: 'not-a-number' }, body: {} } as never, res as never);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'A valid prompt id is required' });
  });
});

describe('createPromptHubCatalogDeleteHandler', () => {
  it('DELETEs /api/prompts/:id and returns a success payload', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);

    const handler = createPromptHubCatalogDeleteHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ params: { id: '7' }, user: {} } as never, res as never);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://prompt-catalog.example.com/api/prompts/7',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('rejects an invalid id without calling fetch', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    const handler = createPromptHubCatalogDeleteHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ params: { id: '-1' } } as never, res as never);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns the upstream status when deletion fails', async () => {
    const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({ ok: false, status: 403 } as Response);
    const handler = createPromptHubCatalogDeleteHandler({
      getPromptCatalogApiUrl: () => 'https://prompt-catalog.example.com',
      fetchImpl: mockFetch,
    });
    const res = createResponse();

    await handler({ params: { id: '7' } } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to delete Prompt Catalog prompt' });
  });
});
