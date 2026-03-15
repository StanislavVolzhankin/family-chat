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

Запускает пять сервисов:
- `app` — Laravel API (http://localhost:8000)
- `db` — PostgreSQL (localhost:5432)
- `reverb` — WebSocket-сервер (ws://localhost:8080)
- `queue` — Laravel Queue worker (обрабатывает ответы бота Lulu)
- `scheduler` — Laravel Scheduler (retention job, очистка старых сообщений)

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

Seed создаёт:
- Пользователя-родителя: логин `parent`, пароль `secret`
- Бота Lulu: запись в `users` с `is_bot=true` (имя берётся из `BOT_NAME` в `.env`)

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

### Backend

```bash
docker exec family-chat-app-1 php artisan test
```

Тесты используют отдельную БД `family_chat_test` и не трогают данные в `family_chat`.

> **Важно:** запускать backend тесты только через `docker exec`, не локально.
> Локальный PHP не имеет доступа к hostname `db` (Docker-сервис PostgreSQL) —
> каждый тест будет висеть на таймауте подключения (~15–25 мин на весь прогон).

### Frontend

```bash
cd frontend
npx vitest run
```

---

## Переменные окружения для бота

В `backend/.env` необходимо задать:

```env
BOT_NAME=Lulu
LLM_PROVIDER=gemini          # gemini | openai
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash

# Опционально (если LLM_PROVIDER=openai)
# OPENAI_API_KEY=your_key_here
# OPENAI_MODEL=gpt-4o-mini
```

Получить Gemini API key бесплатно: [aistudio.google.com](https://aistudio.google.com) → Get API key.

---

## Полезные команды

```bash
# Логи backend
docker compose logs -f app

# Логи WebSocket
docker compose logs -f reverb

# Логи Queue worker (ответы бота)
docker compose logs -f queue

# Перезапустить queue после изменений
docker compose up -d --no-deps queue

# Остановить все сервисы
docker compose down

# Полный сброс (включая данные в БД)
docker compose down -v
```
