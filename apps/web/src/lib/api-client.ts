/**
 * Fetches the raw NextAuth JWT from our own Next.js route. The session cookie
 * is scoped to the frontend domain and is not sent to the cross-domain backend,
 * so we forward the token explicitly as a Bearer header instead.
 */
const getBearerToken = async (): Promise<string | null> => {
  try {
    const res = await fetch("/api/token", { credentials: "include" });
    if (!res.ok) {
      return null;
    }
    const body: unknown = await res.json();
    if (
      body !== null &&
      typeof body === "object" &&
      "token" in body &&
      typeof (body as { token: unknown }).token === "string"
    ) {
      return (body as { token: string }).token;
    }
    return null;
  } catch {
    return null;
  }
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await getBearerToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
};

const baseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "";

const url = (path: string) => `${baseUrl()}${path}`;

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (
      body !== null &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      const msg = (body as { error: string }).error;
      if (msg.length > 0) {
        return msg;
      }
    }
  } catch {
    /* empty or non-JSON body */
  }
  return fallback;
};

const ensureOk = async (
  response: Response,
  fallback: string,
): Promise<void> => {
  if (response.ok) {
    return;
  }
  throw new Error(await readErrorMessage(response, fallback));
};

export const apiClient = {
  get: async <T = unknown>(path: string): Promise<T> => {
    const response = await fetchWithAuth(url(path));
    await ensureOk(response, `Failed to fetch ${path}`);
    return response.json() as Promise<T>;
  },

  post: async <T = unknown>(path: string, data: unknown): Promise<T> => {
    const response = await fetchWithAuth(url(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await ensureOk(response, `Failed to post to ${path}`);
    return response.json() as Promise<T>;
  },

  patch: async <T = unknown>(path: string, data: unknown): Promise<T> => {
    const response = await fetchWithAuth(url(path), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await ensureOk(response, `Failed to update ${path}`);
    return response.json() as Promise<T>;
  },

  delete: async <T = unknown>(path: string): Promise<T> => {
    const response = await fetchWithAuth(url(path), {
      method: "DELETE",
    });
    await ensureOk(response, `Failed to delete ${path}`);
    return response.json() as Promise<T>;
  },
};
