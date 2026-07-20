import {
  ApiError,
  UpstreamServiceError,
  UpstreamTimeoutError,
} from '../errors.js';

export interface FetchLike {
  (input: URL | RequestInfo, init?: RequestInit): Promise<Response>;
}

interface ProviderRequestOptions {
  provider: string;
  displayName: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS = 10_000;

export async function fetchProviderResponse(
  fetchImpl: FetchLike,
  input: URL | RequestInfo,
  init: RequestInit,
  options: ProviderRequestOptions,
) {
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(options.signal?.reason);

  if (options.signal?.aborted) {
    throw options.signal.reason;
  }

  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
    const bodyText = await response.text();
    return { response, bodyText };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (options.signal?.aborted) {
      throw options.signal.reason;
    }

    if (timedOut) {
      throw new UpstreamTimeoutError(
        `${options.displayName} request timed out.`,
        { provider: options.provider },
      );
    }

    throw new UpstreamServiceError(
      `Could not reach ${options.displayName}.`,
      {
        code: 'provider_unreachable',
        provider: options.provider,
        retryable: true,
      },
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}
