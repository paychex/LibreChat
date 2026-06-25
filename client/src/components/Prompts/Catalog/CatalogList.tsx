import { useState } from 'react';
import { FileText, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@librechat/client';
import type { CatalogPrompt } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import CatalogItem from './CatalogItem';

export default function CatalogList({
  prompts,
  isLoading,
}: {
  prompts: CatalogPrompt[];
  isLoading: boolean;
}) {
  const localize = useLocalize();
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const filtered = search.trim()
    ? prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase()) ||
          p.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())),
      )
    : prompts;

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder={localize('com_ui_prompt_catalog_search')}
              className="w-full rounded-lg border border-border-light bg-surface-primary py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-heavy"
              aria-label={localize('com_ui_prompt_catalog_search')}
            />
          </div>

          <div className="mt-1 flex flex-col overflow-y-auto">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="my-2 flex h-[84px] w-full rounded-2xl border-0 px-3 pb-4 pt-3" />
              ))}

            {!isLoading && filtered.length === 0 && (
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

            {!isLoading &&
              filtered.map((prompt) => <CatalogItem key={prompt.id} prompt={prompt} />)}
          </div>
        </>
      )}
    </div>
  );
}
