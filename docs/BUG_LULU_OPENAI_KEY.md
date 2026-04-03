# Bug: Lulu не отвечает — OpenAI API key не доходит до queue контейнера

## Симптом

Пользователь пишет `@Lulu <текст>` в чате. Lulu отвечает:
> "Lulu временно недоступна. Попробуйте позже."

## Что уже выяснено

### 1. BotService работает корректно
- `detect()` находит `@Lulu` в сообщении ✅
- `dispatchIfNeeded()` вызывается из `MessageController::store()` ✅
- `ProcessBotReply` job диспатчится в очередь ✅
- Queue worker подхватывает job ✅

### 2. Lulu существует в БД
- Запущен `php artisan db:seed` — создана запись `users` с `is_bot=true` ✅

### 3. Причина падения job

`ProcessBotReply` падает с ошибкой:
```
OpenAI\Exceptions\RateLimitException: Request rate limit has been exceeded.
```

При проверке через curl из queue контейнера:
```bash
curl https://api.openai.com/v1/models -H "Authorization: Bearer <key>"
# → 401 Unauthorized
```

**Вывод: queue контейнер получает пустой или неверный OPENAI_API_KEY.**

### 4. Корневая причина

В `docker-compose.yml` у сервиса `queue` переменная задана так:
```yaml
- OPENAI_API_KEY=${OPENAI_API_KEY:-}
```

Docker Compose берёт `${OPENAI_API_KEY}` из **корневого `.env`** (рядом с `docker-compose.yml`), а не из `backend/.env`.

Корневого `.env` нет → переменная пустая → Laravel получает пустой ключ → OpenAI возвращает 401 → catch блок возвращает `unavailable_message`.

При этом `app` сервис **не имеет** `OPENAI_API_KEY` в `environment` секции вообще — он читает его напрямую из `backend/.env` через volume mount (`./backend:/var/www/html`). Поэтому в `app` контейнере конфиг правильный, а в `queue` — нет.

### 5. Что НЕ является проблемой
- Ключ в `backend/.env` валидный
- `config('bot.unavailable_message')` в `app` контейнере возвращает правильную строку
- OpenAI usage на platform.openai.com/usage нулевой (запросы не доходят)

## Предлагаемый фикс

Убрать `OPENAI_API_KEY`, `OPENAI_MODEL` и `BOT_NAME` из `environment` секции `queue` сервиса в `docker-compose.yml`. Laravel сам прочитает их из `backend/.env` через volume mount — точно так же как делает `app` сервис.

```yaml
# queue сервис — убрать эти строки:
- BOT_NAME=${BOT_NAME:-Lulu}
- OPENAI_API_KEY=${OPENAI_API_KEY:-}
- OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}
```

После изменения: `docker compose restart queue`

## Затронутые файлы

- `docker-compose.yml` — убрать Bot/OpenAI переменные из `environment` секции `queue`

## Дополнительно замеченное

`MessageSent` event в queue сервисе всё ещё обрабатывается как `ShouldBroadcast` (через очередь), что даёт задержку 2-5 сек. Это отдельный баг — см. `docs/FEATURE_PLAN_M9.md`.
