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
| `docs/DEVELOPMENT_PLAN.md` | План milestone'ов M0–M10 |
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

### M2 Управление пользователями ✅ (merged into develop, PR #7)
- `POST /api/users`, `GET /api/users`, `PATCH /api/users/{id}` — полный CRUD для родителя
- JWT + ParentOnly middleware, `cannot_deactivate_self` бизнес-правило
- `UserManagementPage` UI: список, создание, смена пароля, деактивация
- `ParentRoute` — child редиректится на `/chat`
- `AppHeader` с кнопкой Logout на всех авторизованных страницах
- Локализация RU/EN для всех пользовательских строк и ошибок
- 101 тест (36 backend + 65 frontend), все зелёные

### M3 Чат ✅ (merged into develop, PR #12)
- `GET /api/messages` — история за 30 дней (с join на users для username)
- `POST /api/messages` — сохранение + broadcast + антиспам (1 сообщение/сек через Cache)
- Laravel Reverb WebSocket сервер (порт 8080), канал `chat`, событие `MessageSent`
- `useWebSocket` hook: laravel-echo + pusher-js, статусы connecting/online/offline
- `ChatPage` UI: лента сообщений, счётчик символов (0/150), Ctrl+Enter, блокировка при offline
- Дедупликация сообщений по ID (WebSocket + история не дают дублей)
- Локализация RU/EN: chat.errors.*, chat.char_count, chat.status.connecting
- 98 тестов (backend + frontend), все зелёные
- Уроки: `ShouldBroadcastNow` вместо `ShouldBroadcast` (без queue worker события падали в очередь навсегда); React StrictMode double-mount решается через `setTimeout(0)` + `active` flag в useEffect; значения `.env` в docker-compose перекрывают файл только через `environment:` секцию, `php artisan serve` всегда читает `.env` напрямую
- Порядок сообщений (PR #14): новые сообщения отображаются сверху — `flex-direction: column-reverse` на `.messageList`, массив остаётся в порядке oldest→newest

### M4 Устойчивость ✅ (merged into develop, PR #17)
- `CleanupOldMessages` artisan command: батчевое удаление сообщений старше 30 дней (по 100 за итерацию), зарегистрирован в `->daily()` расписании
- `scheduler` Docker-сервис: запускает `php artisan schedule:run` каждые 60 секунд
- `useWebSocket` hook: exponential backoff (500ms→1s→2s→4s→8s→16s, до 10 попыток), статус `failed` после исчерпания, после reconnect — дозапрос истории с `since=lastTimestamp`
- `ChatPage` UI: счётчик попыток при `offline`, сообщение "недоступен" при `failed`, отправка заблокирована при обоих статусах
- Локализация RU/EN: `chat.status.offline` (с `{{attempt}}/{{max}}`), `chat.status.failed`
- 57 backend тестов (4 новых для CleanupOldMessages), 98 frontend тестов — все зелёные

### M5 Чат-бот Lulu ✅ (merged into develop, PR #28)
- Обращение через `@Lulu` в общем чате (case-sensitive)
- `BotService`: detect + dispatchIfNeeded + reply; асинхронный `ProcessBotReply` job через Laravel Queue (database driver)
- Поле `is_bot` в таблице users, seeder для Lulu (role=child, is_bot=true, random password)
- Ответы сохраняются в БД и рассылаются всем через WebSocket как обычные сообщения
- Иконка 🤖 в UI для bot-сообщений
- **M5b — LLM Provider Abstraction** (PR #27): интерфейс `LlmProvider`, `GeminiProvider` (gemini-2.5-flash) + `OpenAiProvider`, переключение через `LLM_PROVIDER` в `.env`
- 72 backend теста, все зелёные
- Уроки: `gemini-1.5-flash` и `gemini-2.0-flash` недоступны на free tier (limit: 0 / 404); рабочая модель — `gemini-2.5-flash`; после смены кода в queue worker — обязательно `docker restart family-chat-queue-1` + `php artisan config:clear`

### M7 Навигационное меню администратора ✅ (merged into develop, PR #30)
- `AppHeader` переработан: NavLink меню (Чат / Менеджмент пользователей) только для `parent`
- `child` видит хедер без меню (только имя + Logout)
- Имя пользователя отображается в хедере для всех ролей
- Локализация `nav.*` ключей (RU/EN)
- 9 новых тестов AppHeader, итого 107 frontend тестов — все зелёные

### M11 UI Redesign ✅ (merged into develop, PR #34)
- Tailwind CSS v3 + PostCSS, шрифт Nunito подключён через Google Fonts
- Тёмная игровая тема: CSS переменные (`--bg-base`, `--accent`, `--border` и др.)
- `LoginPage`: карточка с градиентным фоном, логотип 🚀, стилизованные поля и кнопка
- `AppHeader`: тёмный градиентный хедер, бренд слева, nav + logout справа
- `ChatPage`: пузыри сообщений (своё — справа/фиолетовый, чужое — слева/тёмный, бот — зелёный оттенок), статус с анимированной точкой
- `UserManagementPage`: тёмная таблица, цветные бейджи статуса (активен/неактивен)
- 107 frontend тестов — все зелёные

### M8 Список онлайн-пользователей (Presence Channel) ✅ (merged into develop, PR #36)
- Presence Channel вместо публичного: `echo.join('chat')`, события `here/joining/leaving`
- Сайдбар `OnlineUsers` справа от ленты: Lulu всегда первая (из `VITE_BOT_NAME`), боты из presence фильтруются, остальные по алфавиту
- `POST /api/broadcasting/auth` под `auth.jwt` middleware (дефолтный Laravel маршрут использует `web` и несовместим с JWT)
- `AuthenticateJwt` дополнен `auth()->setUser($user)` для совместимости с Laravel Broadcasting
- 7 новых тестов `OnlineUsers.test.jsx`, 3 новых `PresenceChannelAuthTest`, итого 119 frontend + 75 backend тестов — все зелёные
- Урок: при переходе с публичного канала на presence — `authEndpoint` и совместимость middleware становятся критичными; Broadcasting auth требует `Auth::user()`, а не только `$request->attributes`

### M12 Locale Switcher в хедере ✅ (merged into develop, PR #39)
- Переключатель RU/EN вынесен в переиспользуемый компонент `LangSwitcher`
- `AppHeader`: добавлен `LangSwitcher` — переключение языка доступно на всех авторизованных страницах
- `LoginPage`: инлайн-кнопки заменены на `<LangSwitcher />`
- 7 новых тестов (`LangSwitcher.test.jsx` + AppHeader), итого 126 frontend тестов — все зелёные

### M9 Chat Improvements ✅ (merged into develop, PR #42)
- Queue worker sleep 3s → 1s: задержка ответа бота сокращена
- Отправка сообщения по Enter (Shift+Enter = перенос строки)
- Переносы строк отображаются в пузырях (`white-space: pre-wrap`)
- Новые сообщения отображаются снизу (убран `flex-direction: column-reverse`)
- Автоскролл вниз при загрузке истории и новых сообщениях
- Бейдж "↓ новое сообщение" при получении сообщения в момент когда пользователь проскроллил вверх
- 131 frontend тест — все зелёные

### M13 Приватные чаты ✅ (merged into develop, PR #44)
- БД: таблицы `private_chats`, `private_chat_members`, `private_messages` с миграциями и retention (30 дней)
- Backend API: 6 эндпоинтов (создать/получить чат, история, отправить сообщение, добавить/удалить Lulu), авторизация через 403
- WebSocket: Private Channel `private-chat.{chatId}`, события `PrivateMessageSent`, `PrivateChatMembersUpdated`
- Lulu: `ProcessPrivateBotReply` job — всегда отвечает в чате из 2 участников, только по `@Lulu` при 3+
- UI: правый клик → создать чат, иконка 💬 в сайдбаре, всплывающее окно чата с историей
- UI: кнопки добавить/удалить Lulu в шапке окна, real-time синхронизация между участниками
- Автооткрытие окна при входящем сообщении (фоновый WS listener)
- Локализация RU/EN для всех строк приватного чата
- 26 новых backend тестов (101 всего) — все зелёные
- Урок: не вызывать `getPrivateChats()` после add/remove Lulu — создаёт новый объект `existingChats`, перезапускает WS-подписки и приводит к пропуску событий у второго участника; нужно обновлять только `chatsMeta` напрямую

### M10 Деплой
- Docker + `fly.toml` для Fly.io
- Vercel конфиг для React
- GitHub Actions CI/CD pipeline
