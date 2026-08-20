import { render, screen, fireEvent } from '@testing-library/react';
import type { CatalogPrompt } from 'librechat-data-provider';
import CatalogItem from '../CatalogItem';

const mockShowToast = jest.fn();
const mockSubmitPrompt = jest.fn();
const mockUseAuthContext = jest.fn();
const mockDeleteMutate = jest.fn();
const mockUseDeletePromptCatalogPrompt = jest.fn();

jest.mock('@librechat/client', () => ({
  OGDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  OGDialogTemplate: ({ title, main, buttons, selection }: any) => (
    <div>
      <h2>{title}</h2>
      <div>{main}</div>
      {selection && (
        <button onClick={selection.selectHandler} disabled={selection.isLoading}>
          {selection.selectText}
        </button>
      )}
      <div>{buttons}</div>
    </div>
  ),
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: any) => <>{children}</>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" onClick={onClick}>
      {children}
    </div>
  ),
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  TextareaAutosize: (props: any) => <textarea {...props} />,
  Label: (props: any) => <label {...props} />,
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('~/hooks/Messages/useSubmitMessage', () => ({
  __esModule: true,
  default: () => ({ submitPrompt: mockSubmitPrompt }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock('~/data-provider', () => ({
  useDeletePromptCatalogPrompt: (opts: any) => mockUseDeletePromptCatalogPrompt(opts),
}));

jest.mock('../CreateCatalogPromptDialog', () => ({
  __esModule: true,
  default: ({ prompt }: any) => <div data-testid="edit-dialog">{prompt?.id}</div>,
}));

jest.mock('~/components/Prompts', () => ({
  __esModule: true,
  ListCard: ({ onClick, children }: any) => (
    <div>
      <button type="button" aria-label="com_ui_prompt_group_button" onClick={onClick} />
      {children}
    </div>
  ),
  VariableDialog: ({ open, group, onClose }: any) =>
    open ? (
      <div data-testid="variable-dialog">
        <span data-testid="variable-prompt">{group?.productionPrompt?.prompt}</span>
        <button onClick={onClose}>close-variable-dialog</button>
      </div>
    ) : null,
}));

function makePrompt(overrides: Partial<CatalogPrompt> = {}): CatalogPrompt {
  return {
    id: 1,
    title: 'Sample Prompt',
    content: 'Sample content',
    category: 'General',
    ai_tool: 'LibreChat',
    tags: ['a', 'b'],
    creator_name: 'Jane Doe',
    thumbs_up_count: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuthContext.mockReturnValue({ user: { name: 'Jane Doe', email: 'jane@example.com' } });
  mockUseDeletePromptCatalogPrompt.mockImplementation((opts: any) => ({
    mutate: (input: unknown) => {
      mockDeleteMutate(input);
      opts?.onSuccess?.();
    },
    isLoading: false,
  }));
});

describe('CatalogItem', () => {
  it('shows Edit/Delete actions when the creator matches the current user', () => {
    render(<CatalogItem prompt={makePrompt({ creator_name: 'Jane Doe' })} />);
    expect(screen.getByText('com_ui_edit')).toBeInTheDocument();
    expect(screen.getByText('com_ui_delete')).toBeInTheDocument();
  });

  it('hides Edit/Delete actions when the creator does not match the current user', () => {
    render(<CatalogItem prompt={makePrompt({ creator_name: 'Someone Else' })} />);
    expect(screen.queryByText('com_ui_edit')).not.toBeInTheDocument();
    expect(screen.queryByText('com_ui_delete')).not.toBeInTheDocument();
  });

  it('always shows Edit/Delete actions in "My Prompts" mode regardless of name matching', () => {
    render(<CatalogItem prompt={makePrompt({ creator_name: 'Nobody Matches' })} isMine />);
    expect(screen.getByText('com_ui_edit')).toBeInTheDocument();
    expect(screen.getByText('com_ui_delete')).toBeInTheDocument();
  });

  it('submits the prompt content when the card is clicked', () => {
    render(<CatalogItem prompt={makePrompt()} />);
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompt_group_button' }));
    expect(mockSubmitPrompt).toHaveBeenCalledWith('Sample content');
  });

  it('does not submit when the prompt content is blank', () => {
    render(<CatalogItem prompt={makePrompt({ content: '   ' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompt_group_button' }));
    expect(mockSubmitPrompt).not.toHaveBeenCalled();
  });

  it('opens the variable dialog instead of submitting when the prompt has variables', () => {
    const content = 'Create INC {{inc_number}} for user {{user_id}}';
    render(<CatalogItem prompt={makePrompt({ content })} />);
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompt_group_button' }));
    expect(screen.getByTestId('variable-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('variable-prompt')).toHaveTextContent(content);
    expect(mockSubmitPrompt).not.toHaveBeenCalled();
  });

  it('opens the variable dialog from the View dialog Use button when the prompt has variables', () => {
    render(<CatalogItem prompt={makePrompt({ content: 'Hello {{name}}' })} />);
    fireEvent.click(screen.getByText('com_ui_prompt_catalog_view'));
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompt_catalog_use' }));
    expect(screen.getByTestId('variable-dialog')).toBeInTheDocument();
    expect(mockSubmitPrompt).not.toHaveBeenCalled();
  });

  it('deletes using only the prompt id — no client-supplied identity fields', () => {
    render(<CatalogItem prompt={makePrompt({ id: 55, creator_name: 'Jane Doe' })} />);

    fireEvent.click(screen.getByText('com_ui_delete'));
    fireEvent.click(screen.getByText('com_ui_delete', { selector: 'button' }));

    expect(mockDeleteMutate).toHaveBeenCalledWith({ id: 55 });
  });
});
