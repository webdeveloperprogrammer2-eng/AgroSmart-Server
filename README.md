# AgroSmart.tj — Backend API

Бэкенд для фронтенда [AgroSmart.tj](https://github.com/webdeveloperprogrammer2-eng/AgroSmart.tj)
(React + Vite). Node.js + TypeScript + Express + PostgreSQL.

Фронтенд написан под **json-server**, поэтому этот бэкенд полностью повторяет
его поведение — во фронтенде **не нужно менять ни строки**.

---

## Запуск

```bash
npm install
psql -U postgres -c "CREATE DATABASE agrosmart;"
npm run seed                # тестовые данные (необязательно)
npm run dev                 # http://localhost:8000
```

Таблицы создаются сами при старте (`ensureSchema`), отдельный `npm run migrate`
нужен только если хочется применить схему без запуска сервера.

При старте видно, что именно поднялось:

```
🌐 CORS: all origins allowed (CORS_ORIGIN=*)
✅ Database connected
✅ Schema up to date
🚀 Server running on http://localhost:8000 (development)
📖 API docs at http://localhost:8000/docs
❤️  Health at http://localhost:8000/health

📦 Resources (6):
   • http://localhost:8000/users
   ...
```

Если порт занят — вместо стека ошибок будет понятное сообщение с подсказкой
`npx kill-port 8000`.

Порт **8000** — именно его ждёт фронтенд (`src/api/config.js`, `BASE_URL`).

Фронтенд запускается отдельно: `npm run dev` в его папке (порт 5173).

### Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер с авто-перезапуском (tsx watch) |
| `npm run migrate` | применяет `src/db/schema.sql` |
| `npm run seed` | **очищает** таблицы и заливает тестовые данные |
| `npm run build` | компиляция в `dist/` |
| `npm start` | запуск собранного `dist/server.js` |

---

## Эндпоинты

Шесть ресурсов, у каждого одинаковый набор операций:

| Ресурс | Что хранит | Где используется во фронтенде |
|---|---|---|
| `/users` | пользователи | `src/api/usersApi.js`, `context/UserContext.jsx` |
| `/mahsulot` | товары (бозор) | `src/api/mahsulotApi.js`, `pages/bozor`, `pages/profile` |
| `/zamin` | земля в аренду | `src/api/zaminApi.js`, `pages/zamin` |
| `/ZaminApteka` | агроаптека | `src/api/aptekaApi.js`, `pages/doruvori` |
| `/jobs` | заявки (муштарӣ) | `src/api/jobsApi.js`, `pages/mushtari` |
| `/notifications` | уведомления о заказах | `src/api/notificationsApi.js` |

> `/ZaminApteka` — с большой буквы, так его вызывает `aptekaApi.js`.
> В Postgres таблица называется `zamin_apteka` (соответствие — в `src/core/resources.ts`).

### Операции (одинаковы для всех шести)

| Метод | Путь | Ответ | Метод в `httpClient.js` |
|---|---|---|---|
| `GET` | `/<ресурс>` | `200` массив | `getAll()` |
| `GET` | `/<ресурс>/:id` | `200` объект / `404` | `getById(id)` |
| `POST` | `/<ресурс>` | `201` созданный объект | `create(data)` |
| `PUT` | `/<ресурс>/:id` | `200` объект целиком заменён | `update(id, data)` |
| `PATCH` | `/<ресурс>/:id` | `200` изменены только присланные поля | `patch(id, data)` |
| `DELETE` | `/<ресурс>/:id` | `200` `{}` | `remove(id)` |

Плюс служебные:

| Метод | Путь | Ответ |
|---|---|---|
| `GET` | `/docs` | **Swagger UI** — интерактивная документация, можно слать запросы прямо из браузера |
| `GET` | `/docs.json` | сама OpenAPI 3 спецификация |
| `GET` | `/` | список всех ресурсов со ссылками |
| `GET` | `/health` | `{"status":"ok","time":...}` |

Спецификация собирается из `src/core/resources.ts`, поэтому новый ресурс
появляется в Swagger автоматически — руками дописывать не нужно.

### Query-параметры для `GET /<ресурс>`

Фильтр по любому полю + сортировка (как в json-server):

```
GET /users?userPhone=%2B992900000003
GET /notifications?userId=3&_sort=id&_order=desc
GET /mahsulot?city=Dushanbe&category=Meva
GET /jobs?_sort=createdAt&_order=desc&_limit=10
```

Поддерживаются `_sort`, `_order` (`asc`/`desc`), `_limit`. Любой другой параметр
воспринимается как фильтр `поле = значение`.

Реально фронтендом используются два запроса:
- `GET /users?userPhone=...` — вход и проверка дубля при регистрации
- `GET /notifications?userId=...&_sort=id&_order=desc` — уведомления пользователя

Остальные страницы берут `getAll()` и фильтруют на клиенте
(`pages/profile/api.js`: `all.filter(i => String(i.userId) === String(userId))`).

---

## Структура данных

`id` — целое число с автоинкрементом, как у json-server. Остальные поля лежат
в JSONB и возвращаются вперемешку с `id`: `{ id, ...все поля }`.

**Почему JSONB, а не обычные колонки:** фронтенд шлёт для одного ресурса разные
наборы полей — форма профиля (`ProductFormModal.jsx`) и админка
(`adminSections.js`) отличаются, а старые записи хранят другие названия городов
и категорий (см. `CITY_ALIASES` в `lib/catalog.js`). С жёсткими колонками каждое
изменение формы требовало бы миграции.

Поля, которые шлёт фронтенд:

```jsonc
// users
{ "userName": "Ali", "userPhone": "+992...", "city": "Dushanbe",
  "age": 28, "password": "1234", "role": "user" }   // role: user | admin | superadmin

// mahsulot
{ "name": "...", "category": "Meva", "city": "Dushanbe", "img": "data:image/...",
  "description": "...", "price": 12, "leftovers": 500,
  "userId": 3, "farmerName": "...", "farmerPhone": "..." }

// zamin
{ "type": "zamin", "name": "...", "city": "Rudaki", "img": "...",
  "price": 5000, "leftovers": 2, "desc": "...",
  "userId": 3, "farmerName": "...", "farmerPhone": "..." }

// ZaminApteka
{ "name": "...", "category": "Zamin", "city": "...", "img": "...",
  "description": "...", "price": 150, "leftovers": 40,
  "userId": 3, "farmerName": "...", "farmerPhone": "..." }

// jobs
{ "companyName": "...", "productName": "...", "volume": "10 тонна",
  "description": "...", "userId": 3, "creatorName": "...",
  "creatorPhone": "...", "createdAt": "2026-..." }

// notifications
{ "userId": 3, "type": "order", "buyerId": 5, "buyerName": "...",
  "buyerPhone": "...", "address": "...",
  "items": [{ "name": "...", "price": 10, "quantity": 2, "total": 20 }],
  "total": 20, "createdAt": "2026-...", "read": false }
```

`img` — картинка целиком в base64 (`ImagePicker.jsx` → `fileToDataUrl`), поэтому
лимит тела запроса поднят до 15 МБ (`JSON_LIMIT` в `.env`).

---

## Структура проекта

```
src/
  config/
    env.ts              переменные окружения
    db.ts               пул Postgres + query/queryOne
  core/
    resources.ts        список ресурсов: путь → таблица
    repository.ts       весь CRUD (один класс на все ресурсы)
    resourceRouter.ts   роуты, разбор _sort/_order/_limit и фильтров
    error.ts            404 и центральный обработчик ошибок
    AppError.ts         ошибка с HTTP-кодом
    asyncHandler.ts     проброс ошибок из async-роутов
  db/
    schema.sql          таблицы и индексы
    migrate.ts          применяет schema.sql (npm run migrate)
    ensureSchema.ts     то же самое, но автоматически при каждом старте
    seed.ts             тестовые данные
  docs/
    openapi.ts          OpenAPI 3 спека для Swagger UI
  app.ts                сборка Express-приложения
  server.ts             запуск и graceful shutdown
```

Все шесть ресурсов обслуживает один `Repository` и один `createResourceRouter` —
чтобы добавить седьмой ресурс, достаточно строки в `src/core/resources.ts`
и таблицы в `schema.sql`.

---

## Известное ограничение: пароли

Пароли хранятся и отдаются **в открытом виде**. Это не выбор бэкенда, а требование
текущего фронтенда: `context/UserContext.jsx` сравнивает пароль на клиенте —

```js
const candidates = await usersApi.findAllByPhone(phone);
const found = candidates.find((u) => u.password === password);
```

То есть `GET /users` обязан вернуть поле `password`, иначе вход не работает.
Значит, **любой человек может открыть `http://localhost:8000/users` и увидеть все
пароли**. Для учебного проекта это терпимо, для публичного сайта — нет.

Чтобы починить, нужны правки и на бэкенде, и на фронтенде:

1. Бэкенд: `POST /auth/register` и `POST /auth/login`, хеширование (`bcryptjs`),
   выдача JWT; убрать `password` из ответов `/users`.
2. Фронтенд: `UserContext.jsx` вызывает эти два эндпоинта вместо сравнения
   пароля в браузере; токен кладётся в `sessionStorage` и уходит в заголовке
   `Authorization`.

Сейчас этого нет намеренно — иначе фронтенд перестал бы работать без переделки.
