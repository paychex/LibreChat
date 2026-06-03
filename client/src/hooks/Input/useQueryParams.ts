import { useEffect, useCallback, useRef } from 'react';
import { useToastContext } from '@librechat/client';
import { useRecoilValue } from 'recoil';
import { useSearchParams } from 'react-router-dom';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, EModelEndpoint, PermissionBits } from 'librechat-data-provider';
import type {
  AgentListResponse,
  TEndpointsConfig,
  TStartupConfig,
  TPreset,
} from 'librechat-data-provider';
import {
  clearModelForNonEphemeralAgent,
  removeUnavailableTools,
  specDisplayFieldReset,
  processValidSettings,
  getModelSpecIconURL,
  getConvoSwitchLogic,
  logger,
} from '~/utils';
import {
  useAuthContext,
  useAgentsMap,
  useDefaultConvo,
  useSubmitMessage,
  useLocalize,
} from '~/hooks';
import { useChatContext, useChatFormContext } from '~/Providers';
import { NotificationSeverity } from '~/common';
import { useGetAgentByIdQuery } from '~/data-provider';
import store from '~/store';

const PROMPT_CATALOG_ID_QUERY_PARAM = 'promptCatalogId';
const LEGACY_PROMPT_CATALOG_ID_QUERY_PARAM = 'prompt_catalog_id';

async function resolvePromptCatalogInsert(promptCatalogId: string, token: string): Promise<string> {
  const response = await fetch('/api/prompthub/resolve-insert', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ promptCatalogId }),
  });

  let data: { prompt?: string; content?: string; message?: string } | null = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to resolve Prompt Catalog insert');
  }

  const promptText =
    typeof data?.content === 'string'
      ? data.content
      : typeof data?.prompt === 'string'
        ? data.prompt
        : null;

  if (promptText == null) {
    throw new Error('PromptHub resolve response did not include prompt text');
  }

  return promptText;
}

const injectAgentIntoAgentsMap = (queryClient: QueryClient, agent: any) => {
  const editCacheKey = [QueryKeys.agents, { requiredPermission: PermissionBits.EDIT }];
  const editCache = queryClient.getQueryData<AgentListResponse>(editCacheKey);

  if (editCache?.data && !editCache.data.some((cachedAgent) => cachedAgent.id === agent.id)) {
    // Inject agent into EDIT cache so dropdown can display it
    const updatedCache = {
      ...editCache,
      data: [agent, ...editCache.data],
    };
    queryClient.setQueryData(editCacheKey, updatedCache);
    logger.log('agent', 'Injected URL agent into cache:', agent);
  }
};

/**
 * Hook that processes URL query parameters to initialize chat with specified settings and prompt.
 * Handles model switching, prompt auto-filling, and optional auto-submission with race condition protection.
 * Supports immediate or deferred submission based on whether settings need to be applied first.
 */
export default function useQueryParams({
  textAreaRef,
}: {
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const maxAttempts = 50;
  const attemptsRef = useRef(0);
  const MAX_SETTINGS_WAIT_MS = 3000;
  const processedRef = useRef(false);
  const pendingSubmitRef = useRef(false);
  const settingsAppliedRef = useRef(false);
  const submissionHandledRef = useRef(false);
  const promptTextRef = useRef<string | null>(null);
  const promptCatalogTextRef = useRef<string | null>(null);
  const promptCatalogFetchStartedRef = useRef(false);
  const promptCatalogFailedRef = useRef(false);
  const validSettingsRef = useRef<TPreset | null>(null);
  const settingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const methods = useChatFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const getDefaultConversation = useDefaultConvo();
  const modularChat = useRecoilValue(store.modularChat);
  const availableTools = useRecoilValue(store.availableTools);
  const { submitMessage } = useSubmitMessage();
  const { token, isAuthenticated } = useAuthContext();
  const { showToast } = useToastContext();
  const localize = useLocalize();

  const queryClient = useQueryClient();
  const { conversation, newConversation } = useChatContext();

  const urlAgentId = searchParams.get('agent_id') || '';
  const { data: urlAgent } = useGetAgentByIdQuery(urlAgentId);

  /**
   * Applies settings from URL query parameters to create a new conversation.
   * Handles model spec lookup, endpoint normalization, and conversation switching logic.
   * Ensures tools compatibility and preserves existing conversation when appropriate.
   */
  const newQueryConvo = useCallback(
    (_newPreset?: TPreset) => {
      if (!_newPreset) {
        return;
      }
      let newPreset = removeUnavailableTools(_newPreset, availableTools);
      if (newPreset.spec != null && newPreset.spec !== '') {
        const startupConfig = queryClient.getQueryData<TStartupConfig>([QueryKeys.startupConfig]);
        const modelSpecs = startupConfig?.modelSpecs?.list ?? [];
        const spec = modelSpecs.find((s) => s.name === newPreset.spec);
        if (!spec) {
          return;
        }
        const { preset } = spec;
        preset.iconURL = getModelSpecIconURL(spec);
        preset.spec = spec.name;
        newPreset = preset;
      }

      let newEndpoint = newPreset.endpoint ?? '';
      const endpointsConfig = queryClient.getQueryData<TEndpointsConfig>([QueryKeys.endpoints]);

      if (newEndpoint && endpointsConfig && !endpointsConfig[newEndpoint]) {
        const normalizedNewEndpoint = newEndpoint.toLowerCase();
        for (const [key, value] of Object.entries(endpointsConfig)) {
          if (
            value &&
            value.type === EModelEndpoint.custom &&
            key.toLowerCase() === normalizedNewEndpoint
          ) {
            newEndpoint = key;
            newPreset.endpoint = key;
            newPreset.endpointType = EModelEndpoint.custom;
            break;
          }
        }
      }

      const {
        template,
        shouldSwitch,
        isNewModular,
        newEndpointType,
        isCurrentModular,
        isExistingConversation,
      } = getConvoSwitchLogic({
        newEndpoint,
        modularChat,
        conversation,
        endpointsConfig,
      });

      const resetFields = newPreset.spec == null ? specDisplayFieldReset : {};
      if (newPreset.spec == null) {
        Object.assign(template, specDisplayFieldReset);
        newPreset = { ...newPreset, ...specDisplayFieldReset };
      }

      // Sync agent_id from newPreset to template, then clear model if non-ephemeral agent
      if (newPreset.agent_id) {
        template.agent_id = newPreset.agent_id;
      }
      clearModelForNonEphemeralAgent(template);

      const isModular = isCurrentModular && isNewModular && shouldSwitch;
      if (isExistingConversation && isModular) {
        template.endpointType = newEndpointType as EModelEndpoint | undefined;

        const currentConvo = getDefaultConversation({
          /* target endpointType is necessary to avoid endpoint mixing */
          conversation: {
            ...(conversation ?? {}),
            endpointType: template.endpointType,
            ...resetFields,
          },
          preset: template,
          cleanOutput: newPreset.spec != null && newPreset.spec !== '',
        });

        /* We don't reset the latest message, only when changing settings mid-converstion */
        logger.log('conversation', 'Switching conversation from query params', currentConvo);
        newConversation({
          template: currentConvo,
          preset: newPreset,
          keepLatestMessage: true,
          keepAddedConvos: true,
        });
        return;
      }

      newConversation({ preset: newPreset, keepAddedConvos: true });
    },
    [
      queryClient,
      modularChat,
      conversation,
      availableTools,
      newConversation,
      getDefaultConversation,
    ],
  );

  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  const areSettingsApplied = useCallback(() => {
    const convo = conversationRef.current;
    if (!validSettingsRef.current || !convo) {
      return false;
    }

    for (const [key, value] of Object.entries(validSettingsRef.current)) {
      if (['presetOverride', 'iconURL', 'spec', 'modelLabel'].includes(key)) {
        continue;
      }

      if (convo[key] !== value) {
        return false;
      }
    }

    return true;
  }, []);

  /**
   * Processes message submission exactly once, preventing duplicate submissions.
   * Sets the prompt text, submits the message, and cleans up URL parameters afterward.
   * Has internal guards to ensure it only executes once regardless of how many times it's called.
   */
  const processSubmission = useCallback(() => {
    if (submissionHandledRef.current || !pendingSubmitRef.current || !promptTextRef.current) {
      return;
    }

    submissionHandledRef.current = true;
    pendingSubmitRef.current = false;

    methods.setValue('text', promptTextRef.current, { shouldValidate: true });

    methods.handleSubmit((data) => {
      if (data.text?.trim()) {
        submitMessage(data);
        logger.log('conversation', 'Message submitted from query params');
      }
    })();

    setSearchParams(new URLSearchParams(), { replace: true });
  }, [methods, submitMessage, setSearchParams]);

  useEffect(() => {
    const processQueryParams = () => {
      const queryParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      const promptCatalogId =
        queryParams[PROMPT_CATALOG_ID_QUERY_PARAM] ||
        queryParams[LEGACY_PROMPT_CATALOG_ID_QUERY_PARAM] ||
        '';
      // Support both 'prompt' and 'q' as query parameters, with 'prompt' taking precedence
      const decodedPrompt = promptCatalogId
        ? promptCatalogTextRef.current || ''
        : queryParams.prompt || queryParams.q || '';
      const shouldAutoSubmit = queryParams.submit?.toLowerCase() === 'true';
      delete queryParams[PROMPT_CATALOG_ID_QUERY_PARAM];
      delete queryParams[LEGACY_PROMPT_CATALOG_ID_QUERY_PARAM];
      delete queryParams.prompt;
      delete queryParams.q;
      delete queryParams.submit;
      const validSettings = processValidSettings(queryParams);

      return { decodedPrompt, promptCatalogId, validSettings, shouldAutoSubmit };
    };

    const handlePromptCatalogFailure = (reason: string) => {
      processedRef.current = true;
      logger.warn('conversation', reason);
      showToast({
        message: localize('com_ui_prompt_catalog_insert_error'),
        severity: NotificationSeverity.ERROR,
      });
      setSearchParams(new URLSearchParams(), { replace: true });
    };

    const intervalId = setInterval(() => {
      const { decodedPrompt, promptCatalogId, validSettings, shouldAutoSubmit } =
        processQueryParams();

      if (processedRef.current || attemptsRef.current >= maxAttempts) {
        clearInterval(intervalId);
        if (attemptsRef.current >= maxAttempts) {
          console.warn('Max attempts reached, failed to process parameters');
          if (promptCatalogId && promptCatalogTextRef.current == null) {
            handlePromptCatalogFailure(
              'PromptHub insert timed out before Prompt Catalog prompt could be resolved',
            );
          }
        }
        return;
      }

      attemptsRef.current += 1;

      if (!textAreaRef.current) {
        return;
      }
      const startupConfig = queryClient.getQueryData<TStartupConfig>([QueryKeys.startupConfig]);
      if (!startupConfig) {
        return;
      }
      const hasSettings = Object.keys(validSettings).length > 0;

      if (promptCatalogId && promptCatalogTextRef.current == null) {
        if (!isAuthenticated || token == null || token === '') {
          return;
        }

        attemptsRef.current = Math.max(0, attemptsRef.current - 1);

        if (!promptCatalogFetchStartedRef.current) {
          promptCatalogFetchStartedRef.current = true;
          void resolvePromptCatalogInsert(promptCatalogId, token)
            .then((prompt) => {
              promptCatalogTextRef.current = prompt;
            })
            .catch((error) => {
              promptCatalogFailedRef.current = true;
              logger.error('Failed to resolve PromptHub insert:', error);
            });
        }

        if (promptCatalogFailedRef.current) {
          clearInterval(intervalId);
          handlePromptCatalogFailure('PromptHub insert failed to resolve');
        }
        return;
      }

      if (!shouldAutoSubmit) {
        submissionHandledRef.current = true;
      }

      /** Mark processing as complete and clean up as needed */
      const success = () => {
        processedRef.current = true;
        logger.log('conversation', 'Query parameters processed successfully');
        clearInterval(intervalId);

        // Defer URL cleanup until after submission completes (processSubmission handles it)
        if (!pendingSubmitRef.current) {
          setSearchParams(new URLSearchParams(), { replace: true });
        }
      };

      if (hasSettings) {
        validSettingsRef.current = validSettings;
      }

      if (decodedPrompt) {
        promptTextRef.current = decodedPrompt;
      }

      // Handle auto-submission
      if (shouldAutoSubmit && decodedPrompt) {
        if (hasSettings) {
          // Settings are changing, defer submission
          pendingSubmitRef.current = true;

          // Set a timeout to handle the case where settings might never fully apply
          settingsTimeoutRef.current = setTimeout(() => {
            if (!submissionHandledRef.current && pendingSubmitRef.current) {
              logger.log(
                'conversation',
                'Settings application timeout, proceeding with submission',
              );
              processSubmission();
            }
          }, MAX_SETTINGS_WAIT_MS);
        } else {
          methods.setValue('text', decodedPrompt, { shouldValidate: true });
          textAreaRef.current.focus();
          textAreaRef.current.setSelectionRange(decodedPrompt.length, decodedPrompt.length);

          methods.handleSubmit((data) => {
            if (data.text?.trim()) {
              submitMessage(data);
            }
          })();
        }
      } else if (decodedPrompt) {
        methods.setValue('text', decodedPrompt, { shouldValidate: true });
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(decodedPrompt.length, decodedPrompt.length);
      } else {
        submissionHandledRef.current = true;
      }

      if (hasSettings && !areSettingsApplied()) {
        newQueryConvo(validSettings);
      }

      success();
    }, 100);

    return () => {
      clearInterval(intervalId);
      if (settingsTimeoutRef.current) {
        clearTimeout(settingsTimeoutRef.current);
      }
    };
  }, [
    searchParams,
    methods,
    textAreaRef,
    newQueryConvo,
    newConversation,
    submitMessage,
    setSearchParams,
    queryClient,
    processSubmission,
    areSettingsApplied,
    isAuthenticated,
    token,
    showToast,
    localize,
  ]);

  useEffect(() => {
    // Only proceed if we've already processed URL parameters but haven't yet handled submission
    if (
      !processedRef.current ||
      submissionHandledRef.current ||
      settingsAppliedRef.current ||
      !validSettingsRef.current ||
      !conversation
    ) {
      return;
    }

    if (areSettingsApplied()) {
      settingsAppliedRef.current = true;

      if (pendingSubmitRef.current) {
        if (settingsTimeoutRef.current) {
          clearTimeout(settingsTimeoutRef.current);
          settingsTimeoutRef.current = null;
        }

        logger.log('conversation', 'Settings fully applied, processing submission');
        processSubmission();
      }
    }
  }, [conversation, processSubmission, areSettingsApplied]);

  const agentsMap = useAgentsMap({ isAuthenticated });
  useEffect(() => {
    if (urlAgent) {
      injectAgentIntoAgentsMap(queryClient, urlAgent);
    }
  }, [urlAgent, queryClient, agentsMap]);
}
