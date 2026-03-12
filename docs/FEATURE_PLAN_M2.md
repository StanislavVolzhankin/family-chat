# Feature Plan — M2: User Management

## Цель

Родитель может создавать аккаунты детей, просматривать список пользователей, менять пароль и деактивировать пользователя.
Дети не имеют доступа к этому разделу.

---

## Что уже есть (после M1)

### Backend
- `App\Modules\Auth\Models\User` — модель с полями: `id`, `username`, `password_hash`, `role`, `is_active`
- `POST /api/auth/login` — работает, возвращает JWT + user (role включён)
- `backend/app/Modules/Auth/Routes/auth.php` — роутинг Auth-модуля

### Frontend
- `utils/auth.js` — `getUser()` возвращает объект user с полем `role`
- `utils/api.js` — функция `login()`, паттерн для новых API-функций
- `App.jsx` — роут `/users` уже объявлен как PrivateRoute → UserManagementPage
- `UserManagementPage.jsx` — заглушка TODO
- `locales/ru.json` / `en.json` — ключи `users.title`, `users.create` уже есть

---

## Что нужно сделать

### Backend

#### 1. UserController
Новый контроллер `App\Modules\Auth\Controllers\UserController`:
- `POST /api/users` — создание пользователя-ребёнка
  - Тело: `{ username, password }`
  - Валидация: username уникален, password мин. 6 символов
  - Role жёстко = `child`, `is_active` = true
  - Ответ: `{ id, username, role, is_active }`
- `GET /api/users` — список всех пользователей
  - Ответ: массив `[{ id, username, role, is_active }]`
- `PATCH /api/users/{id}` — обновление пользователя
  - Тело: `{ password? , is_active? }` (оба опциональны)
  - Нельзя деактивировать самого себя
  - Нельзя менять пользователя с ролью parent

#### 2. UserService
`App\Modules\Auth\Services\UserService`:
- `createChild(username, password)` — создаёт пользователя с role=child
- `listUsers()` — возвращает всех пользователей
- `updateUser(id, data)` — меняет пароль и/или is_active

#### 3. Middleware авторизации
- Middleware для проверки JWT-токена (применяется ко всем `/api/users` роутам)
- Middleware для проверки роли parent (`ParentOnly`)
- Все три эндпоинта `/api/users` защищены обоими middleware

#### 4. Роутинг
В `auth.php` добавить группу:
```
Route::middleware(['auth.jwt', 'role.parent'])->group(function () {
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users', [UserController::class, 'index']);
    Route::patch('/users/{id}', [UserController::class, 'update']);
});
```

#### 5. Ошибки (коды)
- `username_taken` — логин занят
- `user_not_found` — пользователь не найден
- `cannot_modify_parent` — нельзя редактировать родителя
- `cannot_deactivate_self` — нельзя деактивировать себя

---

### Frontend

#### 1. api.js — новые функции
```js
getUsers()           // GET /api/users
createUser(username, password)  // POST /api/users
updateUser(id, data)            // PATCH /api/users/{id}
```
Все запросы с заголовком `Authorization: Bearer <token>`.

#### 2. UserManagementPage.jsx
Заменить заглушку на рабочий компонент:
- Список пользователей (таблица: username, роль, статус активности, кнопки действий)
- Форма создания нового пользователя (username + password)
- Кнопка смены пароля (инлайн-форма или модалка)
- Кнопка деактивации / активации

#### 3. Защита роута по роли
В `App.jsx` добавить `ParentRoute` — редирект на `/chat` если `user.role !== 'parent'`:
```jsx
function ParentRoute({ element }) {
  const user = getUser()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (user?.role !== 'parent') return <Navigate to="/chat" replace />
  return element
}
```
Применить к роуту `/users`.

#### 4. Локализация
Добавить в `ru.json` и `en.json`:
```json
"users": {
  "title": "...",
  "create": "...",
  "username": "...",
  "password": "...",
  "role": "...",
  "active": "...",
  "inactive": "...",
  "deactivate": "...",
  "activate": "...",
  "change_password": "...",
  "errors": {
    "username_taken": "...",
    "user_not_found": "...",
    "cannot_modify_parent": "...",
    "cannot_deactivate_self": "..."
  }
}
```

---

### Тесты

#### Backend (Feature-тесты, Laravel)
- `POST /api/users` — успех, дублирующийся username, неверные данные
- `POST /api/users` — доступ запрещён для child-токена
- `GET /api/users` — возвращает список (только для parent)
- `PATCH /api/users/{id}` — смена пароля, деактивация
- `PATCH /api/users/{id}` — попытка изменить parent, деактивировать себя

#### Frontend (Vitest)
- `api.js` — тесты для `getUsers`, `createUser`, `updateUser`
- `UserManagementPage` — рендер списка, форма создания, кнопки
- `ParentRoute` — редирект child-пользователя на `/chat`

---

## Порядок реализации

1. **Backend**: UserService → UserController → Middleware → Роуты → Тесты
2. **Frontend**: api.js (функции) → ParentRoute → UserManagementPage → Локализация → Тесты
3. **QA**: прогон тест-кейсов
4. **Reviewer**: финальное ревью
5. **Commit + PR** в develop

---

## Файлы которые затрагиваем

### Backend (новые)
- `app/Modules/Auth/Controllers/UserController.php`
- `app/Modules/Auth/Services/UserService.php`
- `app/Http/Middleware/AuthenticateJwt.php`
- `app/Http/Middleware/RequireParentRole.php`
- `tests/Feature/Users/UserManagementTest.php`

### Backend (изменяем)
- `app/Modules/Auth/Routes/auth.php` — добавляем роуты /users
- `bootstrap/app.php` или `Kernel.php` — регистрируем middleware

### Frontend (новые)
- `src/pages/UserManagementPage.module.css`
- `src/pages/UserManagementPage.test.jsx`
- `src/utils/api.test.js` — дополняем тесты

### Frontend (изменяем)
- `src/utils/api.js` — добавляем getUsers, createUser, updateUser
- `src/App.jsx` — добавляем ParentRoute
- `src/pages/UserManagementPage.jsx` — реализуем компонент
- `src/locales/ru.json` — добавляем ключи
- `src/locales/en.json` — добавляем ключи
