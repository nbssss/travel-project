# TravelRoutes UI

Frontend aplikacji do przeglądania i planowania tras turystycznych. Zbudowany w oparciu o **React 19**, **TypeScript**, **Vite**, **Tailwind CSS** i **Leaflet** (mapy). Aplikacja działa w pełni offline na danych przykładowych (mock) — nie wymaga backendu ani żadnych kluczy API.

## Wymagania

- [Node.js](https://nodejs.org/) w wersji **18+** (zalecane 20 LTS lub nowsze)
- npm (instalowany razem z Node.js)

## Szybki start

Wszystkie polecenia uruchamiaj z katalogu `frontend/`:

```bash
cd frontend
```

1. Zainstaluj zależności:

   ```bash
   npm install
   ```

2. Uruchom serwer deweloperski:

   ```bash
   npm run dev
   ```

3. Otwórz w przeglądarce adres wyświetlony w terminalu — domyślnie:

   ```
   http://localhost:5173
   ```

Vite obsługuje hot reload, więc zmiany w kodzie są widoczne natychmiast.

## Dostępne polecenia

| Polecenie         | Opis                                                       |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Uruchamia serwer deweloperski (port 5173).                 |
| `npm run build`   | Sprawdza typy (`tsc -b`) i buduje wersję produkcyjną.      |
| `npm run preview` | Serwuje lokalnie zbudowaną wersję produkcyjną.             |
| `npm run lint`    | Uruchamia ESLint na całym projekcie.                       |

## Budowanie wersji produkcyjnej

```bash
npm run build
```

Wynik trafia do katalogu `dist/`. Aby podejrzeć build lokalnie:

```bash
npm run preview
```

## Struktura projektu

```
frontend/
├── src/
│   ├── components/   # Komponenty UI (w tym komponenty współdzielone)
│   ├── pages/        # Widoki/strony (Landing, Explore, Dashboard, RouteDetail, ...)
│   ├── data/         # Dane przykładowe (mock routes)
│   ├── lib/          # Funkcje pomocnicze
│   ├── App.tsx       # Routing aplikacji
│   └── main.tsx      # Punkt wejścia
├── scripts/          # Skrypty jednorazowe (np. generowanie geometrii tras)
├── vite.config.ts    # Konfiguracja Vite (port, alias '@' → ./src)
└── package.json
```

W kodzie dostępny jest alias importów `@`, który wskazuje na `src/`, np.:

```ts
import { Button } from "@/components/ui/button";
```

## Uwagi

- Aplikacja korzysta wyłącznie z danych przykładowych (`src/data/`), dlatego nie potrzebuje pliku `.env` ani połączenia z API.
- Skrypt `scripts/gen-tracks.mjs` to jednorazowe narzędzie do wygenerowania geometrii tras; nie jest wymagany do uruchomienia aplikacji.
</content>
</invoke>
