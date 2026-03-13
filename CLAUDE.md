# Family Chat — Claude Instructions

Это учебный проект семейного чата (PHP/Laravel + React + PostgreSQL) с multi-agent воркфлоу.

## Важные документы

@docs/PROJECT_OVERVIEW.md
@docs/ARCHITECTURE.md
@docs/WORKFLOWS/FEATURE_IMPLEMENTATION.md

## Роли агентов

@agents/README.md
@agents/ORCHESTRATOR.md
@agents/ARCHITECT.md
@agents/BACKEND_DEV.md
@agents/FRONTEND_DEV.md
@agents/DB_SCHEMA.md
@agents/QA.md
@agents/REVIEWER.md
@agents/DEVOPS.md

## Общие инструкции

- Всегда следуй описанному в docs/WORKFLOWS/FEATURE_IMPLEMENTATION.md процессу.
- Не коммить и не пушь изменения без явного разрешения человека.
- Для сложных фич сначала запрашивай план у Architect Agent.

## Правила из фидбека (обязательные)

### Тесты
- При завершении любой фичи или подфичи — запускать **все** тесты (`php artisan test`), не только новые.
- Цель: обнаружить регрессии от изменений в существующем коде.

### Workflow
- ВСЕГДА прогонять Code Quality → QA → Reviewer перед любым коммитом, включая хотфиксы.
- Никогда не пропускать эти шаги даже для "простых" правок.

### Нарушения процесса
- Если собираешься сделать изменения не в рамках текущей фичи (например, редактировать docs/WORKFLOWS/, agents/, или архитектурные файлы находясь на feature/* ветке) — ОСТАНОВИСЬ и сообщи пользователю ДО того как делать изменения.
- Предложи отдельную ветку/PR для таких изменений.

### Статус фичи
- После завершения каждого мини-милстоуна (M2.1, M2.2 и т.д.) — обновлять `docs/FEATURE_PLAN_M2.md` (или соответствующий план фичи), отмечая его как ✅ done.
- В `docs/PROJECT_JOURNAL.md` пишем только когда вся фича целиком завершена и смержена.

### Контекст
- Перед /clear всегда предлагай сохранить текущий прогресс в память.
