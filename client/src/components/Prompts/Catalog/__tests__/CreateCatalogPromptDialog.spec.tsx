import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import type { CatalogPrompt } from 'librechat-data-provider';
import CreateCatalogPromptDialog from '../CreateCatalogPromptDialog';

const mockShowToast = jest.fn();
const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();
const mockUseCreatePromptCatalogPrompt = jest.fn();
const mockUseUpdatePromptCatalogPrompt = jest.fn();
const mockUseGetPromptCatalogCategories = jest.fn();

jest.mock('@librechat/client', () => ({
  OGDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  OGDialogContent: ({ children }: any) => <div>{children}</div>,
  Input: (props: any) => <input {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  TextareaAutosize: ({ minRows: _minRows, maxRows: _maxRows, ...props }: any) => (
    <textarea {...props} />
  ),
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/data-provider', () => ({
  useCreatePromptCatalogPrompt: (opts: any) => mockUseCreatePromptCatalogPrompt(opts),
  useUpdatePromptCatalogPrompt: (opts: any) => mockUseUpdatePromptCatalogPrompt(opts),
  useGetPromptCatalogCategories: () => mockUseGetPromptCatalogCategories(),
}));

function makePrompt(overrides: Partial<CatalogPrompt> = {}): CatalogPrompt {
  return {
    id: 12,
    title: 'Existing Title',
    content: 'Existing content',
    category: 'General',
    ai_tool: 'Copilot',
    tags: ['one', 'two'],
    creator_name: 'Jane Doe',
    thumbs_up_count: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGetPromptCatalogCategories.mockReturnValue({ data: ['General', 'HR'] });
  mockUseCreatePromptCatalogPrompt.mockImplementation((opts: any) => ({
    mutate: (input: unknown) => {
      mockCreateMutate(input);
      opts?.onSuccess?.({ id: 1 });
    },
    isLoading: false,
  }));
  mockUseUpdatePromptCatalogPrompt.mockImplementation((opts: any) => ({
    mutate: (input: unknown) => {
      mockUpdateMutate(input);
      opts?.onSuccess?.({ id: 1 });
    },
    isLoading: false,
  }));
});

describe('CreateCatalogPromptDialog', () => {
  it('renders the create title and empty fields when no prompt is provided', () => {
    render(<CreateCatalogPromptDialog isOpen setIsOpen={jest.fn()} />);
    expect(screen.getByText('com_ui_prompt_catalog_create_title')).toBeInTheDocument();
    expect(screen.getByLabelText('com_ui_prompt_catalog_field_title')).toHaveValue('');
  });

  it('pre-fills fields from the prompt in edit mode', () => {
    render(<CreateCatalogPromptDialog isOpen setIsOpen={jest.fn()} prompt={makePrompt()} />);
    expect(screen.getByText('com_ui_prompt_catalog_edit_title')).toBeInTheDocument();
    expect(screen.getByLabelText('com_ui_prompt_catalog_field_title')).toHaveValue(
      'Existing Title',
    );
    expect(screen.getByLabelText('com_ui_prompt_catalog_field_content')).toHaveValue(
      'Existing content',
    );
    expect(screen.getByLabelText('com_ui_prompt_catalog_field_tags', { exact: false })).toHaveValue(
      'one, two',
    );
  });

  it('creates a prompt with trimmed fields, parsed tags, and no client-supplied identity fields', async () => {
    const user = userEvent.setup();
    render(<CreateCatalogPromptDialog isOpen setIsOpen={jest.fn()} />);

    await user.type(screen.getByLabelText('com_ui_prompt_catalog_field_title'), '  My Title  ');
    await user.type(screen.getByLabelText('com_ui_prompt_catalog_field_content'), '  My Content  ');
    await user.type(
      screen.getByLabelText('com_ui_prompt_catalog_field_tags', { exact: false }),
      ' foo , bar ,, ',
    );
    await user.click(screen.getByText('com_ui_create'));

    expect(mockCreateMutate).toHaveBeenCalledWith({
      title: 'My Title',
      content: 'My Content',
      category: undefined,
      ai_tool: 'LibreChat',
      tags: ['foo', 'bar'],
      is_public: false,
    });
  });

  it('submits an update with the prompt id merged in, in edit mode', async () => {
    const user = userEvent.setup();
    render(
      <CreateCatalogPromptDialog isOpen setIsOpen={jest.fn()} prompt={makePrompt({ id: 99 })} />,
    );

    await user.click(screen.getByText('com_ui_save'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99, title: 'Existing Title', content: 'Existing content' }),
    );
    expect(mockUpdateMutate.mock.calls[0][0]).not.toHaveProperty('userEmail');
    expect(mockUpdateMutate.mock.calls[0][0]).not.toHaveProperty('userName');
  });

  it('does not submit when title or content is blank', async () => {
    const user = userEvent.setup();
    render(<CreateCatalogPromptDialog isOpen setIsOpen={jest.fn()} />);

    await user.click(screen.getByText('com_ui_create'));

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('toggles visibility between private and public', async () => {
    const user = userEvent.setup();
    render(<CreateCatalogPromptDialog isOpen setIsOpen={jest.fn()} />);

    const publicRadio = screen.getByRole('radio', { name: 'com_ui_prompt_catalog_public' });
    const privateRadio = screen.getByRole('radio', { name: 'com_ui_prompt_catalog_private' });
    expect(privateRadio).toBeChecked();

    await user.click(publicRadio);
    expect(publicRadio).toBeChecked();
    expect(privateRadio).not.toBeChecked();
  });

  it('disables the submit and cancel buttons while a mutation is in flight', () => {
    mockUseCreatePromptCatalogPrompt.mockReturnValue({ mutate: mockCreateMutate, isLoading: true });
    render(<CreateCatalogPromptDialog isOpen setIsOpen={jest.fn()} />);

    expect(screen.getByText('com_ui_cancel').closest('button')).toBeDisabled();
    expect(screen.getByText('com_ui_saving').closest('button')).toBeDisabled();
  });
});
