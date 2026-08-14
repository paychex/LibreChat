import { useMemo, useState, useEffect } from 'react';
import { FileText, Search, Tag, RefreshCw, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import { Button, Skeleton } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import {
  useGetPromptCatalog,
  useGetPromptCatalogCategories,
  useGetPromptCatalogTags,
} from '~/data-provider';
import CatalogItem from './CatalogItem';
import CreateCatalogPromptDialog from './CreateCatalogPromptDialog';

const LOCAL_PAGE_SIZE = 5;
const API_PAGE_SIZE = 50;

type SortBy = 'default' | 'az' | 'za' | 'newest' | 'oldest';

type PromptVisibility = 'private' | 'public';

const SORT_API_PARAMS: Record<
  SortBy,
  { sortBy?: 'title' | 'created_at' | 'thumbs_up_count'; sortOrder?: 'asc' | 'desc' }
> = {
  default: {},
  az: { sortBy: 'title', sortOrder: 'asc' },
  za: { sortBy: 'title', sortOrder: 'desc' },
  newest: { sortBy: 'created_at', sortOrder: 'desc' },
  oldest: { sortBy: 'created_at', sortOrder: 'asc' },
};

export default function CatalogList() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [visibility, setVisibility] = useState<PromptVisibility>('private');
  const [visibilityUserSelected, setVisibilityUserSelected] = useState(false);
  const [localPage, setLocalPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filteredTagSuggestionsOpen, setFilteredTagSuggestionsOpen] = useState(false);

  const { data: categoriesQueryData } = useGetPromptCatalogCategories();
  const availableCategories = categoriesQueryData ?? [];

  const { data: tagsQueryData } = useGetPromptCatalogTags();

  const apiPage = useMemo(
    () => Math.ceil((localPage * LOCAL_PAGE_SIZE) / API_PAGE_SIZE),
    [localPage],
  );

  const sortParams = SORT_API_PARAMS[sortBy];

  // Probe (unfiltered) to learn whether the user has any personal prompts, so the
  // visibility filter can default to Private when they do and Public when they don't.
  const { data: myPromptsProbe } = useGetPromptCatalog({
    showMyPrompts: 'true',
    page: '1',
    pageSize: '1',
  });
  const hasPersonalPrompts = (myPromptsProbe?.pagination?.total_count ?? 0) > 0;

  useEffect(() => {
    if (visibilityUserSelected || myPromptsProbe === undefined) {
      return;
    }
    setVisibility(hasPersonalPrompts ? 'private' : 'public');
  }, [myPromptsProbe, hasPersonalPrompts, visibilityUserSelected]);

  const showMyPrompts = visibility === 'private';

  const { data, isLoading } = useGetPromptCatalog({
    search: debouncedSearch || undefined,
    category: selectedCategory || undefined,
    tag: selectedTag || undefined,
    page: String(apiPage),
    pageSize: String(API_PAGE_SIZE),
    showMyPrompts: showMyPrompts ? 'true' : undefined,
    sortBy: sortParams.sortBy,
    sortOrder: sortParams.sortOrder,
  });

  const totalCount = data?.pagination?.total_count ?? 0;
  const totalLocalPages = Math.ceil(totalCount / LOCAL_PAGE_SIZE);
  const offsetWithinApiPage = ((localPage - 1) * LOCAL_PAGE_SIZE) % API_PAGE_SIZE;
  const allPrompts = data?.prompts ?? [];
  const prompts = allPrompts.slice(offsetWithinApiPage, offsetWithinApiPage + LOCAL_PAGE_SIZE);

  const filteredTagSuggestions = useMemo(
    () =>
      tagInput.trim()
        ? (tagsQueryData ?? []).filter(
            (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && t !== selectedTag,
          )
        : [],
    [tagInput, tagsQueryData, selectedTag],
  );

  const resetPage = () => setLocalPage(1);

  const handleVisibilityChange = (next: PromptVisibility) => {
    setVisibility(next);
    setVisibilityUserSelected(true);
    resetPage();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setDebouncedSearch(e.target.value);
    resetPage();
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? '' : cat));
    resetPage();
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
    if (!e.target.value.trim()) {
      setSelectedTag('');
      resetPage();
    }
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
    setTagInput(tag);
    setFilteredTagSuggestionsOpen(false);
    resetPage();
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setSelectedTag(tagInput.trim());
      setFilteredTagSuggestionsOpen(false);
      resetPage();
    }
    if (e.key === 'Escape') {
      setFilteredTagSuggestionsOpen(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col">
      <div className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-primary">
        <span className="truncate">{localize('com_ui_prompt_catalog')}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="flex h-7 items-center gap-1 px-2 text-xs"
            aria-label={localize('com_ui_prompt_catalog_create')}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {localize('com_ui_prompt_catalog_create')}
          </Button>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries([QueryKeys.promptCatalog])}
            className="rounded p-0.5 text-text-secondary hover:text-text-primary"
            aria-label="Refresh catalog"
            title="Refresh catalog"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <>
        {/* Search */}
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

        {/* Divider */}
        <div className="mx-1 mt-2 border-t border-border-medium" />

        {/* Category chips */}
        <div className="mt-2 px-1" role="group" aria-label="Filter by category">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">
            {localize('com_ui_prompt_catalog_categories')}
          </p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => handleCategoryClick('')}
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs transition-colors',
                selectedCategory === ''
                  ? 'border-brand-purple bg-brand-purple text-white'
                  : 'border-border-light bg-surface-primary text-text-secondary hover:bg-surface-hover',
              )}
            >
              {localize('com_ui_prompt_catalog_all')}
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs transition-colors',
                  selectedCategory === cat
                    ? 'border-brand-purple bg-brand-purple text-white'
                    : 'border-border-light bg-surface-primary text-text-secondary hover:bg-surface-hover',
                )}
                aria-pressed={selectedCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tag filter */}
        <div className="relative mt-2 px-1">
          <Tag
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="text"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagInputKeyDown}
            onFocus={() => setFilteredTagSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setFilteredTagSuggestionsOpen(false), 150)}
            placeholder={localize('com_ui_prompt_catalog_tag_filter')}
            className="w-full rounded-lg border border-border-light bg-surface-primary py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-heavy"
            aria-label={localize('com_ui_prompt_catalog_tag_filter')}
            aria-autocomplete="list"
          />
          {filteredTagSuggestionsOpen && filteredTagSuggestions.length > 0 && (
            <ul
              className="absolute z-10 mt-1 w-full rounded-lg border border-border-light bg-surface-primary py-1 shadow-md"
              role="listbox"
            >
              {filteredTagSuggestions.map((tag) => (
                <li
                  key={tag}
                  role="option"
                  aria-selected={selectedTag === tag}
                  onMouseDown={() => handleTagSelect(tag)}
                  className="cursor-pointer px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active tag badge */}
        {selectedTag && (
          <div className="mt-1 flex items-center gap-1 px-1">
            <span className="flex items-center gap-1 rounded-full border border-border-light bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary">
              <Tag className="size-3" aria-hidden="true" />
              {selectedTag}
              <button
                type="button"
                aria-label={`Remove tag filter: ${selectedTag}`}
                onClick={() => {
                  setSelectedTag('');
                  setTagInput('');
                  resetPage();
                }}
                className="ml-0.5 text-text-secondary hover:text-text-primary"
              >
                ×
              </button>
            </span>
          </div>
        )}

        {/* Visibility filter + Sort row */}
        <div className="mt-2 flex items-center gap-3 px-1">
          <div
            className="flex items-center gap-3"
            role="radiogroup"
            aria-label={localize('com_ui_prompt_catalog_field_visibility')}
          >
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-primary">
              <input
                type="radio"
                name="catalog-visibility-filter"
                value="private"
                checked={visibility === 'private'}
                onChange={() => handleVisibilityChange('private')}
                className="size-3.5 accent-green-600"
              />
              {localize('com_ui_prompt_catalog_private')}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-primary">
              <input
                type="radio"
                name="catalog-visibility-filter"
                value="public"
                checked={visibility === 'public'}
                onChange={() => handleVisibilityChange('public')}
                className="size-3.5 accent-green-600"
              />
              {localize('com_ui_prompt_catalog_public')}
            </label>
          </div>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortBy);
              resetPage();
            }}
            aria-label={localize('com_ui_prompt_catalog_sort')}
            className="ml-auto rounded-lg border border-border-light bg-surface-primary py-0.5 pl-2 pr-6 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-heavy"
          >
            <option value="default">{localize('com_ui_prompt_catalog_sort_default')}</option>
            <option value="az">{localize('com_ui_prompt_catalog_sort_az')}</option>
            <option value="za">{localize('com_ui_prompt_catalog_sort_za')}</option>
            <option value="newest">{localize('com_ui_prompt_catalog_sort_newest')}</option>
            <option value="oldest">{localize('com_ui_prompt_catalog_sort_oldest')}</option>
          </select>
        </div>

        {/* Divider between filters and results */}
        <div className="mt-3 flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-border-medium" />
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            {localize('com_ui_prompt_catalog_results')}
          </span>
          <div className="h-px flex-1 bg-border-medium" />
        </div>

        {/* Prompt list */}
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

          {!isLoading &&
            prompts.map((prompt) => (
              <CatalogItem key={prompt.id} prompt={prompt} isMine={showMyPrompts} />
            ))}
        </div>

        {/* Pagination */}
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

      <CreateCatalogPromptDialog isOpen={isCreateOpen} setIsOpen={setIsCreateOpen} />
    </div>
  );
}
