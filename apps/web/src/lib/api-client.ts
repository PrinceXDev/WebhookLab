export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: "include",
  });
}

const baseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "";

function url(path: string) {
  return `${baseUrl()}${path}`;
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body !== null &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      const msg = (body as { error: string }).error;
      if (msg.length > 0) return msg;
    }
  } catch {
    /* empty or non-JSON body */
  }
  return fallback;
}

async function ensureOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  throw new Error(await readErrorMessage(response, fallback));
}

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
