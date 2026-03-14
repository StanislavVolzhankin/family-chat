# Feature Plan — M9: Chat Improvements

## Цель

Улучшить UX чата: отправка сообщения по Enter, устранение задержки доставки (3–5 сек), и переход к стандартному порядку сообщений (новые снизу).

---

## Improvement 1 — Отправка по Enter

### Требование

Пользователь нажимает `Enter` в поле ввода → сообщение отправляется.
`Shift+Enter` — перенос строки (не отправляет).

### Текущее поведение

Отправка только по кнопке «Отправить».

### Техдетали

**`src/pages/ChatPage.jsx`** (или компонент формы ввода):
- Добавить обработчик `onKeyDown` на `<textarea>`:
  ```js
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
  ```
- Существующая кнопка отправки остаётся.
- Обработчик не срабатывает если поле пустое или статус не `online`.

### Затронутые файлы
- `frontend/src/pages/ChatPage.jsx` — добавить `onKeyDown`

---

## Improvement 2 — Устранение задержки доставки сообщений

### Требование

Сообщение появляется у всех участников максимум через **1 секунду** после отправки (локально).

### Текущее поведение

Задержка 3–5 секунд от отправки до появления в чате.

### Анализ вероятных причин

#### Причина 1 (наиболее вероятная): Queue polling interval

Если `MessageSent` event использует `ShouldBroadcast` (не `ShouldBroadcastNow`), broadcast уходит в очередь. Queue worker по умолчанию поллит очередь каждые **3 секунды** — отсюда задержка.

**Проверить:** `app/Modules/Chat/Events/MessageSent.php` — какой интерфейс реализован.

**Фикс:** убедиться что используется `ShouldBroadcastNow` (синхронный broadcast, без очереди).

> Примечание: этот фикс уже был применён в M3, но стоит перепроверить актуальное состояние кода.

#### Причина 2: Queue driver — database с polling

Если queue driver = `database` и worker запущен с дефолтным `--sleep=3`, задержка = до 3 сек.

**Проверить:** `QUEUE_CONNECTION` в `backend/.env`.

**Фикс:** для broadcast не использовать database queue — использовать `sync` или `redis`.

#### Причина 3: Reverb не запущен, fallback на polling

Если Reverb WebSocket не работает и клиент делает HTTP-polling — задержка гарантирована.

**Проверить:** в браузере DevTools → Network → наличие активного WebSocket соединения.

#### Причина 4: Frontend — Echo не подключён к нужному каналу

Если `useWebSocket.js` подписывается на канал с задержкой или переподключается — первые сообщения приходят поздно.

### План диагностики

1. Открыть DevTools → Network → проверить есть ли WS-соединение к Reverb (порт 8080).
2. Проверить `MessageSent.php` — `ShouldBroadcast` или `ShouldBroadcastNow`.
3. Проверить `backend/.env` — `QUEUE_CONNECTION`, `BROADCAST_CONNECTION`.
4. Проверить логи Reverb и queue worker в Docker.

### Техдетали фиксов

**`app/Modules/Chat/Events/MessageSent.php`:**
```php
// Должно быть:
class MessageSent implements ShouldBroadcastNow
// НЕ:
class MessageSent implements ShouldBroadcast
```

**`backend/.env`:**
```
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=redis   # или sync для локальной разработки
```

**`docker-compose.yml`:**
- Убедиться что Reverb запущен и порт 8080 проброшен.
- Queue worker запущен (если нужен для других задач).

### Затронутые файлы

- `backend/app/Modules/Chat/Events/MessageSent.php` — проверить/исправить интерфейс
- `backend/.env` / `backend/.env.example` — проверить QUEUE_CONNECTION, BROADCAST_CONNECTION
- `docker-compose.yml` — проверить конфигурацию Reverb и queue worker

---

## Improvement 3 — Порядок сообщений: новые снизу

### Требование

Новые сообщения появляются **внизу** ленты (стандарт Telegram/WhatsApp/Slack).
При получении нового сообщения — автоскролл вниз, если пользователь уже находится внизу.
Если пользователь скроллил вверх (читает историю) — не скроллить, показать бейдж "новое сообщение ↓".

### Текущее поведение

Новые сообщения добавляются **сверху** (`flex-direction: column-reverse`). Нестандартно, непривычно для детей.

### Техдетали

**`src/pages/ChatPage.jsx`:**
- Убрать `flex-direction: column-reverse` с контейнера сообщений
- Массив сообщений остаётся в порядке `oldest → newest` (уже так)
- При загрузке истории — скроллить вниз сразу (`scrollTop = scrollHeight`)
- При получении нового сообщения:
  - Если пользователь внизу (threshold ~100px от низа) — автоскролл вниз
  - Если пользователь выше — показать бейдж "↓ новое сообщение", клик по нему скроллит вниз

**`src/pages/ChatPage.module.css`:**
- Убрать `flex-direction: column-reverse`
- Добавить стиль для бейджа "новое сообщение"

### Затронутые файлы
- `frontend/src/pages/ChatPage.jsx` — логика скролла и бейджа
- `frontend/src/pages/ChatPage.module.css` — убрать column-reverse, стиль бейджа

---

## Порядок реализации

- **M9.1** Диагностика задержки: проверить причины по плану выше
- **M9.2** Фикс задержки: применить найденные исправления
- **M9.3** Отправка по Enter: добавить `onKeyDown` в форму ввода
- **M9.4** Порядок сообщений: новые снизу + автоскролл + бейдж
- QA + Reviewer + PR в develop

---

## Тесты

### Backend
- `POST /api/messages` — broadcast происходит синхронно (без задержки очереди)

### Frontend (Vitest)
- `ChatPage` — нажатие `Enter` вызывает отправку сообщения
- `ChatPage` — нажатие `Shift+Enter` не вызывает отправку
- `ChatPage` — Enter не срабатывает если поле пустое
- `ChatPage` — Enter не срабатывает если статус не `online`
- `ChatPage` — новые сообщения отображаются снизу
- `ChatPage` — автоскролл вниз при получении нового сообщения (если пользователь внизу)
- `ChatPage` — бейдж "новое сообщение" появляется если пользователь проскроллил вверх
