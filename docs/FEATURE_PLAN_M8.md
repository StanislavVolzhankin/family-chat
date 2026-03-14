# Feature Plan — M8: Online Users Sidebar

## Цель

Показывать список пользователей, подключённых к чату прямо сейчас, в сайдбаре справа от ленты сообщений. Видят все пользователи (parent и child). Lulu всегда присутствует в списке с иконкой бота.

---

## Требования

- Сайдбар справа от ленты сообщений на странице чата
- Видят все пользователи (parent и child)
- "Активный" = подключён к WebSocket прямо сейчас
- Для каждого пользователя: имя + зелёный индикатор Online
- Текущий пользователь видит себя в списке
- Lulu всегда в списке: зелёный индикатор + иконка бота
- Только desktop Chrome (мобильная адаптация не требуется)

---

## Архитектурное решение

### Presence Channel (Laravel Reverb)

Для отслеживания онлайн-пользователей используем **Presence Channel** Laravel Echo.

Текущий канал `chat` — публичный (`Channel`).
Меняем на **Presence Channel** (`PresenceChannel`).

**Как работает:**
- При подключении к каналу `Echo.join('chat')` Reverb получает список всех участников
- События `here` (текущие), `joining` (вошёл), `leaving` (вышел) автоматически поддерживают актуальный список
- Backend авторизует подключение и возвращает данные пользователя (id, username, is_bot)

**Lulu:**
- Бот не имеет WebSocket-соединения
- Frontend получает данные Lulu из существующего auth-контекста или отдельным запросом и всегда добавляет её в список

---

## Что нужно сделать

### Backend

#### M8.1 — Presence Channel авторизация

**`routes/channels.php`** (или `BroadcastServiceProvider`):
```php
Broadcast::channel('chat', function ($user) {
    return [
        'id'       => $user->id,
        'username' => $user->username,
        'is_bot'   => $user->is_bot,
    ];
});
```

**`app/Modules/Chat/Events/MessageSent.php`:**
- Изменить `broadcastOn()`: вернуть `new PresenceChannel('chat')` вместо `new Channel('chat')`

**Broadcasting auth endpoint** уже существует (`POST /api/broadcasting/auth`) — изменений не требует.

---

### Frontend

#### M8.2 — useWebSocket: переход на presence channel

**`src/hooks/useWebSocket.js`:**
- Заменить `Echo.channel('chat')` на `Echo.join('chat')`
- Добавить обработку событий:
  - `.here(users => ...)` — начальный список онлайн-пользователей
  - `.joining(user => ...)` — пользователь подключился
  - `.leaving(user => ...)` — пользователь отключился
- Добавить в возвращаемый объект: `onlineUsers` (массив `{ id, username, is_bot }`)

#### M8.3 — OnlineUsers компонент

**`src/components/OnlineUsers.jsx`:**
- Принимает пропс `users` (массив онлайн-пользователей)
- Всегда добавляет Lulu в начало списка (из конфига или auth-контекста)
- Для каждого пользователя отображает:
  - Зелёный индикатор Online
  - Имя пользователя
  - Иконка бота (если `is_bot === true`)
- Сортировка: Lulu первая, остальные по алфавиту

**`src/components/OnlineUsers.module.css`:**
- Стили сайдбара, индикатора, иконки бота

#### M8.4 — ChatPage: layout с сайдбаром

**`src/pages/ChatPage.jsx`:**
- Добавить сайдбар `<OnlineUsers>` справа от ленты сообщений
- Передать `onlineUsers` из `useWebSocket` в компонент
- Layout: flex-контейнер (лента сообщений + форма ввода слева, сайдбар фиксированной ширины справа)

#### M8.5 — Локализация

Добавить в `ru.json` / `en.json`:
```json
"online_users": {
  "title": "В сети",
  "bot_label": "бот"
}
```

### Тесты

#### Backend
- Presence channel авторизация: возвращает корректные данные пользователя
- Presence channel авторизация: неавторизованный запрос → 403

#### Frontend (Vitest)
- `useWebSocket` — `here`, `joining`, `leaving` обновляют `onlineUsers`
- `OnlineUsers` — рендер списка пользователей с индикаторами
- `OnlineUsers` — Lulu всегда отображается первой с иконкой бота
- `OnlineUsers` — пустой список (кроме Lulu) отображается корректно
- `ChatPage` — сайдбар присутствует в layout

---

## Порядок реализации

- **M8.1** Backend: presence channel авторизация + изменение MessageSent
- **M8.2** Frontend: useWebSocket — переход на presence channel + onlineUsers
- **M8.3** Frontend: OnlineUsers компонент
- **M8.4** Frontend: ChatPage layout с сайдбаром
- **M8.5** Frontend: локализация online_users.*
- QA + Reviewer + PR в develop

---

## Файлы которые затрагиваем

### Backend (изменяем)
- `app/Modules/Chat/Events/MessageSent.php` — `PresenceChannel` вместо `Channel`
- `routes/channels.php` — авторизация presence channel

### Frontend (изменяем)
- `src/hooks/useWebSocket.js` — presence channel, onlineUsers
- `src/hooks/useWebSocket.test.js` — тесты для presence событий
- `src/pages/ChatPage.jsx` — layout с сайдбаром
- `src/pages/ChatPage.module.css` — flex layout
- `src/locales/ru.json` — ключи `online_users.*`
- `src/locales/en.json` — ключи `online_users.*`

### Frontend (новые)
- `src/components/OnlineUsers.jsx`
- `src/components/OnlineUsers.module.css`
- `src/components/OnlineUsers.test.jsx`
