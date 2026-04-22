interface ApiErrorOptions {
  code: string;
  provider?: string | null;
  retryable?: boolean;
  retryAfterSeconds?: number | null;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    options: ApiErrorOptions,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.provider = options.provider ?? null;
    this.retryable = options.retryable ?? false;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }

  readonly code: string;
  readonly provider: string | null;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
}

export class ConfigurationError extends ApiError {
  constructor(
    message: string,
    options: Partial<ApiErrorOptions> = {},
  ) {
    super(503, message, {
      code: options.code ?? 'configuration_error',
      provider: options.provider,
      retryable: options.retryable,
      retryAfterSeconds: options.retryAfterSeconds,
    });
    this.name = 'ConfigurationError';
  }
}

export class UpstreamServiceError extends ApiError {
  constructor(
    message: string,
    options: Partial<ApiErrorOptions> = {},
  ) {
    super(502, message, {
      code: options.code ?? 'upstream_service_error',
      provider: options.provider,
      retryable: options.retryable,
      retryAfterSeconds: options.retryAfterSeconds,
    });
    this.name = 'UpstreamServiceError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    message: string,
    options: Partial<ApiErrorOptions> = {},
  ) {
    super(503, message, {
      code: options.code ?? 'provider_rate_limited',
      provider: options.provider,
      retryable: options.retryable ?? true,
      retryAfterSeconds: options.retryAfterSeconds,
    });
    this.name = 'RateLimitError';
  }
}
