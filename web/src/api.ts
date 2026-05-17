import type { Note, NoteVersion, ApiError } from './types';

const TOKEN_KEY = 'notes_jwt';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err = data as ApiError;
    const issueMessages = err.issues
      ? Object.entries(err.issues)
          .map(([k, v]) => `${k}: ${v.join(', ')}`)
          .join('; ')
      : '';
    const formErrors = err.errors?.join('; ') ?? '';
    const detail = [err.message, issueMessages, formErrors].filter(Boolean).join(' — ');
    throw new Error(detail || `HTTP ${res.status}`);
  }

  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ message: string }>('POST', '/register', { email, password }),

  login: (email: string, password: string) =>
    request<{ access_token: string }>('POST', '/login', { email, password }),

  listNotes: () => request<Note[]>('GET', '/notes?limit=100'),

  createNote: (title: string, content: string) =>
    request<Note>('POST', '/notes', { title, content }),

  updateNote: (id: string, body: { title?: string; content?: string }) =>
    request<Note>('PUT', `/notes/${id}`, body),

  deleteNote: (id: string) => request<void>('DELETE', `/notes/${id}`),

  pinNote: (id: string, pinned: boolean) =>
    request<Note>('PUT', `/notes/${id}/pin`, { pinned }),

  shareNote: (id: string, email: string) =>
    request<{ message: string }>('POST', `/notes/${id}/share`, {
      share_with_email: email,
    }),

  search: (q: string) =>
    request<Note[]>('GET', `/search?q=${encodeURIComponent(q)}&limit=100`),

  listVersions: (id: string) =>
    request<NoteVersion[]>('GET', `/notes/${id}/versions`),

  getVersion: (id: string, versionId: string) =>
    request<NoteVersion>('GET', `/notes/${id}/versions/${versionId}`),

  restoreVersion: (id: string, versionId: string) =>
    request<Note>('POST', `/notes/${id}/versions/${versionId}/restore`),
};
