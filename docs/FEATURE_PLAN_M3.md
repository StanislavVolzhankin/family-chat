# Feature Plan — M3: Chat (базовый)

## Цель

Пользователи могут обмениваться сообщениями в общем чате в режиме близком к реальному времени.
История за 30 дней загружается при входе. Антиспам: не более 1 сообщения в секунду.

---

## Что уже есть (после M2)

### Backend
- `App\Modules\Chat\Models\Message` — модель с полями: `id`, `user_id`, `content`, `created_at`
- `App\Modules\Chat\Controllers\MessageController` — заглушка (501)
- `App\Modules\Chat\Services\MessageService` — заглушка
- `app/Modules/Chat/Routes/chat.php` — роут `GET /api/messages` без middleware
- Миграция `messages`: `content varchar(150)`, индексы по `created_at` и `user_id`

### Frontend
- `ChatPage.jsx` — заглушка с AppHeader
- `locales/ru.json` и `en.json` — ключи `chat.title`, `chat.placeholder`, `chat.send`, `chat.status.*` уже есть

---

## Архитектурное решение: WebSocket

Используем **Laravel Reverb** — официальный WebSocket-сервер Laravel (с Laravel 11).

**Почему Reverb:**
- Официальный пакет, поддерживается командой Laravel
- Self-hosted, нет внешних зависимостей
- Нативная интеграция с Laravel Broadcasting
- Клиент: `laravel-echo` + `pusher-js`

**Аутентификация:**
Reverb поддерживает кастомный auth. JWT-токен передаётся клиентом через query-параметр при WS-подключении. Backend валидирует токен через существующий `AuthenticateJwt`-механизм в Reverb auth endpoint.

**Порты:**
- HTTP API: `8000` (существующий)
- Reverb WebSocket: `8080` (новый, добавить в docker-compose)

**Формат событий (по архитектуре):**
- Client → Server (через Laravel Echo / channel): `send_message { content }`
- Server → Clients: broadcast `new_message { id, user_id, username, content, created_at }`
- Server → Client (ошибки): `error { code, message }`

---

## Что нужно сделать

### Backend

#### M3.1 — GET /api/messages (история)

**MessageService:**
- `getHistory(int $days = 30): array` — возвращает сообщения за последние N дней, с join на users (нужен `username`)
- Сортировка по `created_at ASC`
- Формат записи: `{ id, user_id, username, content, created_at }`

**MessageController:**
- `index()` — вызывает `MessageService::getHistory()`, возвращает `{ data: [...] }`

**Роутинг (chat.php):**
- Добавить middleware `auth.jwt` к `GET /api/messages`

---

#### M3.2 — WebSocket: установка и конфигурация Reverb

**Установка:**
```bash
composer require laravel/reverb
php artisan reverb:install
```

**Конфигурация:**
- `config/broadcasting.php` — добавить Reverb как default driver
- `config/reverb.php` — настройки (host, port 8080, app keys)
- `.env` — добавить `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT=8080`
- `.env.example` — обновить

**Docker:**
- `docker-compose.yml` — добавить команду для запуска Reverb (`php artisan reverb:start`) и порт `8080:8080`
- Вариант: отдельный service или supervisor в существующем контейнере

**WebSocket аутентификация (JWT):**
- Broadcasting auth endpoint: `POST /api/broadcasting/auth`
  - Принимает JWT через `Authorization: Bearer` заголовок
  - Валидирует через `AuthenticateJwt` middleware
  - Авторизует подключение к каналу `chat`
- Канал `chat` — public channel (все авторизованные пользователи)

---

#### M3.3 — send_message / broadcast (MessageService)

**MessageService:**
- `store(int $userId, string $content): array`
  - Антиспам: проверить, не отправлял ли пользователь сообщение в последнюю секунду (Laravel Cache / Redis)
  - Если спам — бросить `\InvalidArgumentException('rate_limit_exceeded')`
  - Сохранить Message в БД
  - Broadcast события `MessageSent` в канал `chat`
  - Вернуть форматированное сообщение

**MessageSent event:**
```php
class MessageSent implements ShouldBroadcast {
    public function broadcastOn() { return new Channel('chat'); }
    public function broadcastAs() { return 'new_message'; }
    // payload: id, user_id, username, content, created_at
}
```

**MessageController:**
- `store(Request $request)` — принимает `{ content }`, вызывает `MessageService::store()`
- Роут: `POST /api/messages` с middleware `auth.jwt`

**Коды ошибок:**
- `rate_limit_exceeded` — антиспам (429)
- `content_too_long` — длина > 150 символов (422) [дублируется с DB constraint, но валидируем на уровне сервиса]
- `content_empty` — пустое сообщение (422)

**Антиспам реализация:**
- Ключ в Cache: `antispam:user:{userId}`, TTL = 1 секунда
- `store()` проверяет существование ключа перед сохранением, затем ставит ключ

---

### Frontend

#### M3.4 — ChatPage UI + WebSocket клиент

**Установка:**
```bash
npm install laravel-echo pusher-js
```

**api.js — новая функция:**
```js
getMessages()  // GET /api/messages → [{ id, user_id, username, content, created_at }]
sendMessage(content)  // POST /api/messages → { id, user_id, username, content, created_at }
```

**useWebSocket hook (`src/hooks/useWebSocket.js`):**
- Инициализирует `Laravel Echo` с Reverb-транспортом
- Подключается к каналу `chat`
- Слушает событие `new_message`
- Возвращает: `{ messages, status, sendMessage, error }`
- Status: `connecting | online | offline`

**ChatPage.jsx:**
- При монтировании: `getMessages()` → загрузить историю
- Подключиться к WebSocket через `useWebSocket`
- Отображать список сообщений (лента, скролл к последнему)
- Форма ввода: `textarea` + кнопка отправки
  - Блокировать отправку если `status !== 'online'`
  - Счётчик символов (0/150)
  - Отправка по кнопке или `Ctrl+Enter`
- Показывать имя отправителя и время сообщения
- Обработка ошибок: `rate_limit_exceeded`, `content_too_long`

**Локализация — добавить в ru.json / en.json:**
```json
"chat": {
  ...существующие ключи...,
  "char_count": "{{count}}/150",
  "errors": {
    "rate_limit_exceeded": "Слишком часто, подождите секунду",
    "content_too_long": "Сообщение слишком длинное (макс. 150 символов)",
    "content_empty": "Нельзя отправить пустое сообщение",
    "send_failed": "Не удалось отправить сообщение"
  }
}
```

---

### Тесты

#### Backend (Feature-тесты)
- `GET /api/messages` — возвращает историю за 30 дней, формат, без токена 401
- `GET /api/messages` — не возвращает сообщения старше 30 дней
- `POST /api/messages` — успех, создаёт запись в БД, возвращает сообщение с username
- `POST /api/messages` — антиспам: второй запрос в < 1 сек → 429
- `POST /api/messages` — пустой контент → 422
- `POST /api/messages` — контент > 150 символов → 422
- `POST /api/messages` — без токена → 401

#### Frontend (Vitest)
- `api.js` — `getMessages`, `sendMessage`
- `ChatPage` — рендер, загрузка истории, отображение сообщений, форма ввода, счётчик символов
- `useWebSocket` — mock Echo, обработка событий new_message, статусы

---

## Порядок реализации

- **M3.1** Backend: GET /api/messages (MessageService::getHistory, controller, middleware) — ✅ done
- **M3.2** Backend: Reverb setup (install, config, Docker, JWT auth endpoint) — ✅ done
- **M3.3** Backend: POST /api/messages + MessageSent event + антиспам — ⬜ todo
- **M3.4** Frontend: ChatPage + useWebSocket hook + api.js extensions — ⬜ todo
- QA + Reviewer + PR в develop

---

## Файлы которые затрагиваем

### Backend (изменяем)
- `app/Modules/Chat/Controllers/MessageController.php` — реализуем index() и store()
- `app/Modules/Chat/Services/MessageService.php` — реализуем getHistory() и store()
- `app/Modules/Chat/Routes/chat.php` — добавляем middleware и POST /api/messages
- `bootstrap/app.php` — регистрируем broadcasting auth route
- `docker-compose.yml` — добавляем Reverb port и процесс
- `.env.example` — добавляем Reverb переменные

### Backend (новые)
- `app/Modules/Chat/Events/MessageSent.php`
- `app/Http/Controllers/BroadcastingAuthController.php` (или стандартный Reverb auth)
- `config/reverb.php` (генерируется при установке)
- `tests/Feature/Chat/MessageHistoryTest.php`
- `tests/Feature/Chat/SendMessageTest.php`

### Frontend (изменяем)
- `src/pages/ChatPage.jsx` — полная реализация
- `src/utils/api.js` — добавляем getMessages, sendMessage
- `src/locales/ru.json` — добавляем ключи chat.errors, chat.char_count
- `src/locales/en.json` — добавляем ключи chat.errors, chat.char_count

### Frontend (новые)
- `src/hooks/useWebSocket.js`
- `src/hooks/useWebSocket.test.js`
- `src/pages/ChatPage.module.css`
- `src/pages/ChatPage.test.jsx`
- `src/utils/api.test.js` — добавляем тесты для getMessages/sendMessage
