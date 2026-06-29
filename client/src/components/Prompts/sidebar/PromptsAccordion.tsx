import { SystemRoles } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks';
import { AdminSettings } from '~/components/Prompts';
import CatalogList from '~/components/Prompts/Catalog/CatalogList';
import AutoSendPrompt from '../buttons/AutoSendPrompt';
import PromptSidePanel from './GroupSidePanel';
import FilterPrompts from './FilterPrompts';

export default function PromptsAccordion() {
  const { user } = useAuthContext();
  return (
    <div className="flex h-full w-full flex-col">
      <PromptSidePanel className="space-y-2 pt-2">
        <FilterPrompts />
        {user?.role === SystemRoles.ADMIN && <AdminSettings />}
        <AutoSendPrompt />
      </PromptSidePanel>
      <div className="px-1">
        <CatalogList />
      </div>
    </div>
  );
}
