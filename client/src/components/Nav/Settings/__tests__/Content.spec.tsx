import { render, screen } from '@testing-library/react';
import { SettingsTabValues } from 'librechat-data-provider';
import type { SettingsContextValue } from '../types';
import Content from '../Content';

/**
 * Replaces the deleted `SettingsTabs/Account/Account.spec.tsx`, which tested a
 * standalone `Account` component that no longer exists. Settings fields are now
 * gated declaratively via `entry.show(ctx)` in the shared `registry`/`Content`
 * system (see `Content.tsx`'s `visible()` helper). This test exercises that
 * exact mechanism using the `deleteAccount` entry (gated by
 * `ctx.allowAccountDeletion`) as a concrete example, without depending on the
 * real (heavy) registry.
 */

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('../registry', () => ({
  registry: [
    {
      id: 'deleteAccount',
      tab: 'account',
      section: 'danger',
      labelKey: 'com_ui_settings_label_delete_account',
      show: (ctx: SettingsContextValue) => ctx.allowAccountDeletion,
      Component: () => <div data-testid="delete-account" />,
    },
    {
      id: 'avatar',
      tab: 'account',
      section: 'profile',
      labelKey: 'com_ui_settings_label_avatar',
      Component: () => <div data-testid="avatar" />,
    },
  ],
}));

const baseCtx: SettingsContextValue = {
  balanceEnabled: false,
  hasAnyPersonalizationFeature: false,
  hasMemoryOptOut: false,
  hasRemoteAgents: false,
  hasUserProvidedEndpoints: false,
  hasMultiConvo: false,
  hasPrompts: false,
  isLocalProvider: true,
  twoFactorEnabled: false,
  allowAccountDeletion: true,
  aboutEnabled: false,
  engineTTS: 'browser',
};

describe('Content', () => {
  it('renders an entry whose show predicate returns true', () => {
    render(<Content activeTab={SettingsTabValues.ACCOUNT} query="" ctx={baseCtx} />);
    expect(screen.getByTestId('delete-account')).toBeInTheDocument();
  });

  it('hides an entry whose show predicate returns false', () => {
    render(
      <Content
        activeTab={SettingsTabValues.ACCOUNT}
        query=""
        ctx={{ ...baseCtx, allowAccountDeletion: false }}
      />,
    );
    expect(screen.queryByTestId('delete-account')).not.toBeInTheDocument();
  });

  it('always renders entries without a show predicate', () => {
    render(
      <Content
        activeTab={SettingsTabValues.ACCOUNT}
        query=""
        ctx={{ ...baseCtx, allowAccountDeletion: false }}
      />,
    );
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });
});
