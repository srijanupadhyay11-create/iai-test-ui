const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('iai_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (body: {
      first_name: string; last_name?: string; email: string;
      phone: string; dob: string; organisation?: string; password: string;
    }) =>
      request<{ message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  tests: {
    list: () => request<any[]>('/tests'),
    import: () => request<{ imported: number; tests: any[] }>('/tests/import', { method: 'POST' }),
    run: (testIds: number[], mode: 'serial' | 'parallel', workers?: number, headed?: boolean) =>
      request<{ runId: string }>('/tests/run', {
        method: 'POST',
        body: JSON.stringify({ testIds, mode, workers, headed }),
      }),
    stop: (runId: string) =>
      request<{ message: string }>(`/tests/stop/${runId}`, { method: 'POST' }),
  },
  runs: {
    list: () => request<any[]>('/runs'),
    get: (runId: string) => request<{ run: any; results: any[] }>(`/runs/${runId}`),
  },
};
