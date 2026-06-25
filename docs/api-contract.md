# API Contract — TravelRoutes

> Uzgodniony kontrakt między frontendem a backendem. Oboje zaczynają tutaj; frontend wdraża API-calls wg tych kształtów, backend wdraża endpointy wg tych samych kształtów.

## Encje (modele bazy danych)

### Route
| Kolumna | Typ | Opis |
|---|---|---|
| `Id` | `Guid` | PK |
| `Title` | `string` | |
| `Slug` | `string` | unikalny, auto z tytułu (kebab-case) |
| `Description` | `string?` | |
| `Region` | `string?` | |
| `Country` | `string?` | |
| `Difficulty` | `string` | `"easy"` / `"moderate"` / `"hard"` |
| `IsPublic` | `bool` | |
| `Tags` | `string` | JSON array w kolumnie (`["szczyt","łańcuchy"]`) |
| `DistanceKm` | `double` | wyliczane przy zapisie punktów (Haversine) |
| `AscentM` | `int` | wyliczane przy zapisie punktów |
| `DurationH` | `double` | wyliczane: `distanceKm/4 + ascentM/600` (reguła Naismitha) |
| `OwnerId` | `string` | FK → `Identity.AspNetUsers.Id` |
| `CreatedAt` | `DateTime` | UTC |
| `UpdatedAt` | `DateTime` | UTC, aktualizowane przy każdym zapisie |

### RoutePoint
| Kolumna | Typ | Opis |
|---|---|---|
| `Id` | `Guid` | PK |
| `RouteId` | `Guid` | FK → Route |
| `Order` | `int` | 0-based, kolejność w trasie |
| `Lat` | `double` | szerokość geograficzna |
| `Lng` | `double` | długość geograficzna |
| `Elevation` | `double?` | wysokość n.p.m. w metrach |
| `Kind` | `string` | `"track"` \| `"start"` \| `"end"` \| `"viewpoint"` \| `"shelter"` \| `"summit"` \| `"lake"` \| `"waypoint"` |
| `Name` | `string?` | tylko dla punktów innych niż `"track"` |
| `Note` | `string?` | opcjonalna notatka |

> **Reguła:** `kind = "track"` → punkt ścieżki GPS (brak `Name`); inne `kind` → POI (ma `Name`).  
> Frontend: punkty `"track"` tworzą tablicę `path: [number,number][]`; reszta → tablicę `pois`.

### RouteShare
| Kolumna | Typ | Opis |
|---|---|---|
| `Id` | `Guid` | PK |
| `RouteId` | `Guid` | FK → Route |
| `SharedWithUserId` | `string` | FK → `Identity.AspNetUsers.Id` |
| `CreatedAt` | `DateTime` | UTC |

---

## Kształty DTO

### RouteListItemDto
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "slug": "morskie-oko-rysy",
  "title": "Morskie Oko → Rysy",
  "region": "Tatry Wysokie",
  "country": "Polska",
  "difficulty": "hard",
  "distanceKm": 22.4,
  "ascentM": 1685,
  "durationH": 9.5,
  "isPublic": true,
  "updatedAt": "2026-04-12T00:00:00Z",
  "tags": ["szczyt", "całodniowa", "ekspozycja"],
  "owner": { "id": "user-uuid", "userName": "NataliaB" }
}
```

### RouteDetailDto
`RouteListItemDto` plus:
```json
{
  "...": "(wszystkie pola z RouteListItemDto)",
  "description": "Klasyczna trasa na najwyższy szczyt polskich Tatr...",
  "createdAt": "2026-04-12T00:00:00Z",
  "points": [
    { "id": "uuid", "order": 0, "lat": 49.2701, "lng": 20.0805, "elevation": 980,  "kind": "start",    "name": "Polana Palenica", "note": "Parking, początek asfaltówki." },
    { "id": "uuid", "order": 1, "lat": 49.2699, "lng": 20.0826, "elevation": null, "kind": "track",    "name": null,              "note": null },
    { "id": "uuid", "order": 5, "lat": 49.2602, "lng": 20.0875, "elevation": 1410, "kind": "shelter",  "name": "Schronisko nad Morskim Okiem", "note": "Kawa, herbata." },
    { "id": "uuid", "order": 99,"lat": 49.2367, "lng": 20.0880, "elevation": 2499, "kind": "summit",   "name": "Rysy 2499 m",     "note": "Najwyższy szczyt Polski." }
  ]
}
```

### CreateRouteDto (request body)
```json
{
  "title": "Morskie Oko → Rysy",
  "description": "Klasyczna trasa...",
  "region": "Tatry Wysokie",
  "country": "Polska",
  "difficulty": "hard",
  "isPublic": true,
  "tags": ["szczyt", "całodniowa"]
}
```
Walidacja (FluentValidation): `Title` wymagany 1–200 znaków; `Difficulty` ∈ {easy, moderate, hard}; `Tags` max 10 elementów.

### UpdateRouteDto (request body)
Identyczny kształt co `CreateRouteDto` (pełen replace metadanych).

### UpsertPointsDto (request body — bulk replace punktów)
```json
{
  "points": [
    { "order": 0, "lat": 49.2701, "lng": 20.0805, "elevation": 980,  "kind": "start",   "name": "Polana Palenica", "note": "Parking." },
    { "order": 1, "lat": 49.2699, "lng": 20.0826, "elevation": null, "kind": "track",   "name": null,              "note": null },
    { "order": 2, "lat": 49.2367, "lng": 20.0880, "elevation": 2499, "kind": "summit",  "name": "Rysy 2499 m",     "note": null }
  ]
}
```
Po zapisie backend **przelicza** `DistanceKm`, `AscentM`, `DurationH` i aktualizuje `UpdatedAt`. Odpowiedź: `RouteDetailDto`.

### AddPointDto (request body — jeden punkt)
```json
{ "order": 5, "lat": 49.2486, "lng": 20.0820, "elevation": 1583, "kind": "lake", "name": "Czarny Staw", "note": null }
```
Odpowiedź: `RoutePointResponseDto` (201 Created) — cały punkt z przypisanym `id`.

### RoutePointResponseDto
```json
{ "id": "uuid", "order": 5, "lat": 49.2486, "lng": 20.0820, "elevation": 1583, "kind": "lake", "name": "Czarny Staw", "note": null }
```

### ShareRouteDto (request body)
```json
{ "userName": "MaciekK" }
```

### ShareDto (response)
```json
{ "sharedWithUserId": "user-uuid", "userName": "MaciekK", "createdAt": "2026-04-12T00:00:00Z" }
```

### UserSearchItemDto
```json
{ "id": "user-uuid", "userName": "MaciekK" }
```

---

## Endpointy

### Auth (istniejące)
| Metoda | Ścieżka | Auth | Opis |
|---|---|---|---|
| `POST` | `/register` | — | rejestracja (`userName`, `email`, `password`) |
| `POST` | `/login` | — | logowanie po `userName` → `{ accessToken }` |

### Routes
| Metoda | Ścieżka | Auth | Opis |
|---|---|---|---|
| `GET` | `/routes` | opcjonalna | publiczne trasy; z tokenem zwraca też własne prywatne |
| `GET` | `/routes/mine` | wymagana | trasy zalogowanego użytkownika |
| `GET` | `/routes/shared-with-me` | wymagana | trasy udostępnione zalogowanemu |
| `GET` | `/routes/{id}` | opcjonalna | szczegóły trasy (publiczna / własna / udostępniona) |
| `POST` | `/routes` | wymagana | utwórz trasę → 201 + `RouteDetailDto` |
| `PUT` | `/routes/{id}` | właściciel | zaktualizuj metadane → `RouteDetailDto` |
| `DELETE` | `/routes/{id}` | właściciel | usuń trasę → 204 |

Query params dla `GET /routes`: `?q=&region=&difficulty=&page=1&pageSize=20`

### Route Points
| Metoda | Ścieżka | Auth | Opis |
|---|---|---|---|
| `PUT` | `/routes/{id}/points` | właściciel | zamień wszystkie punkty → `RouteDetailDto` (liczy dystans/wznios/czas) |
| `POST` | `/routes/{id}/points` | właściciel | dopisz jeden punkt → 201 + `RoutePointResponseDto` |
| `DELETE` | `/routes/{id}/points/{pointId}` | właściciel | usuń punkt → 204 |

### Sharing
| Metoda | Ścieżka | Auth | Opis |
|---|---|---|---|
| `GET` | `/routes/{id}/shares` | właściciel | lista udziałów trasy → `ShareDto[]` |
| `POST` | `/routes/{id}/shares` | właściciel | udostępnij użytkownikowi → 201 + `ShareDto` |
| `DELETE` | `/routes/{id}/shares/{userId}` | właściciel | cofnij dostęp → 204 |

### Users
| Metoda | Ścieżka | Auth | Opis |
|---|---|---|---|
| `GET` | `/users/search?q=...` | wymagana | szukaj po prefiksie `userName` → `UserSearchItemDto[]` (max 10) |

### Misc
| Metoda | Ścieżka | Auth | Opis |
|---|---|---|---|
| `GET` | `/health` | — | stan serwisu → `{ "status": "healthy", "database": "reachable" }` |
| `GET` | `/routes/{id}/export/gpx` | właściciel / udostępniona | plik GPX (`application/gpx+xml`) |

---

## Błędy — format ProblemDetails (RFC 7807)

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Validation Failed",
  "status": 400,
  "errors": {
    "title": ["Title is required."],
    "difficulty": ["Must be one of: easy, moderate, hard."]
  }
}
```

| Kod | Sytuacja |
|---|---|
| 400 | błąd walidacji (FluentValidation → ProblemDetails z polem `errors`) |
| 401 | brak/nieważny JWT |
| 403 | właściwy token, ale brak uprawnień (nie właściciel) |
| 404 | zasób nie istnieje lub nie masz do niego dostępu |
| 409 | konflikt (np. podwójny share tego samego użytkownika) |

---

## Mapowanie frontend mock → API

| Pole w `mockRoutes.ts` | Skąd w API |
|---|---|
| `id` | `RouteDetailDto.id` (Guid jako string) |
| `slug` | `RouteDetailDto.slug` |
| `path: [number,number][]` | `points` gdzie `kind === "track"` → `[lat, lng]` |
| `pois: POI[]` | `points` gdzie `kind !== "track"` |
| `pois[].coords` | `[point.lat, point.lng]` |
| `author.name` | brak — tylko `owner.userName`; `initials` generowane na FE |
| `distanceKm`, `ascentM`, `durationH` | liczone przez backend przy `PUT /routes/{id}/points` |

Migracja `mockRoutes` → API (w [api.ts](../frontend/src/lib/api.ts)):
```ts
// Zamiast: import { mockRoutes } from "@/data/mockRoutes"
// Docelowo:
export const routesApi = {
  list:          () => request<RouteListItemDto[]>("/routes"),
  mine:          () => request<RouteListItemDto[]>("/routes/mine"),
  sharedWithMe:  () => request<RouteListItemDto[]>("/routes/shared-with-me"),
  get:           (id: string) => request<RouteDetailDto>(`/routes/${id}`),
  create:        (body: CreateRouteDto) => request<RouteDetailDto>("/routes", { method: "POST", body: JSON.stringify(body) }),
  update:        (id: string, body: UpdateRouteDto) => request<RouteDetailDto>(`/routes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove:        (id: string) => request<void>(`/routes/${id}`, { method: "DELETE" }),
  upsertPoints:  (id: string, body: UpsertPointsDto) => request<RouteDetailDto>(`/routes/${id}/points`, { method: "PUT", body: JSON.stringify(body) }),
};
```

---

## Podział pracy

| | Osoba A (`feat/routes`) | Osoba B (`feat/sharing`) |
|---|---|---|
| Endpointy BE | `/routes` CRUD, `/routes/{id}/points` | `/routes/shared-with-me`, `/routes/{id}/shares`, `/users/search`, `/health`, GPX export |
| Strony FE | Dashboard, RouteDetail, RouteEditor | Explore, „Udostępnij" modal, profil |
| Wspólny fundament (razem, 1 PR przed startem) | encje + migracja + `AddProblemDetails` + `ValidationFilter` | — |
