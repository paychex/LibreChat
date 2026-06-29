import { memo } from 'react';
import type { CatalogPrompt } from 'librechat-data-provider';
import useSubmitMessage from '~/hooks/Messages/useSubmitMessage';
import { ListCard } from '~/components/Prompts';

function CatalogItem({ prompt }: { prompt: CatalogPrompt }) {
  const { submitPrompt } = useSubmitMessage();

  const onClick = () => {
    if (!prompt.content.trim()) {
      return;
    }
    submitPrompt(prompt.content);
  };

  return (
    <div className="relative my-2 items-stretch justify-between rounded-xl border border-border-light px-1 shadow-sm transition-all duration-300 ease-in-out hover:bg-surface-tertiary hover:shadow-lg">
      <ListCard
        name={prompt.title}
        category={prompt.category.toLowerCase().replace(/\s+/g, '_')}
        onClick={onClick}
        snippet={prompt.content}
      />
    </div>
  );
}

export default memo(CatalogItem);
