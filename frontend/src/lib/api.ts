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
    // ValidationProblemDetails (FluentValidation) → { errors: { pole: [komunikaty] } }
    if (data?.errors && typeof data.errors === "object") {
      const msgs = Object.values(data.errors as Record<string, string[]>).flat();
      if (msgs.length) return msgs.join(" ");
    }
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
  // Nie ustawiaj Content-Type dla FormData — przeglądarka sama wstawi multipart/form-data z boundary
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Token wygasł/nieważny w trakcie sesji — tylko gdy faktycznie go wysłaliśmy (uwierzytelnione
  // żądanie), więc 401 z samego logowania tego nie wyzwala. Czyścimy sesję i odsyłamy na /login,
  // zamiast zostawiać użytkownika w stanie „niby zalogowany, ale każdy zapis = 401".
  if (res.status === 401 && token) {
    clearToken();
    localStorage.removeItem("tr_username");
    if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
  }

  if (!res.ok) throw new ApiError(res.status, await extractError(res));

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface LoginResponse {
  accessToken: string;
}

export interface UserProfile {
  id: string;
  userName: string;
  email: string;
}

export const usersApi = {
  profile: () => request<UserProfile>("/users/me"),
  changeUsername: (newUserName: string) =>
    request<void>("/users/me/username", { method: "PUT", body: JSON.stringify({ newUserName }) }),
  deleteAccount: () =>
    request<void>("/users/me", { method: "DELETE" }),
};

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

// --- Routes API ---

export type Difficulty = "easy" | "moderate" | "hard";

export interface CreateRouteDto {
  title: string;
  description?: string;
  region?: string;
  country?: string;
  difficulty: string;
  isPublic: boolean;
  tags: string[];
}

export interface RoutePointInput {
  order: number;
  lat: number;
  lng: number;
  elevation?: number;
  kind: string;
  name?: string;
  note?: string;
}

/** Metryki policzone na froncie z geometrii BRoutera (autorytatywne dla zapisu). */
export interface RouteMetricsInput {
  distanceKm?: number;
  ascentM?: number;
  descentM?: number;
  durationH?: number;
}

export interface RouteDto {
  id: string;
  slug: string;
  title: string;
  region?: string;
  difficulty: Difficulty;
  distanceKm: number;
  ascentM: number;
  descentM?: number;
  durationH: number;
  isPublic: boolean;
  updatedAt: string;
  ownerUserName?: string;
  likesCount: number;
  isLikedByMe: boolean;
  /** Uproszczona ścieżka [lat, lng] do podglądu na miniaturce (punkty POI trasy). */
  previewPath?: [number, number][];
}

export interface RoutePointDto {
  order: number;
  lat: number;
  lng: number;
  elevation?: number;
  kind: string;
  name?: string;
  note?: string;
}

export interface RouteDetailDto extends RouteDto {
  description?: string;
  country?: string;
  tags: string[];
  createdAt: string;
  points: RoutePointDto[];
}

export interface LikeResponse {
  liked: boolean;
  likesCount: number;
}

export const routesApi = {
  create: (body: CreateRouteDto) =>
    request<RouteDto>("/routes", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: CreateRouteDto) =>
    request<RouteDto>(`/routes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  upsertPoints: (id: string, points: RoutePointInput[], metrics?: RouteMetricsInput) =>
    request<RouteDto>(`/routes/${id}/points`, { method: "PUT", body: JSON.stringify({ points, ...metrics }) }),
  mine: () =>
    request<RouteDto[]>("/routes/mine"),
  recent: (page = 1, pageSize = 12) =>
    request<RouteDto[]>(`/routes/recent?page=${page}&pageSize=${pageSize}`),
  liked: () =>
    request<RouteDto[]>("/routes/liked"),
  bySlug: (slug: string) =>
    request<RouteDetailDto>(`/routes/${slug}`),
  remove: (id: string) =>
    request<void>(`/routes/${id}`, { method: "DELETE" }),
  exportGpx: async (id: string): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`${API_URL}/routes/${id}/export/gpx`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new ApiError(res.status, await extractError(res));
    return res.blob();
  },
  like: (id: string) =>
    request<LikeResponse>(`/routes/${id}/like`, { method: "POST" }),
  unlike: (id: string) =>
    request<LikeResponse>(`/routes/${id}/like`, { method: "DELETE" }),
};
