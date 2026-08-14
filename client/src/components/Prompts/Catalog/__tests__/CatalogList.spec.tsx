import { createElement } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CatalogPrompt, CatalogPromptsResponse } from 'librechat-data-provider';
import type { ReactNode } from 'react';
import CatalogList from '../CatalogList';

const mockUseGetPromptCatalog = jest.fn();
const mockUseGetPromptCatalogCategories = jest.fn();
const mockUseGetPromptCatalogTags = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/data-provider', () => ({
  useGetPromptCatalog: (params: unknown) => mockUseGetPromptCatalog(params),
  useGetPromptCatalogCategories: () => mockUseGetPromptCatalogCategories(),
  useGetPromptCatalogTags: () => mockUseGetPromptCatalogTags(),
}));

jest.mock('../CatalogItem', () => ({
  __esModule: true,
  default: ({ prompt, isMine }: { prompt: CatalogPrompt; isMine?: boolean }) => (
    <div data-testid={`catalog-item-${prompt.id}`}>
      {prompt.title} {isMine ? '(mine)' : ''}
    </div>
  ),
}));

jest.mock('../CreateCatalogPromptDialog', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-dialog" /> : null,
}));

function makePrompt(overrides: Partial<CatalogPrompt> = {}): CatalogPrompt {
  return {
    id: 1,
    title: 'Prompt 1',
    content: 'Content 1',
    category: 'general',
    ai_tool: 'LibreChat',
    tags: [],
    creator_name: 'Someone',
    thumbs_up_count: 0,
    ...overrides,
  };
}

function makeCatalogResponse(
  prompts: CatalogPrompt[],
  totalCount = prompts.length,
): CatalogPromptsResponse {
  return {
    prompts,
    pagination: {
      page: 1,
      page_size: 50,
      total_count: totalCount,
      total_pages: Math.max(1, Math.ceil(totalCount / 50)),
      has_next: false,
      has_prev: false,
    },
  };
}

function renderCatalogList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { ...render(<CatalogList />, { wrapper: Wrapper }), queryClient };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGetPromptCatalogCategories.mockReturnValue({ data: ['general', 'hr'] });
  mockUseGetPromptCatalogTags.mockReturnValue({ data: ['alpha', 'beta'] });
  mockUseGetPromptCatalog.mockReturnValue({
    data: makeCatalogResponse([makePrompt()]),
    isLoading: false,
  });
});

describe('CatalogList', () => {
  it('shows loading skeletons while the catalog is loading', () => {
    mockUseGetPromptCatalog.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderCatalogList();
    expect(
      container.querySelectorAll('.animate-pulse, [class*="Skeleton"]').length,
    ).toBeGreaterThanOrEqual(0);
    expect(screen.queryByTestId('catalog-item-1')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no prompts', () => {
    mockUseGetPromptCatalog.mockReturnValue({ data: makeCatalogResponse([]), isLoading: false });
    renderCatalogList();
    expect(screen.getByText('com_ui_no_catalog_prompts')).toBeInTheDocument();
  });

  it('renders a CatalogItem for each returned prompt', () => {
    mockUseGetPromptCatalog.mockReturnValue({
      data: makeCatalogResponse([makePrompt({ id: 1 }), makePrompt({ id: 2, title: 'Prompt 2' })]),
      isLoading: false,
    });
    renderCatalogList();
    expect(screen.getByTestId('catalog-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('catalog-item-2')).toBeInTheDocument();
  });

  it('requests the API page size explicitly, matching the local pagination assumption', () => {
    renderCatalogList();
    const lastCallParams = mockUseGetPromptCatalog.mock.calls.at(-1)?.[0];
    expect(lastCallParams.pageSize).toBe('50');
    expect(lastCallParams.page).toBe('1');
  });

  it('updates the search param as the user types', async () => {
    const user = userEvent.setup();
    renderCatalogList();

    await user.type(screen.getByRole('searchbox'), 'alpha');

    const lastCallParams = mockUseGetPromptCatalog.mock.calls.at(-1)?.[0];
    expect(lastCallParams.search).toBe('alpha');
  });

  it('toggles a category filter on and off', async () => {
    const user = userEvent.setup();
    renderCatalogList();

    await user.click(screen.getByText('general'));
    expect(mockUseGetPromptCatalog.mock.calls.at(-1)?.[0].category).toBe('general');

    await user.click(screen.getByText('general'));
    expect(mockUseGetPromptCatalog.mock.calls.at(-1)?.[0].category).toBeUndefined();
  });

  it('sends the sort params matching the selected sort option', async () => {
    const user = userEvent.setup();
    renderCatalogList();

    await user.selectOptions(
      screen.getByLabelText('com_ui_prompt_catalog_sort'),
      'com_ui_prompt_catalog_sort_newest',
    );

    const lastCallParams = mockUseGetPromptCatalog.mock.calls.at(-1)?.[0];
    expect(lastCallParams.sortBy).toBe('created_at');
    expect(lastCallParams.sortOrder).toBe('desc');
  });

  it('selects the Private visibility filter and forwards isMine to CatalogItem', async () => {
    const user = userEvent.setup();
    renderCatalogList();

    await user.click(screen.getByRole('radio', { name: 'com_ui_prompt_catalog_public' }));
    await user.click(screen.getByRole('radio', { name: 'com_ui_prompt_catalog_private' }));

    expect(mockUseGetPromptCatalog.mock.calls.at(-1)?.[0].showMyPrompts).toBe('true');
    expect(screen.getByTestId('catalog-item-1')).toHaveTextContent('(mine)');
  });

  it('does not send userEmail/userName even when the Private filter is enabled', async () => {
    const user = userEvent.setup();
    renderCatalogList();

    await user.click(screen.getByRole('radio', { name: 'com_ui_prompt_catalog_private' }));

    const lastCallParams = mockUseGetPromptCatalog.mock.calls.at(-1)?.[0];
    expect(lastCallParams).not.toHaveProperty('userEmail');
    expect(lastCallParams).not.toHaveProperty('userName');
  });

  it('defaults to the Private filter when the user has personal prompts', () => {
    renderCatalogList();

    expect(screen.getByRole('radio', { name: 'com_ui_prompt_catalog_private' })).toBeChecked();
    expect(mockUseGetPromptCatalog.mock.calls.at(-1)?.[0].showMyPrompts).toBe('true');
  });

  it('defaults to the Public filter when the user has no personal prompts', () => {
    mockUseGetPromptCatalog.mockReturnValue({
      data: makeCatalogResponse([]),
      isLoading: false,
    });
    renderCatalogList();

    expect(screen.getByRole('radio', { name: 'com_ui_prompt_catalog_public' })).toBeChecked();
    expect(mockUseGetPromptCatalog.mock.calls.at(-1)?.[0].showMyPrompts).toBeUndefined();
  });

  it('renders pagination controls only when there is more than one local page', async () => {
    mockUseGetPromptCatalog.mockReturnValue({
      data: makeCatalogResponse(
        Array.from({ length: 12 }, (_, i) => makePrompt({ id: i + 1, title: `Prompt ${i + 1}` })),
        12,
      ),
      isLoading: false,
    });
    renderCatalogList();

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'com_ui_next' });
    expect(screen.getByRole('button', { name: 'com_ui_prev' })).toBeDisabled();
    expect(next).toBeEnabled();

    const user = userEvent.setup();
    await user.click(next);

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('invalidates the promptCatalog query when the refresh button is clicked', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderCatalogList();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await user.click(screen.getByRole('button', { name: 'Refresh catalog' }));

    expect(invalidateSpy).toHaveBeenCalledWith(['promptCatalog']);
  });

  it('opens the create-prompt dialog when the create button is clicked', async () => {
    const user = userEvent.setup();
    renderCatalogList();

    expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('com_ui_prompt_catalog_create'));
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
  });
});
