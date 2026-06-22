import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { TPromptGroup } from 'librechat-data-provider';
import type { PromptOption } from '~/common';
import CategoryIcon from '~/components/Prompts/Groups/CategoryIcon';
import { usePromptGroupsNav, useHasAccess } from '~/hooks';
import { useGetAllPromptGroups, useGetPromptCatalogGroups } from '~/data-provider';
import { mapPromptGroups } from '~/utils';

type AllPromptGroupsData =
  | {
      promptsMap: Record<string, TPromptGroup>;
      promptGroups: PromptOption[];
    }
  | undefined;

type PromptGroupsContextType =
  | (ReturnType<typeof usePromptGroupsNav> & {
      allPromptGroups: {
        data: AllPromptGroupsData;
        isLoading: boolean;
      };
      hasAccess: boolean;
    })
  | null;

const PromptGroupsContext = createContext<PromptGroupsContextType>(null);

const mapGroupsForCommand = (groups: TPromptGroup[]) => {
  const mappedArray: PromptOption[] = groups.map((group) => ({
    id: group._id ?? '',
    type: 'prompt',
    value: group.command ?? group.name,
    label: `${group.command != null && group.command ? `/${group.command} - ` : ''}${group.name}: ${
      (group.oneliner?.length ?? 0) > 0 ? group.oneliner : (group.productionPrompt?.prompt ?? '')
    }`,
    icon: <CategoryIcon category={group.category ?? ''} className="h-5 w-5" />,
  }));

  const promptsMap = mapPromptGroups(groups);

  return {
    promptsMap,
    promptGroups: mappedArray,
  };
};

export const PromptGroupsProvider = ({ children }: { children: ReactNode }) => {
  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.USE,
  });

  const promptGroupsNav = usePromptGroupsNav(hasAccess);
  const { data: allGroupsData, isLoading: isLoadingAll } = useGetAllPromptGroups(undefined, {
    enabled: hasAccess,
    select: mapGroupsForCommand,
  });
  const { data: promptCatalogGroupsData, isLoading: isLoadingPromptCatalog } =
    useGetPromptCatalogGroups(
      { pageSize: 200 },
      {
        enabled: hasAccess,
        select: mapGroupsForCommand,
      },
    );

  const combinedAllGroupsData = useMemo(() => {
    if (!allGroupsData && !promptCatalogGroupsData) {
      return undefined;
    }
    return {
      promptsMap: {
        ...(promptCatalogGroupsData?.promptsMap ?? {}),
        ...(allGroupsData?.promptsMap ?? {}),
      },
      promptGroups: [
        ...(promptCatalogGroupsData?.promptGroups ?? []),
        ...(allGroupsData?.promptGroups ?? []),
      ],
    };
  }, [allGroupsData, promptCatalogGroupsData]);

  const isLoading = isLoadingAll || isLoadingPromptCatalog;

  const contextValue = useMemo(
    () => ({
      ...promptGroupsNav,
      allPromptGroups: {
        data: hasAccess ? combinedAllGroupsData : undefined,
        isLoading: hasAccess ? isLoading : false,
      },
      hasAccess,
    }),
    [promptGroupsNav, combinedAllGroupsData, isLoading, hasAccess],
  );

  return (
    <PromptGroupsContext.Provider value={contextValue}>{children}</PromptGroupsContext.Provider>
  );
};

export const usePromptGroupsContext = () => {
  const context = useContext(PromptGroupsContext);
  if (!context) {
    throw new Error('usePromptGroupsContext must be used within a PromptGroupsProvider');
  }
  return context;
};
