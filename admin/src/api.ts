const api = {
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${snapbatonData.apiBase}${path}`, {
      ...options,
      headers: {
        'X-WP-Nonce': snapbatonData.nonce,
        ...(options.headers ?? {}),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message ?? 'Request failed');
    }

    return res.json();
  },

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  },

  async upload<T>(path: string, file: File, data?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
      }
    }
    return this.request<T>(path, {
      method: 'POST',
      body: formData,
    });
  },
};

export default api;
