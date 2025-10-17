const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type JsonRequestOptions = RequestInit & {
  json?: unknown;
};

const buildUrl = (path: string) => {
  if (path.startsWith('http')) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

const parseErrorMessage = async (response: Response) => {
  try {
    const data = await response.clone().json();

    if (data && typeof data === 'object') {
      if ('message' in data && typeof data.message === 'string') {
        return { message: data.message, details: data };
      }

      if ('error' in data && typeof data.error === 'string') {
        return { message: data.error, details: data };
      }
    }

    return {
      message: `API request failed with status ${response.status}`,
      details: data
    };
  } catch (error) {
    const fallbackMessage = response.statusText || 'API request failed';

    try {
      const text = await response.clone().text();
      return { message: text || fallbackMessage, details: text };
    } catch (innerError) {
      return {
        message: fallbackMessage,
        details: error ?? innerError ?? null
      };
    }
  }
};

export async function fetchJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  let body = rest.body;

  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body
  });

  if (!response.ok) {
    const { message, details } = await parseErrorMessage(response);
    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchBlob(path: string, options: RequestInit = {}) {
  const response = await fetch(buildUrl(path), options);

  if (!response.ok) {
    const { message, details } = await parseErrorMessage(response);
    throw new ApiError(response.status, message, details);
  }

  return response.blob();
}
