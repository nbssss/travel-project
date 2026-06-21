## Uruchomienie (lokalnie)

Trzy elementy uruchamiane osobno: **baza → backend → frontend**.

### 1. Baza danych (PostgreSQL w Dockerze)
W katalogu głównym repo:
```bash
docker compose up -d db
```
Postgres nasłuchuje na `localhost:5433`. Connection string jest w `appsettings.json`.

### 2. Backend
Klucz do podpisu JWT poza repo - należy ustawić go **raz** (dowolny losowy ciąg, min. 32 znaki):
```bash
dotnet user-secrets set "Jwt:SecretKey" "zmien-na-losowy-sekret-min-32-znaki" --project TravelProject
```
Uruchom API (profil `http`, bez certyfikatu):
```bash
dotnet run --project TravelProject --launch-profile http
```
- API: **http://localhost:5134**
- Swagger (dokumentacja): **http://localhost:5134/swagger**
- Schemat bazy zakłada się automatycznie przy starcie.

### 3. Frontend
W osobnym terminalu:
```bash
cd frontend
npm install
npm run dev
```
Aplikacja: **http://localhost:5173**. Front domyślnie woła API pod `http://localhost:5134`.

### 4. Gotowe
Otwórz **http://localhost:5173**.

## Porty

| Usługa | Adres |
|---|---|
| PostgreSQL | `localhost:5433` |
| Backend API | `http://localhost:5134` (Swagger: `/swagger`) |
| Frontend | `http://localhost:5173` |

## Zatrzymanie

```bash
docker compose down   # zatrzymuje bazę (dane zostają w wolumenie)
```

