import PromptSidePanel from '~/components/Prompts/Groups/GroupSidePanel';
import AutoSendPrompt from '~/components/Prompts/Groups/AutoSendPrompt';
import FilterPrompts from '~/components/Prompts/Groups/FilterPrompts';
import CatalogList from '~/components/Prompts/Catalog/CatalogList';
import { usePromptGroupsContext } from '~/Providers';
import { useGetPromptCatalog } from '~/data-provider';

export default function PromptsAccordion() {
  const groupsNav = usePromptGroupsContext();
  const { data: catalogData, isLoading: isCatalogLoading } = useGetPromptCatalog();

  return (
    <div className="flex h-full w-full flex-col">
      <PromptSidePanel className="mt-2 space-y-2 lg:w-full xl:w-full" {...groupsNav}>
        <FilterPrompts className="items-center justify-center" />
        <div className="flex w-full flex-row items-center justify-end">
          <AutoSendPrompt className="text-xs dark:text-white" />
        </div>
      </PromptSidePanel>
      <div className="px-1">
        <CatalogList
          prompts={catalogData?.prompts ?? []}
          isLoading={isCatalogLoading}
        />
      </div>
    </div>
  );
}
