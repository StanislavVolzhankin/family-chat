# Feature Plan — M10: Деплой

## Цель

Проект живёт в интернете: backend, фронтенд и база данных задеплоены на бесплатные/дешёвые облачные сервисы, CI/CD автоматизирует запуск тестов и деплой.

---

## Решение: Amvera (backend) + Vercel (frontend)

### Почему другие отпали

| Провайдер | Причина отказа |
|-----------|----------------|
| Fly.io | Нет бесплатного плана, белорусские карты не принимают |
| Render | WebSocket таймаут 5 мин (чат не работает) |
| Koyeb | Только 1 сервис на free tier |
| Railway | Только 30-дневный триал |

### Почему Amvera

- Российский PaaS, git push деплой, Docker
- ~170 руб/мес за приложение
- Белорусские Belcard/Mir — **пока не подтверждено** ⚠️
- WebSocket поддерживается (нужен heartbeat ping-pong)

---

## Архитектура деплоя

### Backend — 4 проекта на Amvera

Один Dockerfile, у каждого проекта свой `amvera.yml` с разным `run.command`:

| Проект | Команда | Порт |
|--------|---------|------|
| `web` | `php artisan serve` / nginx | 8000 |
| `reverb` | `php artisan reverb:start` | 8080 |
| `queue` | `php artisan queue:work` | — |
| `scheduler` | `php artisan schedule:run` (loop) | — |

**Стоимость:** 4 × 170 = ~680 руб/мес

### База данных

- PostgreSQL — отдельный managed сервис Amvera, ~170 руб/мес
- **Итого backend + БД: ~850 руб/мес**

### Frontend

- Vercel (статический React build)
- Env при билде: `VITE_API_URL`, `VITE_WS_URL`

---

## Внутренняя сеть Amvera

Проекты общаются по внутренним именам:
```
amvera-<имя-проекта>-run-<имя-пользователя>
```

Пример: `queue` и `reverb` подключаются к БД по имени `amvera-postgres-run-username`.

- Трафик внутри сети **без шифрования** (со стороны Amvera)
- Порты: `run.containerPort` (слушает приложение) и `run.servicePort` (экспозиция)

---

## Переменные окружения

- Добавляются через UI Amvera (Variables / Secrets)
- Доступны **только в runtime**, не при билде
- Секреты хранятся зашифрованно (отдельное хранилище)
- Нужные переменные: `APP_KEY`, `DB_*`, `JWT_SECRET`, `GEMINI_API_KEY`, `BOT_NAME`, `REVERB_*`

---

## Миграции БД

Встроенного release/init хука в Amvera нет. Стратегия: **запускать `php artisan migrate --force` в startup-скрипте проекта `web`**.

⏳ Нужно проработать детали (entrypoint script).

---

## WebSocket / Reverb

- Heartbeat (ping-pong) обязателен для стабильности соединения
- Настраивается в `config/reverb.php`
- ⏳ Уточнить конкретные параметры heartbeat

---

## Открытые вопросы

| Вопрос | Статус |
|--------|--------|
| Принимают ли Belcard/Mir | ✅ Да, оплата прошла |
| Стратегия миграций (entrypoint script) | ⏳ Нужно проработать |
| Параметры heartbeat для Reverb | ⏳ Нужно уточнить |
| Vercel — есть аккаунт? | ✅ Есть |
| Автодеплой по push в main или вручную | ✅ По push в main |

---

## Милстоуны

_Будут заполнены после закрытия открытых вопросов._
