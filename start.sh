#!/usr/bin/env bash
# Family Chat — запуск всех сервисов
# Backend (Docker): app:8000, reverb:8080, db:5432, queue, scheduler
# Frontend (Vite):  localhost:5173

set -e
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Backend: docker compose up -d"
docker compose -f "$REPO/docker-compose.yml" up -d

echo "==> Frontend: npm run dev"
cd "$REPO/frontend" && npm run dev
