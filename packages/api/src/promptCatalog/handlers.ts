import { logger } from '@librechat/data-schemas';
import type { Request, Response } from 'express';

type PromptCatalogFetch = typeof fetch;

type PromptCatalogResponse = {
  id?: number;
  title?: string;
  content?: string;
  prompt?: string;
  error?: string;
  version?: number;
};

type PromptCatalogResolveInsertRequest = Request<
  unknown,
  unknown,
  {
    promptCatalogId?: number | string;
  }
> & {
  user?: {
    email?: string;
    name?: string;
    username?: string;
  };
};

export interface PromptCatalogResolveInsertDependencies {
  getPromptCatalogApiUrl: () => string | undefined;
  fetchImpl?: PromptCatalogFetch;
  timeoutMs?: number;
}

function buildPromptCatalogHeaders(
  user?: PromptCatalogResolveInsertRequest['user'],
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (user?.email) {
    headers['x-forwarded-user-email'] = user.email;
  }

  const forwardedName = user?.name || user?.username || user?.email;
  if (forwardedName) {
    headers['x-forwarded-user-name'] = forwardedName;
  }

  return headers;
}

function buildPromptCatalogPromptUrl(promptCatalogApiUrl: string, promptId: number): string {
  const normalizedApiUrl = promptCatalogApiUrl.endsWith('/')
    ? promptCatalogApiUrl
    : `${promptCatalogApiUrl}/`;

  return new URL(`/api/prompts/${promptId}`, normalizedApiUrl).toString();
}

async function parsePromptCatalogResponse(
  response: Awaited<ReturnType<PromptCatalogFetch>>,
): Promise<PromptCatalogResponse | null> {
  try {
    return (await response.json()) as PromptCatalogResponse;
  } catch {
    return null;
  }
}

function getTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(timeoutMs)
    : undefined;
}

export function createPromptHubResolveInsertHandler(deps: PromptCatalogResolveInsertDependencies) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10_000;

  return async function promptHubResolveInsertHandler(
    req: PromptCatalogResolveInsertRequest,
    res: Response,
  ) {
    const promptId = Number.parseInt(String(req.body?.promptCatalogId ?? ''), 10);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return res.status(400).json({ message: 'promptCatalogId is required' });
    }

    const promptCatalogApiUrl = deps.getPromptCatalogApiUrl();
    if (!promptCatalogApiUrl) {
      return res.status(500).json({ message: 'PROMPT_CATALOG_API_URL is not configured' });
    }

    let promptCatalogPromptUrl: string;
    try {
      promptCatalogPromptUrl = buildPromptCatalogPromptUrl(promptCatalogApiUrl, promptId);
    } catch {
      return res.status(500).json({ message: 'Invalid PROMPT_CATALOG_API_URL' });
    }

    try {
      const response = await fetchImpl(promptCatalogPromptUrl, {
        headers: buildPromptCatalogHeaders(req.user),
        signal: getTimeoutSignal(timeoutMs),
      });
      const data = await parsePromptCatalogResponse(response);

      if (!response.ok) {
        return res.status(response.status).json({
          message: data?.error || 'Failed to resolve Prompt Catalog insert',
        });
      }

      const promptText =
        typeof data?.content === 'string'
          ? data.content
          : typeof data?.prompt === 'string'
            ? data.prompt
            : null;

      if (promptText == null) {
        return res
          .status(502)
          .json({ message: 'Prompt Catalog response did not include prompt text' });
      }

      const payload: { promptId: number; content: string; title?: string; version?: number } = {
        promptId: typeof data?.id === 'number' ? data.id : promptId,
        content: promptText,
      };

      if (typeof data?.title === 'string') {
        payload.title = data.title;
      }

      if (typeof data?.version === 'number') {
        payload.version = data.version;
      }

      return res.status(200).json(payload);
    } catch (error) {
      logger.error('[PromptHubResolveInsert] Failed to resolve insert:', error);
      return res.status(502).json({ message: 'Prompt Catalog service unavailable' });
    }
  };
}
