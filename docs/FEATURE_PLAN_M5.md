# Feature Plan — M5: Чат-бот Lulu

## Цель

Добавить в общий чат бота Lulu — виртуального участника, отвечающего на обращения `@Lulu`.
Ответы генерируются через OpenAI API асинхронно (Laravel Queue + database driver).

---

## Архитектурные решения

- **Async через Queue**: `ProcessBotReply` job диспатчится после HTTP-ответа. Queue worker — отдельный сервис в docker-compose, использует PostgreSQL (`database` driver, без Redis).
- **Lulu в БД**: запись в таблице `users` с `is_bot=true`, случайный `password_hash` (логин невозможен).
- **Лимит символов**: 150 символов — ограничение для пользователей. Бот его не проходит. `BotService::reply()` сохраняет сообщение напрямую через `Message::create()`, минуя `MessageService::store()`.
- **content → text**: поле `content` в таблице `messages` расширено до `text` (без лимита на уровне БД). Ограничение 150 символов остаётся только в валидации `MessageService` для людей.
- **System prompt**: Lulu просит отвечать кратко и заканчивать мысль полностью — без механической обрезки.
- **BOT_NAME**: имя бота задаётся в `.env`, хранится в `config/bot.php`. Изменяется без правки кода.

---

## Подзадачи

### M5.0 — Queue инфраструктура ✅ done
- `openai-php/client` установлен
- Сервис `queue` добавлен в `docker-compose.yml` (`php artisan queue:work --sleep=3 --tries=3`)
- `.env.example`: `QUEUE_CONNECTION=database`, `BOT_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`

### M5.1 — DB: is_bot + User model + Seeder ✅ done
- Миграция: `is_bot boolean default false` + индекс на таблицу `users`
- `User` model: `is_bot` в `$fillable` и `$casts`
- `DatabaseSeeder`: создаёт Lulu (`is_bot=true`, случайный пароль)

### M5.1b — DB: content → text ✅ done
- Миграция: изменить тип `content` в таблице `messages` с `varchar(150)` на `text`
- Валидация 150 символов остаётся в `MessageService::store()` для людей

### M5.2 — config/bot.php ✅ done
- `config/bot.php`: `BOT_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`

### M5.3 — BotService + ProcessBotReply Job ✅ done
- `App\Modules\Bot\Services\BotService`:
  - `detect(string $content): bool` — ищет `@{BOT_NAME}` (строго case-sensitive)
  - `reply(string $question, int $botUserId): void`:
    1. Вызывает OpenAI API с system prompt ("Ты дружелюбный помощник Lulu. Отвечай кратко, заканчивай мысль полностью.")
    2. При ошибке OpenAI — использует локализованный текст (`bot.unavailable`)
    3. Сохраняет сообщение через `Message::create()` (минуя MessageService)
    4. Broadcast `MessageSent` всем участникам
- `App\Modules\Bot\Jobs\ProcessBotReply`:
  - Принимает `question` (string) и `botUserId` (int)
  - Вызывает `BotService::reply()`

### M5.4 — Интеграция в MessageController ✅ done
- После успешного `store()` — проверить `BotService::detect($content)`
- Если true — `ProcessBotReply::dispatch($content, $bot->id)` (через queue)

### M5.5 — UserService: запрет имени бота ✅ done
- В `createChild()` — проверка: `$username === config('bot.name')` → `username_reserved`
- Новый ключ локализации: `users.errors.username_reserved`

### M5.6 — is_bot в ответах API ✅ done
- `MessageService::getHistory()` и `store()` — добавить поле `is_bot` в payload
- `MessageSent` event — добавить `is_bot`

### M5.7 — Frontend: иконка бота + локализация ✅ done
- `ChatPage.jsx`: если `msg.is_bot === true` — показывать иконку 🤖 рядом с именем
- Новые ключи локализации в `ru.json` / `en.json`:
  ```json
  "bot": {
    "unavailable": "Lulu временно недоступна. Попробуйте позже.",
    "badge": "бот"
  }
  ```

### M5.8 — Тесты ✅ done
- `BotService::detect()` — находит `@Lulu`, не реагирует на `@lulu`, `@LuLu`
- `BotService::reply()` — сохраняет сообщение от Lulu, broadcasts
- `BotService::reply()` — при ошибке OpenAI отправляет сообщение об ошибке
- `UserService::createChild()` — нельзя создать пользователя с именем `Lulu`
- `MessageController::store()` — при `@Lulu` диспатчит job
- Frontend: сообщение с `is_bot=true` отображает иконку 🤖

---

## Порядок реализации

M5.0 ✅ → M5.1 ✅ → M5.1b ✅ → M5.2 ✅ → M5.3 ✅ → M5.4 ✅ → M5.5 ✅ → M5.6 ✅ → M5.7 ✅ → M5.8 ✅ → Code Quality → QA → Reviewer → PR
