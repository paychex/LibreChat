// useQueryParams.spec.ts
jest.mock('recoil', () => {
  const originalModule = jest.requireActual('recoil');
  return {
    ...originalModule,
    atom: jest.fn().mockImplementation((config) => ({
      key: config.key,
      default: config.default,
    })),
    useRecoilValue: jest.fn(),
  };
});

// Move mock store definition after the mocks
jest.mock('~/store', () => ({
  modularChat: { key: 'modularChat', default: false },
  availableTools: { key: 'availableTools', default: [] },
}));

import { renderHook, act } from '@testing-library/react';
import { useToastContext } from '@librechat/client';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import useQueryParams from './useQueryParams';
import {
  useAuthContext,
  useAgentsMap,
  useDefaultConvo,
  useLocalize,
  useSubmitMessage,
} from '~/hooks';
import { useChatContext, useChatFormContext } from '~/Providers';
import store from '~/store';

// Other mocks
jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
  useQuery: jest.fn(),
}));

jest.mock('@librechat/client', () => ({
  useToastContext: jest.fn(),
}));

jest.mock('~/Providers', () => ({
  useChatContext: jest.fn(),
  useChatFormContext: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useAuthContext: jest.fn(),
  useAgentsMap: jest.fn(() => ({})),
  useDefaultConvo: jest.fn(),
  useLocalize: jest.fn(),
  useSubmitMessage: jest.fn(),
}));

jest.mock('~/utils', () => {
  const actualUtils = jest.requireActual('~/utils');
  return {
    ...actualUtils,
    // Only mock logger to suppress test output
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    // Mock theme utilities that interact with DOM
    getInitialTheme: jest.fn(() => 'light'),
    applyFontSize: jest.fn(),
  };
});

// Use actual librechat-data-provider with minimal overrides
jest.mock('librechat-data-provider', () => {
  const actual = jest.requireActual('librechat-data-provider');
  return {
    ...actual,
    // Override schema to avoid complex validation in tests
    tQueryParamsSchema: {
      shape: {
        model: { parse: jest.fn((value) => value) },
        endpoint: { parse: jest.fn((value) => value) },
        temperature: { parse: jest.fn((value) => value) },
      },
    },
  };
});

// Mock data-provider hooks
jest.mock('~/data-provider', () => ({
  useGetAgentByIdQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useListAgentsQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

// Mock global window.history
global.window = Object.create(window);
global.window.history = {
  replaceState: jest.fn(),
  pushState: jest.fn(),
  go: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  length: 1,
  scrollRestoration: 'auto',
  state: null,
};

describe('useQueryParams', () => {
  // Setup common mocks before each test
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();

    // Reset mock for window.history.replaceState
    jest.spyOn(window.history, 'replaceState').mockClear();

    // Reset data-provider mocks
    const dataProvider = jest.requireMock('~/data-provider');
    (dataProvider.useGetAgentByIdQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    // Create mocks for all dependencies
    const mockSearchParams = new URLSearchParams();
    (useSearchParams as jest.Mock).mockReturnValue([mockSearchParams, jest.fn()]);

    const mockQueryClient = {
      getQueryData: jest.fn().mockImplementation((key) => {
        if (key === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        if (key === 'endpoints') {
          return {};
        }
        return null;
      }),
    };
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);

    (useRecoilValue as jest.Mock).mockImplementation((atom) => {
      if (atom === store.modularChat) return false;
      if (atom === store.availableTools) return [];
      return null;
    });

    const mockConversation = { model: null, endpoint: null };
    const mockNewConversation = jest.fn();
    (useChatContext as jest.Mock).mockReturnValue({
      conversation: mockConversation,
      newConversation: mockNewConversation,
    });

    const mockMethods = {
      setValue: jest.fn(),
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: jest.fn((callback) => () => callback({ text: 'test message' })),
    };
    (useChatFormContext as jest.Mock).mockReturnValue(mockMethods);

    const mockSubmitMessage = jest.fn();
    (useSubmitMessage as jest.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    const mockGetDefaultConversation = jest.fn().mockReturnValue({});
    (useDefaultConvo as jest.Mock).mockReturnValue(mockGetDefaultConversation);

    (useAuthContext as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      token: 'test-token',
      isAuthenticated: true,
    });
    (useAgentsMap as jest.Mock).mockReturnValue({});
    (useLocalize as jest.Mock).mockReturnValue((key: string) => key);
    (useToastContext as jest.Mock).mockReturnValue({
      showToast: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // Helper function to set URL parameters for testing
  const setUrlParams = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, value);
    });
    (useSearchParams as jest.Mock).mockReturnValue([searchParams, jest.fn()]);
  };

  // Test cases remain the same
  it('should process query parameters on initial render', () => {
    // Setup
    const mockSetValue = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: jest.fn((callback) => () => callback({ text: 'test message' })),
    });

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        return null;
      }),
    });

    setUrlParams({ q: 'hello world' });

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // Advance timer to trigger interval
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    expect(mockSetValue).toHaveBeenCalledWith(
      'text',
      'hello world',
      expect.objectContaining({ shouldValidate: true }),
    );
    const mockSetSearchParams = (useSearchParams as jest.Mock).mock.results[0].value[1];
    const [params, options] = mockSetSearchParams.mock.calls[0];
    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.toString()).toBe('');
    expect(options).toEqual(expect.objectContaining({ replace: true }));
  });

  it('should auto-submit message when submit=true and no settings to apply', () => {
    // Setup
    const mockSetValue = jest.fn();
    const mockHandleSubmit = jest.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as jest.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        return null;
      }),
    });

    setUrlParams({ q: 'hello world', submit: 'true' });

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // Advance timer to trigger interval
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    expect(mockSetValue).toHaveBeenCalledWith(
      'text',
      'hello world',
      expect.objectContaining({ shouldValidate: true }),
    );
    expect(mockHandleSubmit).toHaveBeenCalled();
    expect(mockSubmitMessage).toHaveBeenCalled();
  });

  it('should resolve PromptHub-style Prompt Catalog inserts before filling the textarea', async () => {
    const mockSetValue = jest.fn();
    const mockSetSearchParams = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: jest.fn((callback) => () => callback({ text: 'test message' })),
    });

    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams({ promptCatalogId: '123' }),
      mockSetSearchParams,
    ]);

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        if (k === 'endpoints') {
          return {};
        }
        return null;
      }),
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ content: 'Prompt from catalog' }),
    });

    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/prompthub/resolve-insert', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ promptCatalogId: '123' }),
    });
    expect(mockSetValue).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockSetValue).toHaveBeenCalledWith(
      'text',
      'Prompt from catalog',
      expect.objectContaining({ shouldValidate: true }),
    );
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      expect.objectContaining({ replace: true }),
    );
  });

  it('should show a toast when resolving a Prompt Catalog insert fails', async () => {
    const mockSetSearchParams = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };
    const showToast = jest.fn();

    (useToastContext as jest.Mock).mockReturnValue({ showToast });
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams({ promptCatalogId: '123' }),
      mockSetSearchParams,
    ]);

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        if (k === 'endpoints') {
          return {};
        }
        return null;
      }),
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'Prompt not found' }),
    });

    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(showToast).toHaveBeenCalledWith({
      message: 'com_ui_prompt_catalog_insert_error',
      severity: 'error',
    });
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      expect.objectContaining({ replace: true }),
    );
  });

  it('should time out and show a toast when auth is ready but token never becomes available', async () => {
    const mockSetSearchParams = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };
    const showToast = jest.fn();

    (useToastContext as jest.Mock).mockReturnValue({ showToast });
    (useAuthContext as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      token: '',
      isAuthenticated: true,
    });
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams({ promptCatalogId: '123' }),
      mockSetSearchParams,
    ]);

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        if (k === 'endpoints') {
          return {};
        }
        return null;
      }),
    });

    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    await act(async () => {
      jest.advanceTimersByTime(5100);
      await Promise.resolve();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith({
      message: 'com_ui_prompt_catalog_insert_error',
      severity: 'error',
    });
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      expect.objectContaining({ replace: true }),
    );
  });

  it('should defer submission when settings need to be applied first', () => {
    // Setup
    const mockSetValue = jest.fn();
    const mockHandleSubmit = jest.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = jest.fn();
    const mockNewConversation = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    // Mock getQueryData to return array format for startupConfig and endpoints
    const mockGetQueryData = jest.fn().mockImplementation((key) => {
      const k = Array.isArray(key) ? key[0] : key;
      if (k === 'startupConfig') {
        return { modelSpecs: { list: [] } };
      }
      if (k === 'endpoints') {
        return {};
      }
      return null;
    });

    (useChatFormContext as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as jest.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    (useChatContext as jest.Mock).mockReturnValue({
      conversation: { model: null, endpoint: null },
      newConversation: mockNewConversation,
    });

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: mockGetQueryData,
    });

    setUrlParams({ q: 'hello world', submit: 'true', model: 'gpt-4' });

    // Execute
    const { rerender } = renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // First interval tick should process params but not submit
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert initial state
    expect(mockGetQueryData).toHaveBeenCalledWith(expect.anything());
    expect(mockNewConversation).toHaveBeenCalled();
    expect(mockSubmitMessage).not.toHaveBeenCalled(); // Not submitted yet

    // Now mock conversation update to trigger settings application check
    (useChatContext as jest.Mock).mockReturnValue({
      conversation: { model: 'gpt-4', endpoint: null },
      newConversation: mockNewConversation,
    });

    // Re-render to trigger the effect that watches for settings
    rerender();

    // Now the message should be submitted
    expect(mockSetValue).toHaveBeenCalledWith(
      'text',
      'hello world',
      expect.objectContaining({ shouldValidate: true }),
    );
    expect(mockHandleSubmit).toHaveBeenCalled();
    expect(mockSubmitMessage).toHaveBeenCalled();
  });

  it('should submit after timeout if settings never get applied', () => {
    // Setup
    const mockSetValue = jest.fn();
    const mockHandleSubmit = jest.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = jest.fn();
    const mockNewConversation = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as jest.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    (useChatContext as jest.Mock).mockReturnValue({
      conversation: { model: null, endpoint: null },
      newConversation: mockNewConversation,
    });

    // Mock startup config and endpoints to allow processing
    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        if (k === 'endpoints') {
          return {};
        }
        return null;
      }),
    });

    setUrlParams({ q: 'hello world', submit: 'true', model: 'non-existent-model' });

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // First interval tick should process params but not submit
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert initial state
    expect(mockSubmitMessage).not.toHaveBeenCalled(); // Not submitted yet

    // Let the timeout happen naturally
    act(() => {
      // Advance timer to trigger the timeout in the hook
      jest.advanceTimersByTime(3000); // MAX_SETTINGS_WAIT_MS
    });

    // Now the message should be submitted due to timeout
    expect(mockSubmitMessage).toHaveBeenCalled();
  });

  it('should mark as submitted when no submit parameter is present', () => {
    // Setup
    const mockSetValue = jest.fn();
    const mockHandleSubmit = jest.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = jest.fn();
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as jest.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        return null;
      }),
    });

    setUrlParams({ model: 'gpt-4' }); // No submit=true

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // First interval tick should process params
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert initial state - submission should be marked as handled
    expect(mockSubmitMessage).not.toHaveBeenCalled();

    // Try to advance timer past the timeout
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Submission still shouldn't happen
    expect(mockSubmitMessage).not.toHaveBeenCalled();
  });

  it('should handle empty query parameters', () => {
    // Setup
    const mockSetValue = jest.fn();
    const mockHandleSubmit = jest.fn();
    const mockSubmitMessage = jest.fn();

    // Force replaceState to be called
    window.history.replaceState = jest.fn();

    (useChatFormContext as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: jest.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as jest.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: jest.fn().mockImplementation((key) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        return null;
      }),
    });

    setUrlParams({}); // Empty params
    const mockTextAreaRef = {
      current: {
        focus: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    expect(mockSetValue).not.toHaveBeenCalled();
    expect(mockHandleSubmit).not.toHaveBeenCalled();
    expect(mockSubmitMessage).not.toHaveBeenCalled();
    const mockSetSearchParams = (useSearchParams as jest.Mock).mock.results[0].value[1];
    const [params, options] = mockSetSearchParams.mock.calls[0];
    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.toString()).toBe('');
    expect(options).toEqual(expect.objectContaining({ replace: true }));
  });
});
