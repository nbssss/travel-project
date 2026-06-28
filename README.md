# TravelRoutes

Aplikacja webowa do **planowania, zapisywania i udostępniania tras** górskich
i rowerowych. Użytkownik rysuje trasę na interaktywnej mapie, a aplikacja
dopasowuje ją do realnych szlaków, liczy dystans, przewyższenia i szacowany czas
przejścia oraz pozwala wyeksportować trasę do pliku GPX.

## Stos technologiczny

| Warstwa | Technologie |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, React Router, React Query, Tailwind, Leaflet |
| **Backend** | ASP.NET Core 8 (REST API), Entity Framework Core, ASP.NET Identity, JWT, FluentValidation |
| **Baza danych** | PostgreSQL |
| **Mapy / routing** | OpenTopoMap (podkład mapy), BRouter (trasowanie), Overpass API (szlaki OpenStreetMap) - usługi otwarte, wołane z przeglądarki |
| **DevOps** | Docker Compose, GitHub Actions (CI: lint, build, test) |

---

## Architektura

Aplikacja ma architekturę **trójwarstwową** i jest w całości
skonteneryzowana. Backend to **monolit** z czytelnym podziałem na warstwy
(`Controller → Service → DbContext`).


**Kluczowe założenia:**

- **Bezstanowe API na JWT** - backend nie trzyma sesji; tożsamość niesie token
  wstrzykiwany przez frontend w nagłówek `Authorization` przy każdym żądaniu.
- **Usługi mapowe wołane z przeglądarki** - backend pozostaje
  czysty i odpowiada tylko za dane domenowe oraz autoryzację.
- **Walidacja dwuwarstwowa** — Zod na froncie (UX) i FluentValidation na
  backendzie.

**Przepływ tworzenia trasy:** użytkownik klika punkty na mapie → przeglądarka
pyta BRouter o trasę po szlaku wraz z wysokościami → liczy dystans, przewyższenia
i czas (reguła Naismitha) → wysyła do API (`PUT /routes/{id}/points`) → backend
waliduje, ma własny fallback obliczeń (Haversine) i zapisuje trasę z punktami →
React Query unieważnia cache i UI odświeża się automatycznie.

---

## Uruchomienie (Docker)

Wymagany jest tylko **Docker** z Docker Compose.

```bash
docker compose up --build
```

Jedna komenda stawia cały stack: bazę, backend i frontend. Dzięki health-checkom
kolejność jest pilnowana automatycznie (API startuje po gotowości bazy, frontend
po gotowości API). Schemat bazy zakłada się sam przy starcie (migracje EF Core).

### Adresy

| Usługa | Adres |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8081 |
| Swagger | http://localhost:8081/swagger |
| Health-check | http://localhost:8081/health |

### Zatrzymanie

```bash
docker compose down        # zatrzymuje stack (dane bazy zostają w wolumenie)
docker compose down -v     # dodatkowo usuwa dane bazy
```

## Struktura repozytorium

```
TravelProject/
├── TravelProject/        # BACKEND - ASP.NET Core 8 API
│   ├── Controllers/      #   endpointy REST
│   ├── Services/         #   logika biznesowa
│   ├── Models/           #   encje + DTO
│   ├── Data/             #   DbContext, użytkownik Identity
│   ├── Validators/       #   reguły FluentValidation
│   └── Migrations/       #   migracje EF Core
├── frontend/             # FRONTEND - React 19 + Vite
│   └── src/
│       ├── components/   #   komponenty (RouteMap, ElevationProfile, ...)
│       ├── pages/        #   widoki (Dashboard, Explore, RouteEditor, ...)
│       └── lib/          #   api.ts, auth.tsx, routing.ts
└── docker-compose.yaml   # KONTENERYZACJA - db + api + frontend
```

---

## CI

Każdy push i pull request na `main` uruchamia GitHub Actions
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

- **Backend** — lint (`dotnet format`), build, testy
- **Frontend** — lint (ESLint), build
- **Docker** — `docker compose build`
