export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}

export const apiClient = {
  get: async (path: string) => {
    const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}${path}`);
    if (!response.ok) throw new Error(`Failed to fetch ${path}`);
    return response.json();
  },

  post: async (path: string, data: any) => {
    const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to post to ${path}`);
    return response.json();
  },

  delete: async (path: string) => {
    const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete ${path}`);
    return response.json();
  },
};
