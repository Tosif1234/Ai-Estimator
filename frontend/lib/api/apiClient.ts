const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

type TokenRefreshListener = (newAccessToken: string) => void;
type AuthFailureListener = (reason: string) => void;

const tokenRefreshListeners: Set<TokenRefreshListener> = new Set();
const authFailureListeners: Set<AuthFailureListener> = new Set();

export function onTokenRefresh(listener: TokenRefreshListener): () => void {
  tokenRefreshListeners.add(listener);
  return () => {
    tokenRefreshListeners.delete(listener);
  };
}

export function onAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

function notifyTokenRefresh(newAccessToken: string): void {
  tokenRefreshListeners.forEach((listener) => {
    try {
      listener(newAccessToken);
    } catch (err) {
      console.error('Error in onTokenRefresh listener:', err);
    }
  });
}

function notifyAuthFailure(reason: string): void {
  authFailureListeners.forEach((listener) => {
    try {
      listener(reason);
    } catch (err) {
      console.error('Error in onAuthFailure listener:', err);
    }
  });
}

const EXCLUDED_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/logout-all',
  '/auth/forgot-password',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
];

function isAuthExcludedUrl(url: string): boolean {
  return EXCLUDED_AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

let activeRefreshPromise: Promise<string | null> | null = null;

async function executeRefreshToken(): Promise<string | null> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    clearTokens();
    notifyAuthFailure('Your session has expired. Please sign in again.');
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      notifyAuthFailure('Your session has expired. Please sign in again.');
      return null;
    }

    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) {
      clearTokens();
      notifyAuthFailure('Your session has expired. Please sign in again.');
      return null;
    }

    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });

    notifyTokenRefresh(data.accessToken);
    return data.accessToken;
  } catch {
    clearTokens();
    notifyAuthFailure('Your session has expired. Please sign in again.');
    return null;
  }
}

export async function requestTokenRefresh(): Promise<string | null> {
  if (!activeRefreshPromise) {
    activeRefreshPromise = executeRefreshToken().finally(() => {
      activeRefreshPromise = null;
    });
  }
  return activeRefreshPromise;
}

async function handleResponse(response: Response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = (data && (data as Record<string, unknown>).message) as string || response.statusText;
    throw new ApiError(response.status, message, data);
  }

  return data;
}

async function request(url: string, options: RequestInit, isRetry = false): Promise<unknown> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${url}`, config);

  if (response.status === 401) {
    if (isAuthExcludedUrl(url)) {
      return handleResponse(response);
    }

    if (isRetry) {
      clearTokens();
      notifyAuthFailure('Your session has expired. Please sign in again.');
      return handleResponse(response);
    }

    const newAccessToken = await requestTokenRefresh();
    if (!newAccessToken) {
      return handleResponse(response);
    }

    const retryHeaders = new Headers(options.headers);
    retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
    if (!retryHeaders.has('Content-Type') && options.body && typeof options.body === 'string') {
      retryHeaders.set('Content-Type', 'application/json');
    }

    return request(url, { ...options, headers: retryHeaders }, true);
  }

  return handleResponse(response);
}

export const apiClient = {
  get: async (url: string, options: RequestInit = {}) => {
    return request(url, { ...options, method: 'GET' });
  },
  post: async (url: string, body?: unknown, options: RequestInit = {}) => {
    return request(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },
  put: async (url: string, body?: unknown, options: RequestInit = {}) => {
    return request(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },
  patch: async (url: string, body?: unknown, options: RequestInit = {}) => {
    return request(url, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },
  delete: async (url: string, options: RequestInit = {}) => {
    return request(url, { ...options, method: 'DELETE' });
  },
  download: async (url: string, options: RequestInit = {}): Promise<{ blob: Blob; filename: string | null }> => {
    const headers = new Headers(options.headers);
    const token = getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(`${BASE_URL}${url}`, { ...options, headers });

    if (response.status === 401 && !isAuthExcludedUrl(url)) {
      const newAccessToken = await requestTokenRefresh();
      if (newAccessToken) {
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
      }
    }

    if (!response.ok) {
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const errorData = isJson ? await response.json() : await response.text();
      const message = (errorData && (errorData as Record<string, unknown>).message) as string || response.statusText;
      throw new ApiError(response.status, message, errorData);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename: string | null = null;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    return { blob, filename };
  }
};

