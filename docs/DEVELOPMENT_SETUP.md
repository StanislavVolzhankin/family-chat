# Family Chat — Development Setup

## Требования

- Docker + Docker Compose
- Node.js 18+

## Первый запуск

### 1. Backend + PostgreSQL + Reverb

Из корня проекта:

```bash
docker compose up -d
```

Запускает три сервиса:
- `app` — Laravel API (http://localhost:8000)
- `db` — PostgreSQL (localhost:5432)
- `reverb` — WebSocket-сервер (ws://localhost:6001)

### 2. Тестовая БД (один раз, если не создалась автоматически)

```bash
docker exec family-chat-db-1 psql -U family_chat_user -d family_chat \
  -c "CREATE DATABASE family_chat_test;" 2>/dev/null || true
```

> Примечание: при первом запуске на чистом volume `family_chat_test` создаётся автоматически через `docker/postgres/init.sql`.

### 3. Миграции и seed

```bash
docker exec family-chat-app-1 php artisan migrate
docker exec family-chat-app-1 php artisan db:seed
```

Seed создаёт пользователя-родителя:
- Логин: `parent`
- Пароль: `secret`

### 4. Frontend

В отдельном терминале:

```bash
cd frontend
npm install   # только при первом запуске
npm run dev
```

Frontend: http://localhost:3000

---

## Повторный запуск

```bash
docker compose up -d
cd frontend && npm run dev
```

Миграции и seed повторно запускать не нужно — данные сохраняются в Docker volume `pgdata`.

---

## Тесты

```bash
docker exec family-chat-app-1 php artisan test
```

Тесты используют отдельную БД `family_chat_test` и не трогают данные в `family_chat`.

---

## Полезные команды

```bash
# Логи backend
docker compose logs -f app

# Логи WebSocket
docker compose logs -f reverb

# Остановить все сервисы
docker compose down

# Полный сброс (включая данные в БД)
docker compose down -v
```
