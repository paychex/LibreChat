import AutoSendPrompt from '~/components/Prompts/buttons/AutoSendPrompt';
import CatalogList from './CatalogList';

export default function CatalogPanel() {
  return (
    <div className="h-auto max-w-full px-1 pt-2">
      <div className="mb-2">
        <AutoSendPrompt />
      </div>
      <CatalogList />
    </div>
  );
}
