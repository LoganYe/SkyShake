export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ConfigurationError extends ApiError {
  constructor(message: string) {
    super(503, message);
    this.name = 'ConfigurationError';
  }
}

export class UpstreamServiceError extends ApiError {
  constructor(message: string) {
    super(502, message);
    this.name = 'UpstreamServiceError';
  }
}
