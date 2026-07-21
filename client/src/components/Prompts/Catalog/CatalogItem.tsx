import { memo, useMemo, useState } from 'react';
import { Menu as MenuIcon, TextSearch, Edit as EditIcon, Trash2 } from 'lucide-react';
import {
  OGDialog,
  OGDialogTemplate,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Button,
  TextareaAutosize,
  useToastContext,
} from '@librechat/client';
import type { CatalogPrompt } from 'librechat-data-provider';
import useSubmitMessage from '~/hooks/Messages/useSubmitMessage';
import { useLocalize, useAuthContext } from '~/hooks';
import { useDeletePromptCatalogPrompt } from '~/data-provider';
import { ListCard } from '~/components/Prompts';
import CreateCatalogPromptDialog from './CreateCatalogPromptDialog';

function CatalogItem({ prompt, isMine = false }: { prompt: CatalogPrompt; isMine?: boolean }) {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { showToast } = useToastContext();
  const { submitPrompt } = useSubmitMessage();

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewContent, setViewContent] = useState('');

  const isOwner = useMemo(() => {
    // In "My Prompts" mode the API already filters to the current user's prompts
    // via identity headers, so every returned prompt is owned by the user even
    // when creator_name doesn't string-match the local profile fields.
    if (isMine) {
      return true;
    }
    const creator = prompt.creator_name?.trim().toLowerCase();
    if (!user || !creator) {
      return false;
    }
    const candidates = [user.name, user.username, user.email]
      .filter(Boolean)
      .map((value) => (value as string).trim().toLowerCase());
    return candidates.includes(creator);
  }, [isMine, user, prompt.creator_name]);

  const deleteMutation = useDeletePromptCatalogPrompt({
    onSuccess: () => {
      showToast({ status: 'success', message: localize('com_ui_prompt_catalog_delete_success') });
      setIsDeleteOpen(false);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : localize('com_ui_prompt_catalog_delete_error');
      showToast({ status: 'error', message });
    },
  });

  const onClick = () => {
    if (!prompt.content.trim()) {
      return;
    }
    submitPrompt(prompt.content);
  };

  return (
    <>
      <div className="relative my-2 items-stretch justify-between rounded-xl border border-border-light px-1 shadow-sm transition-all duration-300 ease-in-out hover:bg-surface-tertiary hover:shadow-lg">
        <ListCard
          name={prompt.title}
          category={prompt.category.toLowerCase().replace(/\s+/g, '_')}
          onClick={onClick}
          snippet={prompt.content}
        >
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={localize('com_ui_prompt_catalog_actions')}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                className="z-50 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-medium bg-transparent p-0 text-sm font-medium transition-all duration-300 ease-in-out hover:border-border-heavy hover:bg-surface-hover focus:border-border-heavy focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <MenuIcon className="icon-md text-text-secondary" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              aria-label={localize('com_ui_prompt_catalog_actions')}
              className="z-50 w-fit rounded-xl"
              collisionPadding={2}
              align="start"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setViewContent(prompt.content);
                  setIsViewOpen(true);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full cursor-pointer rounded-lg text-text-primary hover:bg-surface-hover focus:bg-surface-hover"
              >
                <TextSearch className="mr-2 h-4 w-4 text-text-primary" aria-hidden="true" />
                <span>{localize('com_ui_prompt_catalog_view')}</span>
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditOpen(true);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full cursor-pointer rounded-lg text-text-primary hover:bg-surface-hover focus:bg-surface-hover"
                  >
                    <EditIcon className="mr-2 h-4 w-4 text-text-primary" aria-hidden="true" />
                    <span>{localize('com_ui_edit')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteOpen(true);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full cursor-pointer rounded-lg text-red-600 hover:bg-surface-hover focus:bg-surface-hover"
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-red-600" aria-hidden="true" />
                    <span>{localize('com_ui_delete')}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </ListCard>
      </div>

      {/* View dialog */}
      <OGDialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <OGDialogTemplate
          title={prompt.title}
          className="max-w-lg"
          showCancelButton={false}
          main={
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-secondary">
                  {localize('com_ui_prompt_catalog_field_content')}
                </span>
                <TextareaAutosize
                  value={viewContent}
                  onChange={(e) => setViewContent(e.target.value)}
                  minRows={4}
                  maxRows={16}
                  aria-label={localize('com_ui_prompt_catalog_field_content')}
                  className="w-full resize-none rounded-md border border-border-medium bg-surface-secondary p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {(prompt.category || prompt.ai_tool || prompt.tags?.length > 0) && (
                <div className="flex flex-col gap-2 rounded-md border border-border-light bg-surface-secondary px-3 py-2.5">
                  {prompt.category && (
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs font-medium text-text-secondary">
                        {localize('com_ui_prompt_catalog_field_category')}
                      </span>
                      <span className="rounded-full border border-border-light bg-surface-primary px-2 py-0.5 text-xs text-text-secondary">
                        {prompt.category}
                      </span>
                    </div>
                  )}
                  {prompt.ai_tool && (
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs font-medium text-text-secondary">
                        {localize('com_ui_prompt_catalog_field_ai_tool')}
                      </span>
                      <span className="rounded-full border border-border-light bg-surface-primary px-2 py-0.5 text-xs text-text-secondary">
                        {prompt.ai_tool}
                      </span>
                    </div>
                  )}
                  {prompt.tags?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-20 shrink-0 text-xs font-medium text-text-secondary">
                        {localize('com_ui_prompt_catalog_tags')}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {prompt.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border-light bg-surface-primary px-2 py-0.5 text-xs text-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          buttons={
            <Button
              disabled={!viewContent.trim()}
              onClick={() => {
                if (!viewContent.trim()) {
                  return;
                }
                submitPrompt(viewContent);
                setIsViewOpen(false);
              }}
            >
              {localize('com_ui_prompt_catalog_use')}
            </Button>
          }
        />
      </OGDialog>

      {/* Edit dialog (owner only) */}
      {isOwner && (
        <CreateCatalogPromptDialog isOpen={isEditOpen} setIsOpen={setIsEditOpen} prompt={prompt} />
      )}

      {/* Delete confirmation (owner only) */}
      {isOwner && (
        <OGDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <OGDialogTemplate
            title={localize('com_ui_delete')}
            className="max-w-[450px]"
            main={
              <div className="text-sm text-text-primary">
                {localize('com_ui_delete_confirm')}{' '}
                <span className="font-semibold">{prompt.title}</span>
              </div>
            }
            selection={{
              selectHandler: () =>
                deleteMutation.mutate({
                  id: prompt.id,
                  userEmail: user?.email,
                  userName: user?.name ?? user?.username,
                }),
              selectClasses: 'bg-red-600 hover:bg-red-700 text-white',
              selectText: localize('com_ui_delete'),
              isLoading: deleteMutation.isLoading,
            }}
          />
        </OGDialog>
      )}
    </>
  );
}

export default memo(CatalogItem);
