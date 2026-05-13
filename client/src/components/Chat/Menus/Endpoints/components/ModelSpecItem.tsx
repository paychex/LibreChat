import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { VisuallyHidden } from '@ariakit/react';
import type { TModelSpec } from 'librechat-data-provider';
import { CustomMenuItem as MenuItem } from '../CustomMenu';
import { useModelSelectorContext } from '../ModelSelectorContext';
import { useLocalize } from '~/hooks';
import SpecIcon from './SpecIcon';
import { cn } from '~/utils';

interface ModelSpecItemProps {
  spec: TModelSpec;
  isSelected: boolean;
}

export function ModelSpecItem({ spec, isSelected }: ModelSpecItemProps) {
  const localize = useLocalize();
  const { handleSelectSpec, endpointsConfig } = useModelSelectorContext();
  const { showIconInMenu = true } = spec;
  return (
    <MenuItem
      key={spec.name}
      onClick={() => handleSelectSpec(spec)}
      aria-selected={isSelected || undefined}
      className={cn(
        'flex w-full cursor-pointer items-center justify-between rounded-lg px-2 text-sm',
      )}
    >
      <div
        className={cn(
          'flex w-full min-w-0 gap-2 px-1 py-1',
          spec.description ? 'items-start' : 'items-center',
        )}
      >
        {showIconInMenu && (
          <div className="flex-shrink-0">
            <SpecIcon currentSpec={spec} endpointsConfig={endpointsConfig} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-1.5 text-left">
            <span className="truncate">{spec.label}</span>
            {spec.default === true && (
              <span
                className="inline-flex items-center gap-0.5 rounded border border-yellow-500/60 bg-yellow-400/10 px-1 py-0.5 text-[10px] font-semibold leading-none text-yellow-600 dark:border-yellow-400/50 dark:text-yellow-400"
                aria-label={localize('com_ui_default_model_aria')}
                title={localize('com_ui_default_model_aria')}
              >
                ★ {localize('com_ui_default_model')}
              </span>
            )}
          </span>
          {spec.description && (
            <span className="break-words text-xs font-normal">{spec.description}</span>
          )}
        </div>
      </div>
      {isSelected && (
        <>
          <CheckCircle2
            className="size-4 shrink-0 self-center text-text-primary"
            aria-hidden="true"
          />
          <VisuallyHidden>{localize('com_a11y_selected')}</VisuallyHidden>
        </>
      )}
    </MenuItem>
  );
}
