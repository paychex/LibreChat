import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  OGDialog,
  OGDialogContent,
  Input,
  Label,
  Button,
  Switch,
  TextareaAutosize,
  useToastContext,
} from '@librechat/client';
import { useCreatePromptCatalogPrompt, useGetPromptCatalogCategories } from '~/data-provider';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

interface CreateCatalogPromptDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AI_TOOL_OPTIONS = ['LibreChat', 'Copilot', 'Guru', 'Other'];

export default function CreateCatalogPromptDialog({
  isOpen,
  setIsOpen,
}: CreateCatalogPromptDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { user } = useAuthContext();
  const { data: categories = [] } = useGetPromptCatalogCategories();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [aiTool, setAiTool] = useState('LibreChat');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setCategory('');
    setAiTool('LibreChat');
    setTags('');
    setIsPublic(true);
  }, []);

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

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!title.trim() || !content.trim() || createMutation.isLoading) {
        return;
      }
      const parsedTags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      createMutation.mutate({
        title: title.trim(),
        content: content.trim(),
        category: category || undefined,
        ai_tool: aiTool.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        is_public: isPublic,
        userEmail: user?.email,
        userName: user?.name ?? user?.username,
      });
    },
    [title, content, category, aiTool, tags, isPublic, user, createMutation],
  );

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <OGDialog open={isOpen} onOpenChange={setIsOpen}>
      <OGDialogContent className="w-11/12 max-w-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-1 sm:p-2">
          <h2 className="text-lg font-bold text-text-primary">
            {localize('com_ui_prompt_catalog_create_title')}
          </h2>

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
            <TextareaAutosize
              id="catalog-prompt-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              minRows={4}
              maxRows={12}
              className="w-full resize-none rounded-md border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
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

          <div className="flex items-start justify-between gap-4 rounded-md border border-border-medium bg-surface-secondary px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="catalog-prompt-public"
                className="text-sm font-medium text-text-primary"
              >
                {isPublic
                  ? localize('com_ui_prompt_catalog_field_public')
                  : localize('com_ui_prompt_catalog_field_personal')}
              </Label>
              <span className="text-xs text-text-secondary">
                {isPublic
                  ? localize('com_ui_prompt_catalog_public_hint')
                  : localize('com_ui_prompt_catalog_personal_hint')}
              </span>
            </div>
            <Switch
              id="catalog-prompt-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="mt-0.5"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={createMutation.isLoading}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || createMutation.isLoading}>
              <span
                className={cn('flex items-center gap-2', createMutation.isLoading && 'opacity-80')}
              >
                {createMutation.isLoading && <Loader2 className="size-4 animate-spin" />}
                {createMutation.isLoading ? localize('com_ui_saving') : localize('com_ui_create')}
              </span>
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
