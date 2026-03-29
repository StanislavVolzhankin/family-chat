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
- Белорусские Belcard/Mir — ✅ принимают
- WebSocket поддерживается (нужен heartbeat ping-pong)

---

## Архитектура деплоя

### Backend — 3 проекта на Amvera

Один Dockerfile, у каждого проекта свой `amvera.yml` с разным `run.command`:

| Проект | Команда | Порт |
|--------|---------|------|
| `web` | `php artisan serve` / nginx | 8000 |
| `reverb` | `php artisan reverb:start` | 8080 |
| `queue` | `php artisan queue:work` | — |

Scheduler — **не отдельный проект**, настраивается через Amvera Cron Jobs в UI:
`php artisan schedule:run` каждую минуту.

**Стоимость:** 3 × 170 + БД 170 = ~680 руб/мес

### База данных

- PostgreSQL — отдельный managed сервис Amvera, ~170 руб/мес
- **Итого backend + БД: ~850 руб/мес**

### Frontend

- Vercel (статический React build)
- Env при билде: `VITE_API_URL`, `VITE_WS_URL`
- ⏳ После создания проектов на Amvera — вписать их внешние адреса (`VITE_API_URL`, `VITE_WS_URL`) в настройки Vercel (Environment Variables)

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

- Добавляются через UI Amvera (Variables / Secrets) — **в каждом из 3 проектов отдельно**
- Доступны **только в runtime**, не при билде
- Секреты хранятся зашифрованно (отдельное хранилище)
- Нужные переменные: `APP_KEY`, `DB_*`, `JWT_SECRET`, `GEMINI_API_KEY`, `BOT_NAME`, `REVERB_*`

---

## Dockerfile

Один Dockerfile для dev и production (без multi-stage):
- Базовый образ: `php:8.2-fpm-alpine`
- Веб-сервер: **nginx + php-fpm** (и в dev, и в prod)
- `composer install --no-dev --optimize-autoloader`
- Кэширование в startup script: `config:cache`, `route:cache`, `view:cache`

---

## Миграции БД

Встроенного release/init хука в Amvera нет. Стратегия: **startup script в проекте `web`** — перед стартом сервера выполняется `php artisan migrate --force`.

---

## CORS

В `config/cors.php` добавить Vercel-домен в `allowed_origins`.
⏳ Сделать при настройке — после того как узнаем адрес на Vercel.

---

## WebSocket / Reverb

- Heartbeat (ping-pong) обязателен для стабильности соединения на Amvera
- Настраивается в `config/reverb.php`
- ✅ Включить heartbeat при настройке

---

## Управление сервисами (экономия)

Все 3 проекта Amvera + PostgreSQL тарифицируются пока запущены.
**Требование:** возможность остановить/запустить все сервисы одной командой (bash-скрипт).

Amvera CLI существует, но в **beta** — команды stop/start не задокументированы явно.
Варианты:
- `amvera` CLI (если поддерживает stop/start)
- Amvera API (если есть)
- Через UI вручную (fallback)

⏳ Нужно проверить CLI или написать в поддержку.

---

## Открытые вопросы

| Вопрос | Статус |
|--------|--------|
| Принимают ли Belcard/Mir | ✅ Да, оплата прошла |
| Стратегия миграций (entrypoint script) | ✅ Startup script в проекте web |
| Параметры heartbeat для Reverb | ✅ Включить в config/reverb.php |
| Vercel — есть аккаунт? | ✅ Есть |
| Автодеплой по push в main или вручную | ✅ По push в main |
| Stop/start всех сервисов одной командой | ✅ Вручную через UI Amvera |
| Структура amvera.yml (поля, примеры) | ❌ Документация недоступна, выяснить при настройке |

---

## Логи

Через UI Amvera — вкладка "Лог приложения" в каждом проекте. Есть кнопка "Загрузить историю".

---

## Rollback

`git revert <commit>` + push в `main` → автодеплой предыдущей версии на Amvera и Vercel.

---

## Милстоуны

| # | Задача | Область | Сложность |
|---|--------|---------|-----------|
| M10.1 | Production Dockerfile: php:8.2-fpm-alpine + nginx + php-fpm | Backend | Средняя |
| M10.2 | Startup script (entrypoint.sh): migrate + config/route/view cache + старт nginx | Backend | Средняя |
| M10.3 | amvera.yml для каждого проекта (web, reverb, queue) | DevOps | Средняя |
| M10.4 | Reverb heartbeat: включить в config/reverb.php | Backend | Низкая |
| M10.5 | CORS: добавить Vercel-домен в config/cors.php | Backend | Низкая |
| M10.6 | Amvera: создать PostgreSQL + 3 проекта, подключить GitHub, выставить env vars | DevOps | Высокая |
| M10.7 | Amvera: настроить Cron Job для scheduler | DevOps | Низкая |
| M10.8 | Vercel: подключить репо, выставить VITE_API_URL + VITE_WS_URL | DevOps | Низкая |
| M10.9 | E2E проверка: логин, чат, бот, WebSocket, приватные чаты | QA | Средняя |
