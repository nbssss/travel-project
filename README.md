## Uruchomienie (Docker)


```bash
docker compose up --build
```

Jedna komenda stawia cały stack: bazę, backend i frontend. Dzięki health-checkom kolejność jest pilnowana automatycznie (API startuje po gotowości bazy, frontend po gotowości API). Schemat bazy zakłada się sam przy starcie (migracje EF Core).

### Adresy

| Usługa | Adres |
|---|---|
| Frontend | http://127.0.0.1:5173 |
| Backend API | http://127.0.0.1:8081 |
| Swagger | http://127.0.0.1:8081/swagger |
| Health-check | http://127.0.0.1:8081/health |

### Zatrzymanie

```bash
docker compose down        # zatrzymuje stack (dane bazy zostają w wolumenie)
docker compose down -v     # dodatkowo usuwa dane bazy
```
