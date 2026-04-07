import fetch, { Response as NodeFetchResponse, Headers as NodeFetchHeaders } from 'node-fetch';
import { Transform } from 'stream';
import { logger } from '@librechat/data-schemas';
import { GraphEvents, sleep } from '@librechat/agents';
import type { Response as ServerResponse } from 'express';
import type { ServerSentEvent } from '~/types';
import { sendEvent } from './events';

/**
 * Makes a function to make HTTP request and logs the process.
 * @param params
 * @param params.directEndpoint - Whether to use a direct endpoint.
 * @param params.reverseProxyUrl - The reverse proxy URL to use for the request.
 * @returns A promise that resolves to the response of the fetch request.
 */
export function createFetch({
  directEndpoint = false,
  reverseProxyUrl = '',
}: {
  directEndpoint?: boolean;
  reverseProxyUrl?: string;
}) {
  /**
   * Makes an HTTP request and logs the process.
   * @param url - The URL to make the request to. Can be a string or a Request object.
   * @param init - Optional init options for the request.
   * @returns A promise that resolves to the response of the fetch request.
   */
  return async function (
    _url: fetch.RequestInfo,
    init: fetch.RequestInit,
  ): Promise<fetch.Response> {
    let url = _url;
    if (directEndpoint) {
      url = reverseProxyUrl;
    }
    logger.debug(`Making request to ${url}`);

    const response = await fetch(url, init);

    // TEMPORARY WORKAROUND for Kong SSE bug:
    // Kong sends all parallel Claude tool call SSE chunks with index=0 (should increment per tool call).
    // This breaks LangChain’s tool call grouping. We rewrite indices here to increment per tool call.
    if (url && typeof url === 'string' && url.includes('claude') && response.body) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        let toolCallCounter = -1;
        let seenFirstToolCallName = false;
        let buffer = '';

        const fixIndexTransform = new Transform({
          transform(
            chunk: Buffer,
            _encoding: string,
            callback: (error?: Error | null, data?: string) => void,
          ) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            const output: string[] = [];

            for (const line of lines) {
              if (!line.startsWith('data: ') || line === 'data: [DONE]') {
                output.push(line);
                continue;
              }
              try {
                const data = JSON.parse(line.substring(6));
                const tcs = data?.choices?.[0]?.delta?.tool_calls;
                if (Array.isArray(tcs) && tcs.length > 0) {
                  for (const tc of tcs) {
                    if (tc.function?.name && tc.function.name.length > 0) {
                      // A name field marks the start of a new tool call
                      if (!seenFirstToolCallName) {
                        seenFirstToolCallName = true;
                        toolCallCounter = 0;
                      } else {
                        toolCallCounter += 1;
                      }
                    }
                    if (toolCallCounter >= 0) {
                      tc.index = toolCallCounter;
                    }
                  }
                  output.push('data: ' + JSON.stringify(data));
                  continue;
                }
              } catch {
                // leave line unmodified if parse fails
              }
              output.push(line);
            }

            callback(null, output.join('\n') + '\n');
          },
          flush(callback: (error?: Error | null, data?: string) => void) {
            callback(null, buffer);
          },
        });

        // Pipe original body through our transform
        const nodeStream = response.body as unknown as NodeJS.ReadableStream;
        const patchedStream = nodeStream.pipe(fixIndexTransform);

        // Reconstruct a fetch Response with the patched stream body
        const patchedHeaders = new NodeFetchHeaders(response.headers);
        const patchedResponse = new NodeFetchResponse(patchedStream, {
          status: response.status,
          statusText: response.statusText,
          headers: patchedHeaders,
        });
        return patchedResponse;
      }
    }

    return response;
  };
}

/**
 * Creates event handlers for stream events that don't capture client references
 * @param res - The response object to send events to
 * @returns Object containing handler functions
 */
export function createStreamEventHandlers(res: ServerResponse) {
  return {
    [GraphEvents.ON_RUN_STEP]: function (event: ServerSentEvent) {
      if (res) {
        sendEvent(res, event);
      }
    },
    [GraphEvents.ON_MESSAGE_DELTA]: function (event: ServerSentEvent) {
      if (res) {
        sendEvent(res, event);
      }
    },
    [GraphEvents.ON_REASONING_DELTA]: function (event: ServerSentEvent) {
      if (res) {
        sendEvent(res, event);
      }
    },
  };
}

export function createHandleLLMNewToken(streamRate: number) {
  return async function () {
    if (streamRate) {
      await sleep(streamRate);
    }
  };
}
