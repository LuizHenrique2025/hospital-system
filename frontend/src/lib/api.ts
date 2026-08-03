export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type RequestOptions = {
  body?: unknown;
  token?: string | null;
  method?: string;
};

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, token, method = body ? 'POST' : 'GET' } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'Falha na requisicao.';

    try {
      const errorBody = (await response.json()) as
        | { message?: string | string[] }
        | undefined;

      if (Array.isArray(errorBody?.message)) {
        message = errorBody.message.join(', ');
      } else if (typeof errorBody?.message === 'string') {
        message = errorBody.message;
      }
    } catch {
      message = `Erro ${response.status}`;
    }

    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}
