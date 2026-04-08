import { supabase } from './supabase';

const BASE_URL = process.env.REACT_APP_API_URL || '';

async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path, body)   => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',   body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
};
