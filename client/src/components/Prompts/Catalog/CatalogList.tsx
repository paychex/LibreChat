import { useMemo, useState } from 'react';
import { FileText, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Skeleton } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useGetPromptCatalog } from '~/data-provider';
import CatalogItem from './CatalogItem';

const LOCAL_PAGE_SIZE = 5;
const API_PAGE_SIZE = 50;

export default function CatalogList() {
  const localize = useLocalize();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [localPage, setLocalPage] = useState(1);
  const [isExpanded, setIsExpanded] = useState(true);

  // Which API page holds the current local page
  const apiPage = useMemo(
    () => Math.ceil((localPage * LOCAL_PAGE_SIZE) / API_PAGE_SIZE),
    [localPage],
  );

  const { data, isLoading } = useGetPromptCatalog({
    search: debouncedSearch || undefined,
    page: String(apiPage),
  });

  const allPrompts = data?.prompts ?? [];
  const totalCount = data?.pagination?.total_count ?? 0;
  const totalLocalPages = Math.ceil(totalCount / LOCAL_PAGE_SIZE);

  // Slice the 50-item API page down to the 5 we want
  const offsetWithinApiPage = ((localPage - 1) * LOCAL_PAGE_SIZE) % API_PAGE_SIZE;
  const prompts = allPrompts.slice(offsetWithinApiPage, offsetWithinApiPage + LOCAL_PAGE_SIZE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setLocalPage(1);
    setDebouncedSearch(e.target.value);
  };

  return (
    <div className="mt-3 flex flex-col">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm font-semibold text-text-primary hover:bg-surface-hover"
        aria-expanded={isExpanded}
      >
        <span>{localize('com_ui_prompt_catalog')}</span>
        {isExpanded ? (
          <ChevronUp className="size-4 text-text-secondary" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 text-text-secondary" aria-hidden="true" />
        )}
      </button>

      {isExpanded && (
        <>
          <div className="relative mt-1 px-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder={localize('com_ui_prompt_catalog_search')}
              className="w-full rounded-lg border border-border-light bg-surface-primary py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-heavy"
              aria-label={localize('com_ui_prompt_catalog_search')}
            />
          </div>

          <div className="mt-1 flex flex-col overflow-y-auto">
            {isLoading &&
              Array.from({ length: LOCAL_PAGE_SIZE }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="my-2 flex h-[84px] w-full rounded-2xl border-0 px-3 pb-4 pt-3"
                />
              ))}

            {!isLoading && prompts.length === 0 && (
              <div
                className={cn(
                  'my-2 flex flex-col items-center justify-center rounded-lg border border-border-light bg-transparent p-6 text-center',
                )}
              >
                <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-tertiary">
                  <FileText className="size-5 text-text-secondary" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {localize('com_ui_no_catalog_prompts')}
                </p>
              </div>
            )}

            {!isLoading && prompts.map((prompt) => <CatalogItem key={prompt.id} prompt={prompt} />)}
          </div>

          {totalLocalPages > 1 && (
            <div
              className="flex items-center justify-between pt-1"
              role="navigation"
              aria-label={localize('com_ui_prompt_catalog')}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalPage((p) => p - 1)}
                disabled={localPage <= 1 || isLoading}
                aria-label={localize('com_ui_prev')}
              >
                {localize('com_ui_prev')}
              </Button>
              <span className="text-xs text-text-secondary">
                {localPage} / {totalLocalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalPage((p) => p + 1)}
                disabled={localPage >= totalLocalPages || isLoading}
                aria-label={localize('com_ui_next')}
              >
                {localize('com_ui_next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
