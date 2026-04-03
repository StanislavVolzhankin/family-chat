# Feature Plan — M4: Устойчивость

## Цель

Сделать чат устойчивым к обрывам соединения: автоматический reconnect с exponential backoff,
понятные UI-состояния, и retention job для очистки старых сообщений.

---

## Подзадачи

### M4.1 — Backend: Retention job

**Команда:** `app/Console/Commands/CleanupOldMessages.php`
- Удаляет сообщения с `created_at < now()->subDays(30)`, батчами по 100
- Регистрация в `routes/console.php` — запуск `->daily()`
- Cron в Docker: добавить в `docker-compose.yml` запуск `php artisan schedule:run`

**Тесты:**
- Команда удаляет сообщения старше 30 дней
- Команда не трогает сообщения младше 30 дней
- Команда работает когда нет старых сообщений (0 удалений)

---

### M4.2 — Frontend: Reconnect + UI-состояния

**`useWebSocket.js`:**
- Добавить reconnect с exponential backoff при разрыве:
  - Задержки: 500ms → 1s → 2s → 4s → 8s → 16s (макс), до 10 попыток
  - `attemptRef` (useRef) — счётчик попыток
  - `timeoutRef` (useRef) — хранить setTimeout для cleanup
- Новый статус `failed` — после исчерпания 10 попыток
- После успешного reconnect — сброс счётчика, запрос `GET /api/messages?since=lastTimestamp`
- Cleanup: при unmount очищать timeout

**Статусы (итого):** `connecting | online | offline | failed`

**`ChatPage.jsx`:**
- `offline` — показывать "переподключение… попытка N из 10"
- `failed` — показывать "чат недоступен, обновите страницу"
- Кнопка отправки заблокирована при `offline` и `failed`

**Локализация — новые ключи:**
```json
"chat": {
  "status": {
    "offline": "Переподключение… попытка {{attempt}} из {{max}}",
    "failed": "Чат недоступен. Обновите страницу."
  }
}
```

---

## Порядок реализации

- **M4.1** Backend: CleanupOldMessages + scheduler + Docker cron — ✅ done
- **M4.2** Frontend: reconnect backoff + статус failed + UI + локализация — ✅ done
- QA + Reviewer + PR в develop — ✅ done (57 тестов прошли)
