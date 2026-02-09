/**
 * API client helper for calling the Fastify backend
 *
 * Usage:
 * import { apiClient } from '@/lib/api';
 *
 * const data = await apiClient.get('/instances');
 * const newInstance = await apiClient.post('/instances', { name: 'My Instance' });
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  headers?: Record<string, string>;
  token?: string;
};

async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {}
): Promise<T> {
  const { headers = {}, token, ...fetchOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use statusText
    }

    throw new ApiError(response.status, response.statusText, errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "GET", ...options }),

  post: <T>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};

/**
 * Client-side API helper that automatically includes auth token from cookies
 * Note: This only works in client components
 */
export const authenticatedApiClient = {
  get: <T>(endpoint: string) => {
    const token = getClientAuthToken();
    return apiClient.get<T>(endpoint, { token });
  },

  post: <T>(endpoint: string, data?: any) => {
    const token = getClientAuthToken();
    return apiClient.post<T>(endpoint, data, { token });
  },

  put: <T>(endpoint: string, data?: any) => {
    const token = getClientAuthToken();
    return apiClient.put<T>(endpoint, data, { token });
  },

  patch: <T>(endpoint: string, data?: any) => {
    const token = getClientAuthToken();
    return apiClient.patch<T>(endpoint, data, { token });
  },

  delete: <T>(endpoint: string) => {
    const token = getClientAuthToken();
    return apiClient.delete<T>(endpoint, { token });
  },
};

/**
 * Get auth token from cookies (client-side only)
 */
function getClientAuthToken(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const cookies = document.cookie.split(";");
  const authCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("auth_token=")
  );

  if (!authCookie) {
    return undefined;
  }

  return authCookie.split("=")[1];
}

export default apiClient;
