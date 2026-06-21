// Cienka warstwa komunikacji z backendem .NET.
// Bazowy URL z env (VITE_API_URL), z fallbackiem na profil http API.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5134";

// --- token (JWT) w localStorage ---
const TOKEN_KEY = "tr_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    if (Array.isArray(data)) {
      return data
        .map((e: { description?: string; code?: string }) => e.description ?? e.code ?? "")
        .join(" ");
    }
    if (typeof data === "string") return data;
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
  } catch {
    /* odpowiedź bez JSON-a */
  }
  if (res.status === 401) return "Nieprawidłowa nazwa użytkownika lub hasło.";
  return `Błąd ${res.status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) throw new ApiError(res.status, await extractError(res));

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface LoginResponse {
  accessToken: string;
}

export const authApi = {
  register: (body: { userName: string; email: string; password: string }) =>
    request<{ id: string; email: string }>("/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { userName: string; password: string }) =>
    request<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
