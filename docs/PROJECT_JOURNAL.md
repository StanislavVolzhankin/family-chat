# Family Chat — Project Journal

## Процесс (настройка до кода)

- Определили стек: Laravel 12 + React SPA + PostgreSQL + WebSocket + Docker
- Выбрали хостинг: Fly.io (backend) + Vercel (frontend)
- Настроили GitHub: protected main, develop, feature branches, PR template
- Описали агентов: Orchestrator, Architect, Backend Dev, Frontend Dev, DB Schema, QA, Reviewer, DevOps
- Определили workflow: Architect → Dev агенты → QA → Reviewer → human approve → commit

## Документация

| Файл | Содержание |
|------|-----------|
| `docs/PROJECT_OVERVIEW.md` | Бизнес-требования: роли, функционал, NFR (перформанс, безопасность, i18n) |
| `docs/ARCHITECTURE.md` | Архитектура: стек, модули, схема БД, WebSocket, API контракты |
| `docs/DEVELOPMENT_PLAN.md` | План milestone'ов M0–M6 |
| `docs/WORKFLOWS/FEATURE_IMPLEMENTATION.md` | Workflow разработки фич (агентный процесс) |
| `agents/ORCHESTRATOR.md` | Роль и правила Orchestrator агента |
| `agents/ARCHITECT.md` | Роль Architect агента |
| `agents/BACKEND_DEV.md` | Роль Backend Dev агента |
| `agents/FRONTEND_DEV.md` | Роль Frontend Dev агента |
| `agents/DB_SCHEMA.md` | Роль DB Schema агента |
| `agents/QA.md` | Роль QA агента |
| `agents/REVIEWER.md` | Роль Reviewer агента |
| `agents/DEVOPS.md` | Роль DevOps агента |
| `CLAUDE.md` | Инструкции для Claude по проекту |
| `.github/PULL_REQUEST_TEMPLATE.md` | Шаблон PR |

## Milestone статусы

### M0 Scaffold ✅ (merged into develop, PR #1 + PR #2)
- Laravel 12 модульный монолит (модули Auth, Chat)
- React SPA с роутингом (Login, Chat, UserManagement)
- PostgreSQL миграции (users, messages, sessions)
- Docker (Dockerfile + docker-compose)
- Проверено: `docker compose up` работает, API отвечает на localhost:8000
- Уроки: нельзя пропускать QA/Reviewer; scaffold должен начинаться с `composer create-project`

### M1 Аутентификация ✅ (merged into develop, PR #4)
- `POST /api/auth/login` → JWT токен
- Экран логина (React) с валидацией и обработкой ошибок
- Хранение токена в localStorage, редирект на чат
- Защита роутов (неавторизованный → логин)
- Локализация RU/EN для экрана логина
- Проверено: логин работает в браузере (localhost:3000)

### M2 Управление пользователями ✅ (merged into develop, PR #5)
- `POST /api/users`, `GET /api/users`, `PATCH /api/users/{id}` — полный CRUD для родителя
- JWT + ParentOnly middleware, `cannot_deactivate_self` бизнес-правило
- `UserManagementPage` UI: список, создание, смена пароля, деактивация
- `ParentRoute` — child редиректится на `/chat`
- `AppHeader` с кнопкой Logout на всех авторизованных страницах
- Локализация RU/EN для всех пользовательских строк и ошибок
- 101 тест (36 backend + 65 frontend), все зелёные

### M3 Чат
- `GET /api/messages` — история за 30 дней
- WebSocket (send_message / new_message)
- UI чата, антиспам (1 сообщение/сек), лимит 150 символов

### M4 Устойчивость
- Reconnect с exponential backoff
- UI-состояния: онлайн / переподключение / недоступен
- Обработка ошибок, retention job (удаление сообщений старше 30 дней)

### M5 Чат-бот Lulu
- Обращение через `@Lulu` в общем чате
- Bot модуль (BotService + OpenAI API)
- Поле `is_bot` в таблице users, seeder для Lulu
- Ответы хранятся в БД, видны всем в чате
- Иконка бота в UI

### M6 Деплой
- Docker + `fly.toml` для Fly.io
- Vercel конфиг для React
- GitHub Actions CI/CD pipeline
