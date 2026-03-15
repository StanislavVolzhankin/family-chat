# Feature Plan — M5b: LLM Provider Abstraction

## Цель

Заменить прямой вызов OpenAI в `BotService` на абстракцию `LlmProvider`,
чтобы можно было переключаться между провайдерами (OpenAI, Gemini и др.) через конфиг.

Причина: OpenAI недоступен/ограничен, переходим на Google Gemini Flash (бесплатный tier).

---

## Архитектура

```
App\Modules\Bot\Contracts\LlmProvider  (interface)
    + chat(string $question): string

App\Modules\Bot\Providers\OpenAiProvider  implements LlmProvider
App\Modules\Bot\Providers\GeminiProvider  implements LlmProvider

BotService  получает LlmProvider через constructor DI
            убирается fetchReply() — логика уходит в провайдеры
```

Биндинг в `AppServiceProvider`:
```php
$this->app->bind(LlmProvider::class, fn() => match(config('bot.llm_provider')) {
    'openai' => new OpenAiProvider(),
    'gemini' => new GeminiProvider(),
    default  => new GeminiProvider(),
});
```

---

## Конфиг (config/bot.php)

```php
'llm_provider'  => env('LLM_PROVIDER', 'gemini'),
'gemini_key'    => env('GEMINI_API_KEY'),
'gemini_model'  => env('GEMINI_MODEL', 'gemini-1.5-flash'),
// openai остаётся для обратной совместимости
'openai_key'    => env('OPENAI_API_KEY'),
'openai_model'  => env('OPENAI_MODEL', 'gpt-4o-mini'),
```

---

## .env.example

```
LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
# OPENAI_API_KEY=   # оставить для справки
```

---

## Подзадачи

### M5b.1 — LlmProvider interface + провайдеры ✅
- Создать `App\Modules\Bot\Contracts\LlmProvider` с методом `chat(string $question): string`
- `OpenAiProvider` — перенести логику из `BotService::fetchReply()`
- `GeminiProvider` — реализация через Google Gemini API (HTTP REST или SDK)

### M5b.2 — BotService рефакторинг ✅
- Убрать `fetchReply()` из `BotService`
- Добавить `LlmProvider $llm` в конструктор через DI
- `reply()` вызывает `$this->llm->chat($question)`

### M5b.3 — AppServiceProvider биндинг ✅
- Зарегистрировать биндинг `LlmProvider` → конкретный провайдер по конфигу

### M5b.4 — config/bot.php + .env.example ✅
- Добавить `llm_provider`, `gemini_key`, `gemini_model`

### M5b.5 — Тесты ✅
- `BotServiceTest` — передавать mock `LlmProvider` через конструктор (вместо переопределения `fetchReply`)
- `GeminiProvider` — тест с заглушкой HTTP
- `OpenAiProvider` — аналогично

---

## Gemini API

Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

Запрос:
```json
{
  "contents": [{"parts": [{"text": "question"}]}],
  "systemInstruction": {"parts": [{"text": "system prompt"}]}
}
```

Авторизация: `?key=GEMINI_API_KEY` (query param) или заголовок.

Бесплатный tier: 15 RPM, 1500 RPD, 1M TPM — достаточно для семейного чата.
Регистрация: aistudio.google.com → Get API key.

---

## Ветка

`feature/m5b-llm-abstraction` (от `feature/m5-lulu-bot`)

---

## Порядок реализации

M5b.1 → M5b.2 → M5b.3 → M5b.4 → M5b.5 → Code Quality → QA → Reviewer → PR
