import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useGetPromptCatalog,
  useGetPromptCatalogCategories,
  useGetPromptCatalogTags,
  useCreatePromptCatalogPrompt,
  useUpdatePromptCatalogPrompt,
  useDeletePromptCatalogPrompt,
} from '../queries';

const mockUseAuthContext = jest.fn();
jest.mock('~/hooks', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown }) {
  const { jsonBody, ...rest } = response;
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(jsonBody),
    ...rest,
  } as unknown as Response) as unknown as typeof fetch;
}

beforeEach(() => {
  mockUseAuthContext.mockReturnValue({ token: 'test-token' });
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useGetPromptCatalog', () => {
  it('builds the request URL from the given params and forwards the auth header', async () => {
    global.fetch = mockFetchOnce({ jsonBody: { prompts: [], pagination: {} } });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useGetPromptCatalog({
          search: 'alpha',
          category: 'general',
          tag: 'onboarding',
          page: '2',
          pageSize: '50',
          sortBy: 'title',
          sortOrder: 'asc',
          showMyPrompts: 'true',
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = (global.fetch as unknown as jest.Mock).mock.calls[0];
    const url = new URL(calledUrl as string);
    expect(url.pathname).toBe('/api/prompthub/catalog');
    expect(url.searchParams.get('search')).toBe('alpha');
    expect(url.searchParams.get('category')).toBe('general');
    expect(url.searchParams.get('tag')).toBe('onboarding');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('50');
    expect(url.searchParams.get('sortBy')).toBe('title');
    expect(url.searchParams.get('sortOrder')).toBe('asc');
    expect(url.searchParams.get('showMyPrompts')).toBe('true');
    expect(calledInit).toMatchObject({
      credentials: 'include',
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('omits the Authorization header when there is no token', async () => {
    mockUseAuthContext.mockReturnValue({ token: null });
    global.fetch = mockFetchOnce({ jsonBody: { prompts: [], pagination: {} } });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetPromptCatalog(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, calledInit] = (global.fetch as unknown as jest.Mock).mock.calls[0];
    expect(calledInit.headers).toEqual({});
  });

  it('throws when the response is not ok', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 } as Response) as unknown as typeof fetch;
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetPromptCatalog(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Prompt Catalog fetch failed: 500');
  });
});

describe('useGetPromptCatalogCategories', () => {
  it('sorts the returned categories alphabetically', async () => {
    global.fetch = mockFetchOnce({ jsonBody: { categories: ['zeta', 'alpha', 'mu'] } });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetPromptCatalogCategories(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['alpha', 'mu', 'zeta']);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/prompthub/catalog/categories',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('returns an empty array when categories is missing', async () => {
    global.fetch = mockFetchOnce({ jsonBody: {} });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetPromptCatalogCategories(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useGetPromptCatalogTags', () => {
  it('sorts tags by usage_count descending and returns only names', async () => {
    global.fetch = mockFetchOnce({
      jsonBody: {
        tags: [
          { name: 'low', usage_count: 1 },
          { name: 'high', usage_count: 10 },
          { name: 'mid', usage_count: 5 },
        ],
      },
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetPromptCatalogTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['high', 'mid', 'low']);
  });
});

describe('useCreatePromptCatalogPrompt', () => {
  it('POSTs the body as JSON with auth headers and invalidates catalog queries on success', async () => {
    global.fetch = mockFetchOnce({ jsonBody: { id: 42 } });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useCreatePromptCatalogPrompt({ onSuccess }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ title: 'New Prompt', content: 'Do the thing' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/prompthub/catalog', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ title: 'New Prompt', content: 'Do the thing' }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith(['promptCatalog']);
    expect(onSuccess).toHaveBeenCalledWith({ id: 42 });
  });

  it('surfaces the server error message when creation fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ message: 'Title is required' }),
    } as unknown as Response) as unknown as typeof fetch;
    const { Wrapper } = createWrapper();
    const onError = jest.fn();

    const { result } = renderHook(() => useCreatePromptCatalogPrompt({ onError }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ title: '', content: '' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalledWith(new Error('Title is required'));
  });
});

describe('useUpdatePromptCatalogPrompt', () => {
  it('PUTs to /catalog/:id without leaking the id into the request body', async () => {
    global.fetch = mockFetchOnce({ jsonBody: { id: 7 } });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePromptCatalogPrompt(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: 7, title: 'Updated title' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/prompthub/catalog/7', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ title: 'Updated title' }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith(['promptCatalog']);
  });
});

describe('useDeletePromptCatalogPrompt', () => {
  it('DELETEs /catalog/:id and invalidates catalog queries on success', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200 } as Response) as unknown as typeof fetch;
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeletePromptCatalogPrompt({ onSuccess }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ id: 9 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/prompthub/catalog/9', {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith(['promptCatalog']);
    expect(onSuccess).toHaveBeenCalled();
  });
});
