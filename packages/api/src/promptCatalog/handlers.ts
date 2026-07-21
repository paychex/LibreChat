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

export type PromptCatalogUser = {
  email?: string;
  name?: string;
  username?: string;
};

type PromptCatalogResolveInsertRequest = Request<
  unknown,
  unknown,
  {
    promptCatalogId?: number | string;
  }
> & {
  user?: PromptCatalogUser;
};

export interface PromptCatalogResolveInsertDependencies {
  getPromptCatalogApiUrl: () => string | undefined;
  fetchImpl?: PromptCatalogFetch;
  timeoutMs?: number;
}

function buildPromptCatalogHeaders(user?: PromptCatalogUser): Record<string, string> {
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

  return new URL(`api/prompts/${promptId}`, normalizedApiUrl).toString();
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

export function createPromptHubResolveInsertHandler(
  deps: PromptCatalogResolveInsertDependencies,
): (req: PromptCatalogResolveInsertRequest, res: Response) => Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10_000;

  return async function promptHubResolveInsertHandler(
    req: PromptCatalogResolveInsertRequest,
    res: Response,
  ): Promise<Response> {
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
        (typeof data?.content === 'string' ? data.content : null) ??
        (typeof data?.prompt === 'string' ? data.prompt : null);

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

type CatalogPromptListRequest = Request<
  unknown,
  unknown,
  unknown,
  {
    search?: string;
    category?: string;
    tag?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
    showMyPrompts?: string;
  }
> & {
  user?: PromptCatalogUser;
};

export interface PromptHubCatalogListDependencies {
  getPromptCatalogApiUrl: () => string | undefined;
  fetchImpl?: PromptCatalogFetch;
  timeoutMs?: number;
}

function buildCatalogListUrl(
  promptCatalogApiUrl: string,
  query: CatalogPromptListRequest['query'],
): string {
  const normalizedApiUrl = promptCatalogApiUrl.endsWith('/')
    ? promptCatalogApiUrl
    : `${promptCatalogApiUrl}/`;

  const url = new URL('api/prompts', normalizedApiUrl);

  if (query.search) {
    url.searchParams.set('search', query.search);
  }
  if (query.category) {
    url.searchParams.set('category', query.category);
  }
  if (query.tag) {
    url.searchParams.set('tag', query.tag);
  }
  if (query.page) {
    url.searchParams.set('page', query.page);
  }
  if (query.pageSize) {
    url.searchParams.set('pageSize', query.pageSize);
  }
  if (query.sortBy) {
    url.searchParams.set('sortBy', query.sortBy);
  }
  if (query.sortOrder) {
    url.searchParams.set('sortOrder', query.sortOrder);
  }
  if (query.showMyPrompts) {
    url.searchParams.set('showMyPrompts', query.showMyPrompts);
  }

  return url.toString();
}

export function createPromptHubCatalogListHandler(
  deps: PromptHubCatalogListDependencies,
): (req: CatalogPromptListRequest, res: Response) => Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10_000;

  return async function promptHubCatalogListHandler(
    req: CatalogPromptListRequest,
    res: Response,
  ): Promise<Response> {
    const promptCatalogApiUrl = deps.getPromptCatalogApiUrl();
    if (!promptCatalogApiUrl) {
      return res.status(500).json({ message: 'PROMPT_CATALOG_API_URL is not configured' });
    }

    let catalogListUrl: string;
    try {
      catalogListUrl = buildCatalogListUrl(promptCatalogApiUrl, req.query ?? {});
    } catch {
      return res.status(500).json({ message: 'Invalid PROMPT_CATALOG_API_URL' });
    }

    try {
      const response = await fetchImpl(catalogListUrl, {
        headers: buildPromptCatalogHeaders(req.user),
        signal: getTimeoutSignal(timeoutMs),
      });

      if (!response.ok) {
        return res.status(response.status).json({ message: 'Failed to fetch Prompt Catalog' });
      }

      const data = (await response.json()) as unknown;
      return res.status(200).json(data);
    } catch (error) {
      logger.error('[PromptHubCatalogList] Failed to fetch catalog:', error);
      return res.status(502).json({ message: 'Prompt Catalog service unavailable' });
    }
  };
}

type CatalogPromptSimpleRequest = Request & {
  user?: PromptCatalogUser;
};

export interface PromptHubCatalogReadDependencies {
  getPromptCatalogApiUrl: () => string | undefined;
  fetchImpl?: PromptCatalogFetch;
  timeoutMs?: number;
}

function createCatalogPassthroughGetHandler(
  deps: PromptHubCatalogReadDependencies,
  path: string,
  logTag: string,
): (req: CatalogPromptSimpleRequest, res: Response) => Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10_000;

  return async function catalogPassthroughGetHandler(
    req: CatalogPromptSimpleRequest,
    res: Response,
  ): Promise<Response> {
    const promptCatalogApiUrl = deps.getPromptCatalogApiUrl();
    if (!promptCatalogApiUrl) {
      return res.status(500).json({ message: 'PROMPT_CATALOG_API_URL is not configured' });
    }

    const normalizedApiUrl = promptCatalogApiUrl.endsWith('/')
      ? promptCatalogApiUrl
      : `${promptCatalogApiUrl}/`;

    let requestUrl: string;
    try {
      requestUrl = new URL(path, normalizedApiUrl).toString();
    } catch {
      return res.status(500).json({ message: 'Invalid PROMPT_CATALOG_API_URL' });
    }

    try {
      const response = await fetchImpl(requestUrl, {
        headers: buildPromptCatalogHeaders(req.user),
        signal: getTimeoutSignal(timeoutMs),
      });

      if (!response.ok) {
        return res.status(response.status).json({ message: 'Failed to fetch Prompt Catalog' });
      }

      const data = (await response.json()) as unknown;
      return res.status(200).json(data);
    } catch (error) {
      logger.error(`[${logTag}] Failed to fetch catalog:`, error);
      return res.status(502).json({ message: 'Prompt Catalog service unavailable' });
    }
  };
}

export function createPromptHubCatalogCategoriesHandler(
  deps: PromptHubCatalogReadDependencies,
): (req: CatalogPromptSimpleRequest, res: Response) => Promise<Response> {
  return createCatalogPassthroughGetHandler(
    deps,
    'api/prompts/categories',
    'PromptHubCatalogCategories',
  );
}

export function createPromptHubCatalogTagsHandler(
  deps: PromptHubCatalogReadDependencies,
): (req: CatalogPromptSimpleRequest, res: Response) => Promise<Response> {
  return createCatalogPassthroughGetHandler(deps, 'api/prompts/tags', 'PromptHubCatalogTags');
}

export type CatalogPromptMutationBody = {
  title?: string;
  content?: string;
  category?: string;
  ai_tool?: string;
  impact?: string;
  department?: string;
  is_public?: boolean;
  tags?: string[];
};

type CatalogPromptCreateRequest = Request<unknown, unknown, CatalogPromptMutationBody> & {
  user?: PromptCatalogUser;
};

type CatalogPromptUpdateRequest = Request<{ id: string }, unknown, CatalogPromptMutationBody> & {
  user?: PromptCatalogUser;
};

type CatalogPromptDeleteRequest = Request<{ id: string }> & {
  user?: PromptCatalogUser;
};

export interface PromptHubCatalogMutationDependencies {
  getPromptCatalogApiUrl: () => string | undefined;
  fetchImpl?: PromptCatalogFetch;
  timeoutMs?: number;
}

export function createPromptHubCatalogCreateHandler(
  deps: PromptHubCatalogMutationDependencies,
): (req: CatalogPromptCreateRequest, res: Response) => Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10_000;

  return async function promptHubCatalogCreateHandler(
    req: CatalogPromptCreateRequest,
    res: Response,
  ): Promise<Response> {
    const promptCatalogApiUrl = deps.getPromptCatalogApiUrl();
    if (!promptCatalogApiUrl) {
      return res.status(500).json({ message: 'PROMPT_CATALOG_API_URL is not configured' });
    }

    const normalizedApiUrl = promptCatalogApiUrl.endsWith('/')
      ? promptCatalogApiUrl
      : `${promptCatalogApiUrl}/`;

    let requestUrl: string;
    try {
      requestUrl = new URL('api/prompts', normalizedApiUrl).toString();
    } catch {
      return res.status(500).json({ message: 'Invalid PROMPT_CATALOG_API_URL' });
    }

    try {
      const response = await fetchImpl(requestUrl, {
        method: 'POST',
        headers: {
          ...buildPromptCatalogHeaders(req.user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body ?? {}),
        signal: getTimeoutSignal(timeoutMs),
      });

      const data = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ message: 'Failed to create Prompt Catalog prompt' });
      }

      return res.status(200).json(data);
    } catch (error) {
      logger.error('[PromptHubCatalogCreate] Failed to create prompt:', error);
      return res.status(502).json({ message: 'Prompt Catalog service unavailable' });
    }
  };
}

export function createPromptHubCatalogUpdateHandler(
  deps: PromptHubCatalogMutationDependencies,
): (req: CatalogPromptUpdateRequest, res: Response) => Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10_000;

  return async function promptHubCatalogUpdateHandler(
    req: CatalogPromptUpdateRequest,
    res: Response,
  ): Promise<Response> {
    const promptId = Number.parseInt(String(req.params?.id ?? ''), 10);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return res.status(400).json({ message: 'A valid prompt id is required' });
    }

    const promptCatalogApiUrl = deps.getPromptCatalogApiUrl();
    if (!promptCatalogApiUrl) {
      return res.status(500).json({ message: 'PROMPT_CATALOG_API_URL is not configured' });
    }

    let requestUrl: string;
    try {
      requestUrl = buildPromptCatalogPromptUrl(promptCatalogApiUrl, promptId);
    } catch {
      return res.status(500).json({ message: 'Invalid PROMPT_CATALOG_API_URL' });
    }

    try {
      const response = await fetchImpl(requestUrl, {
        method: 'PUT',
        headers: {
          ...buildPromptCatalogHeaders(req.user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body ?? {}),
        signal: getTimeoutSignal(timeoutMs),
      });

      const data = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ message: 'Failed to update Prompt Catalog prompt' });
      }

      return res.status(200).json(data);
    } catch (error) {
      logger.error('[PromptHubCatalogUpdate] Failed to update prompt:', error);
      return res.status(502).json({ message: 'Prompt Catalog service unavailable' });
    }
  };
}

export function createPromptHubCatalogDeleteHandler(
  deps: PromptHubCatalogMutationDependencies,
): (req: CatalogPromptDeleteRequest, res: Response) => Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10_000;

  return async function promptHubCatalogDeleteHandler(
    req: CatalogPromptDeleteRequest,
    res: Response,
  ): Promise<Response> {
    const promptId = Number.parseInt(String(req.params?.id ?? ''), 10);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return res.status(400).json({ message: 'A valid prompt id is required' });
    }

    const promptCatalogApiUrl = deps.getPromptCatalogApiUrl();
    if (!promptCatalogApiUrl) {
      return res.status(500).json({ message: 'PROMPT_CATALOG_API_URL is not configured' });
    }

    let requestUrl: string;
    try {
      requestUrl = buildPromptCatalogPromptUrl(promptCatalogApiUrl, promptId);
    } catch {
      return res.status(500).json({ message: 'Invalid PROMPT_CATALOG_API_URL' });
    }

    try {
      const response = await fetchImpl(requestUrl, {
        method: 'DELETE',
        headers: buildPromptCatalogHeaders(req.user),
        signal: getTimeoutSignal(timeoutMs),
      });

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ message: 'Failed to delete Prompt Catalog prompt' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('[PromptHubCatalogDelete] Failed to delete prompt:', error);
      return res.status(502).json({ message: 'Prompt Catalog service unavailable' });
    }
  };
}
