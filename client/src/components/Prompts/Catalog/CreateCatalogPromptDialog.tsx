import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { CatalogPrompt } from 'librechat-data-provider';
import {
  OGDialog,
  OGDialogContent,
  Input,
  Label,
  Button,
  useToastContext,
} from '@librechat/client';
import {
  useCreatePromptCatalogPrompt,
  useUpdatePromptCatalogPrompt,
  useGetPromptCatalogCategories,
} from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface CreateCatalogPromptDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** When provided, the dialog edits this prompt instead of creating a new one. */
  prompt?: CatalogPrompt;
}

const AI_TOOL_OPTIONS = ['LibreChat', 'Copilot', 'Guru', 'Other'];

export default function CreateCatalogPromptDialog({
  isOpen,
  setIsOpen,
  prompt,
}: CreateCatalogPromptDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data: categories = [] } = useGetPromptCatalogCategories();
  const isEditMode = prompt != null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [aiTool, setAiTool] = useState('LibreChat');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setCategory('');
    setAiTool('LibreChat');
    setTags('');
    setIsPublic(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (prompt) {
      setTitle(prompt.title ?? '');
      setContent(prompt.content ?? '');
      setCategory(prompt.category ?? '');
      setAiTool(prompt.ai_tool || 'LibreChat');
      setTags((prompt.tags ?? []).join(', '));
      setIsPublic(false);
    } else {
      resetForm();
    }
  }, [isOpen, prompt, resetForm]);

  const createMutation = useCreatePromptCatalogPrompt({
    onSuccess: () => {
      showToast({ status: 'success', message: localize('com_ui_prompt_catalog_create_success') });
      resetForm();
      setIsOpen(false);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : localize('com_ui_prompt_catalog_create_error');
      showToast({ status: 'error', message });
    },
  });

  const updateMutation = useUpdatePromptCatalogPrompt({
    onSuccess: () => {
      showToast({ status: 'success', message: localize('com_ui_prompt_catalog_update_success') });
      setIsOpen(false);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : localize('com_ui_prompt_catalog_update_error');
      showToast({ status: 'error', message });
    },
  });

  const activeMutation = isEditMode ? updateMutation : createMutation;

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!title.trim() || !content.trim() || activeMutation.isLoading) {
        return;
      }
      const parsedTags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category: category || undefined,
        ai_tool: aiTool.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        is_public: isPublic,
      };
      if (isEditMode && prompt) {
        updateMutation.mutate({ id: prompt.id, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [
      title,
      content,
      category,
      aiTool,
      tags,
      isPublic,
      isEditMode,
      prompt,
      createMutation,
      updateMutation,
      activeMutation,
    ],
  );

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  let submitLabel = localize('com_ui_create');
  if (activeMutation.isLoading) {
    submitLabel = localize('com_ui_saving');
  } else if (isEditMode) {
    submitLabel = localize('com_ui_save');
  }

  return (
    <OGDialog open={isOpen} onOpenChange={setIsOpen}>
      <OGDialogContent className="flex max-h-[85vh] w-11/12 max-w-lg flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col p-1 sm:p-2">
          <h2 className="mb-4 shrink-0 text-lg font-bold text-text-primary">
            {isEditMode
              ? localize('com_ui_prompt_catalog_edit_title')
              : localize('com_ui_prompt_catalog_create_title')}
          </h2>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catalog-prompt-title" className="text-sm text-text-secondary">
                {localize('com_ui_prompt_catalog_field_title')}
              </Label>
              <Input
                id="catalog-prompt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catalog-prompt-content" className="text-sm text-text-secondary">
                {localize('com_ui_prompt_catalog_field_content')}
              </Label>
              <textarea
                id="catalog-prompt-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                aria-label={localize('com_ui_prompt_catalog_field_content')}
                className="max-h-60 min-h-[8rem] w-full resize-y overflow-y-auto rounded-md border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catalog-prompt-category" className="text-sm text-text-secondary">
                {localize('com_ui_prompt_catalog_field_category')}{' '}
                <span className="text-text-tertiary">{localize('com_ui_optional')}</span>
              </Label>
              <select
                id="catalog-prompt-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{localize('com_ui_prompt_catalog_all')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catalog-prompt-ai-tool" className="text-sm text-text-secondary">
                {localize('com_ui_prompt_catalog_field_ai_tool')}
              </Label>
              <select
                id="catalog-prompt-ai-tool"
                value={aiTool}
                onChange={(e) => setAiTool(e.target.value)}
                className="rounded-md border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {AI_TOOL_OPTIONS.map((tool) => (
                  <option key={tool} value={tool}>
                    {tool}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catalog-prompt-tags" className="text-sm text-text-secondary">
                {localize('com_ui_prompt_catalog_field_tags')}{' '}
                <span className="text-text-tertiary">{localize('com_ui_optional')}</span>
              </Label>
              <Input
                id="catalog-prompt-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <fieldset className="flex flex-col gap-2 rounded-md border border-border-medium bg-surface-secondary px-3 py-2.5">
              <legend className="px-1 text-sm font-medium text-text-primary">
                {localize('com_ui_prompt_catalog_field_visibility')}
              </legend>
              <span className="text-xs text-text-secondary">
                {localize('com_ui_prompt_catalog_visibility_hint')}
              </span>
              <div className="mt-1 flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                  <input
                    type="radio"
                    name="catalog-prompt-visibility"
                    value="private"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="size-4 accent-green-600"
                  />
                  {localize('com_ui_prompt_catalog_private')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                  <input
                    type="radio"
                    name="catalog-prompt-visibility"
                    value="public"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="size-4 accent-green-600"
                  />
                  {localize('com_ui_prompt_catalog_public')}
                </label>
              </div>
            </fieldset>
          </div>

          <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-border-light pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={activeMutation.isLoading}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || activeMutation.isLoading}>
              <span
                className={cn('flex items-center gap-2', activeMutation.isLoading && 'opacity-80')}
              >
                {activeMutation.isLoading && <Loader2 className="size-4 animate-spin" />}
                {submitLabel}
              </span>
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
