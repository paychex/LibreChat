import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from 'test/layout-test-utils';
import Settings from './Settings';

/**
 * `Settings` is a thin wrapper around `SettingsDialog`, which derives its tab
 * list from the declarative `registry`/`Content` system (see `Settings/types.ts`
 * and `Settings/Content.tsx`). Visibility of individual tabs (e.g. hiding the
 * About tab when `buildInfo` is disabled) is already covered by
 * `Settings/__tests__/Sidebar.spec.tsx`. This file focuses on the one behavior
 * not covered elsewhere: `Dialog.tsx` falling back to the General tab when the
 * currently active tab becomes hidden after a config change.
 */

const mockUseGetStartupConfig = jest.fn();

jest.mock('~/data-provider', () => {
  const actual = jest.requireActual('~/data-provider');
  return {
    ...actual,
    useGetStartupConfig: () => mockUseGetStartupConfig(),
  };
});

jest.mock('./Settings/Content', () =>
  jest.fn(({ activeTab }: { activeTab: string }) => <div data-testid="content">{activeTab}</div>),
);

function renderSettings() {
  return render(<Settings open={true} onOpenChange={jest.fn()} />);
}

beforeEach(() => {
  mockUseGetStartupConfig.mockReturnValue({ data: { interface: { buildInfo: true } } });
});

describe('Settings', () => {
  it('resets the active tab to General when the active tab becomes hidden by config', async () => {
    const { rerender } = renderSettings();

    await userEvent.click(screen.getByRole('tab', { name: 'About' }));
    expect(screen.getByTestId('content')).toHaveTextContent('about');

    mockUseGetStartupConfig.mockReturnValue({ data: { interface: { buildInfo: false } } });
    rerender(<Settings open={true} onOpenChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('content')).toHaveTextContent('general');
    });
    expect(screen.queryByRole('tab', { name: 'About' })).not.toBeInTheDocument();
  });
});
