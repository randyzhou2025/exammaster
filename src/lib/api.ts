/** API 基址：生产环境由 Nginx 反代 /api；开发环境走 Vite proxy */
export function apiBase(): string {
  return import.meta.env.VITE_API_URL ?? "";
}

export async function apiFetch(path: string, init: RequestInit = {}, token?: string | null): Promise<Response> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}
