import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import isEqual from 'lodash/isEqual';
import { useRecoilState } from 'recoil';
import { Constants, LocalStorageKeys } from 'librechat-data-provider';
import { ephemeralAgentByConvoId, mcpValuesAtomFamily, mcpPinnedAtom } from '~/store';
import { useGetStartupConfig } from '~/data-provider';
import { setTimestamp } from '~/utils/timestamps';

export function useMCPSelect({ conversationId }: { conversationId?: string | null }) {
  const key = conversationId ?? Constants.NEW_CONVO;
  const { data: startupConfig } = useGetStartupConfig();

  const [isPinned, setIsPinned] = useAtom(mcpPinnedAtom);
  const [mcpValues, setMCPValuesRaw] = useAtom(mcpValuesAtomFamily(key));
  const [ephemeralAgent, setEphemeralAgent] = useRecoilState(ephemeralAgentByConvoId(key));

  // Sync Jotai state with ephemeral agent state
  useEffect(() => {
    if (ephemeralAgent?.mcp && ephemeralAgent.mcp.length > 0) {
      setMCPValuesRaw(ephemeralAgent.mcp);
    }
  }, [ephemeralAgent?.mcp, setMCPValuesRaw]);

  useEffect(() => {
    setEphemeralAgent((prev) => {
      if (!isEqual(prev?.mcp, mcpValues)) {
        return { ...(prev ?? {}), mcp: mcpValues };
      }
      return prev;
    });
  }, [mcpValues, setEphemeralAgent]);

  useEffect(() => {
    const mcpStorageKey = `${LocalStorageKeys.LAST_MCP_}${key}`;
    if (mcpValues.length > 0) {
      setTimestamp(mcpStorageKey);
    }
  }, [mcpValues, key]);

  // Auto-select MCP servers configured with startup: true for new conversations
  useEffect(() => {
    if (mcpValues.length > 0) return; // Already has selections
    if (!startupConfig?.mcpServers) return; // No MCP servers configured

    // Auto-select for "new" conversations OR for conversations that have never had MCP configured
    const shouldAutoSelect = key === Constants.NEW_CONVO || ephemeralAgent?.mcp?.length === 0;
    if (!shouldAutoSelect) return;

    // Get servers configured with startup: true (chatMenu setting only affects UI visibility, not auto-selection)
    const startupServers = Object.entries(startupConfig.mcpServers)
      .filter(([, config]) => config.startup === true)
      .map(([serverName]) => serverName);

    if (startupServers.length > 0) {
      setMCPValuesRaw(startupServers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, startupConfig?.mcpServers, setMCPValuesRaw, ephemeralAgent?.mcp?.length]);

  /** Stable memoized setter */
  const setMCPValues = useCallback(
    (value: string[]) => {
      if (!Array.isArray(value)) {
        return;
      }
      setMCPValuesRaw(value);
    },
    [setMCPValuesRaw],
  );

  return {
    isPinned,
    mcpValues,
    setIsPinned,
    setMCPValues,
  };
}
