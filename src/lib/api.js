import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async request(endpoint, options = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : { error: await response.text().catch(() => '') };

      const message = payload.error || payload.message || response.statusText || 'Request failed';
      throw new Error(`${response.status}: ${message}`);
    }

    if (response.status === 204) return null;
    return response.json();
  },
  get(endpoint) {
    return api.request(endpoint);
  },
  post(endpoint, body) {
    return api.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  patch(endpoint, body = {}) {
    return api.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete(endpoint) {
    return api.request(endpoint, { method: 'DELETE' });
  }
};
