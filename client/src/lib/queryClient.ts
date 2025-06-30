import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Unified throwIfResNotOk to handle 401 redirection globally
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      console.warn("Token expired or invalid. Redirecting to login.");
      localStorage.removeItem('token');
      // Ensure this navigation works in the context of React Query and potential SPAs
      // Forcing a full page load to /login is generally robust for clearing state.
      window.location.href = '/login';
      // Throw a specific error to stop further processing by the calling function
      // (apiRequest or getQueryFn) and by React Query for this specific failed request.
      // The browser navigation should take precedence.
      throw new ApiError("Redirecting to login due to 401.", res.status);
    }
    // For other errors, parse message and throw generic ApiError
    const text = (await res.text()) || res.statusText;
    let serverMessage = text;
    try {
       const jsonError = JSON.parse(text);
       if (jsonError && jsonError.message) {
           serverMessage = jsonError.message;
       }
    } catch (e) {
       // Not a JSON error, or no message field, proceed with text
    }
    throw new ApiError(serverMessage, res.status);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers, // Use the new headers object
    body: data ? JSON.stringify(data) : undefined,
    // credentials: "include", // Removed
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = queryKey[0] as string;
    
    // Check if there are parameters in the queryKey (second element)
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const params = new URLSearchParams();
      const queryParams = queryKey[1] as Record<string, any>;
      for (const key in queryParams) {
        // Only append parameter if its value is not undefined and not null
        if (queryParams[key] !== undefined && queryParams[key] !== null) {
          params.append(key, queryParams[key].toString());
        }
      }
      if (params.toString()) { // Check if any parameters were actually added
        url += `?${params.toString()}`;
      }
    }

    const res = await fetch(url, { // Use the newly constructed URL
      headers,
      // credentials: "include", // Removed
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
