# Feature Plan — M12: Locale Switcher in Header

## Цель

Перенести переключатель языка (RU/EN) из `LoginPage` в `AppHeader`, чтобы он был доступен на всех страницах приложения.

---

## Требования

- Переключатель RU/EN отображается в хедере на всех авторизованных страницах (чат, управление пользователями)
- На странице логина переключатель остаётся (пользователь ещё не авторизован, хедера нет)
- Внешний вид переключателя одинаковый на всех страницах — как на `LoginPage` (кнопки RU / EN)
- Активный язык не кликабелен (disabled)

---

## Архитектурное решение

Переключатель уже реализован через `LangContext` (`useLang` хук).
Нужно только добавить те же кнопки в `AppHeader` — логика не меняется.

---

## Что нужно сделать

### Frontend

#### M12.1 — AppHeader: добавить переключатель языка

**`src/components/AppHeader.jsx`:**
- Импортировать `useLang` из `LangContext`
- Добавить кнопки RU / EN рядом с именем пользователя (между навигацией и Logout)
- Активный язык — `disabled`

**`src/components/AppHeader.module.css`:**
- Добавить стили для переключателя (аналогично `.langSwitch` в `LoginPage.module.css`)

#### M12.2 — LoginPage: убрать дублирование (опционально)

Переключатель на `LoginPage` можно вынести в отдельный компонент `LangSwitcher` и использовать в обоих местах — чтобы не дублировать разметку.

**`src/components/LangSwitcher.jsx`** (новый):
- Рендерит кнопки RU / EN через `useLang`

**`src/pages/LoginPage.jsx`:**
- Заменить инлайн-кнопки на `<LangSwitcher />`

**`src/components/AppHeader.jsx`:**
- Использовать `<LangSwitcher />`

---

## Порядок реализации

- **M12.1** ✅ Вынести переключатель в `LangSwitcher` компонент
- **M12.2** ✅ Использовать `LangSwitcher` в `LoginPage` и `AppHeader`
- ✅ QA + Reviewer — все 126 тестов прошли
- PR в develop — ожидает разрешения

---

## Затронутые файлы

### Frontend (изменяемые)
- `src/components/AppHeader.jsx` — добавить LangSwitcher
- `src/components/AppHeader.module.css` — стили переключателя
- `src/pages/LoginPage.jsx` — заменить инлайн-кнопки на LangSwitcher

### Frontend (новые)
- `src/components/LangSwitcher.jsx`
- `src/components/LangSwitcher.test.jsx`

---

## Тесты

### Frontend (Vitest)
- `LangSwitcher` — рендер кнопок RU/EN
- `LangSwitcher` — активный язык disabled
- `LangSwitcher` — клик меняет язык через LangContext
- `AppHeader` — содержит LangSwitcher
