# Expense Tracker API

A RESTful API for personal finance tracking, built with Node.js and Express. Users can record income and expense transactions, organize them into categories, set monthly budgets, and query rich summary reports — including per-category totals, multi-month trends, and flexible date-range breakdowns.

---

## Features

- **JWT authentication** — RS256-signed access and refresh tokens; refresh token rotation with reuse detection; Redis-backed denylist for instant logout revocation
- **Transactions** — create, read, update, and soft-delete income and expense records
- **Categories** — user-defined income and expense categories with defaults; conflict-safe update and delete
- **Budgets** — monthly spending limits per category; unique constraint prevents duplicate budget definitions
- **Summary reports** — three aggregation endpoints powered by raw SQL and serializer-level gap-filling:
  - **Monthly Summary** — per-category totals, transaction counts, and budget comparison for a given month
  - **Monthly Trends** — income vs. expense totals over N months (defaults to 6) with zero-filled gaps for quiet months
  - **Category Breakdown** — income and expense totals grouped by category for any custom date range (max 1 year)

---



## API Endpoints

All protected routes require an `Authorization: Bearer <access_token>` header. Public routes are mounted before the global authentication middleware.

### Authentication


| Method | Path                | Description                                                   |
| ------ | ------------------- | ------------------------------------------------------------- |
| `POST` | `/v1/auth/register` | Register a new user                                           |
| `POST` | `/v1/auth/login`    | Log in; returns access + refresh token pair                   |
| `POST` | `/v1/auth/refresh`  | Rotate refresh token; returns new access + refresh token pair |




### Users


| Method | Path               | Description                                                       |
| ------ | ------------------ | ----------------------------------------------------------------- |
| `GET`  | `/v1/users/me`     | Get the authenticated user's profile                              |
| `POST` | `/v1/users/logout` | Revoke the current session (adds refresh token to Redis denylist) |




### Categories


| Method   | Path                 | Description                                    |
| -------- | -------------------- | ---------------------------------------------- |
| `GET`    | `/v1/categories/`    | List all categories for the authenticated user |
| `POST`   | `/v1/categories/`    | Create a new category                          |
| `PATCH`  | `/v1/categories/:id` | Update a category's name or type               |
| `DELETE` | `/v1/categories/:id` | Soft-delete a category                         |




### Transactions


| Method   | Path                   | Description                        |
| -------- | ---------------------- | ---------------------------------- |
| `POST`   | `/v1/transactions/`    | Record a new transaction           |
| `GET`    | `/v1/transactions/`    | List all transactions (filterable) |
| `GET`    | `/v1/transactions/:id` | Get a single transaction           |
| `PATCH`  | `/v1/transactions/:id` | Update a transaction               |
| `DELETE` | `/v1/transactions/:id` | Soft-delete a transaction          |




### Budgets


| Method   | Path              | Description                                 |
| -------- | ----------------- | ------------------------------------------- |
| `GET`    | `/v1/budgets/`    | List all budgets for the authenticated user |
| `POST`   | `/v1/budgets/`    | Create a monthly budget for a category      |
| `PATCH`  | `/v1/budgets/:id` | Update a budget's amount                    |
| `DELETE` | `/v1/budgets/:id` | Delete a budget                             |




### Summary Reports


| Method | Path                     | Query Params                                           | Description                                             |
| ------ | ------------------------ | ------------------------------------------------------ | ------------------------------------------------------- |
| `GET`  | `/v1/summary/monthly`    | `month`, `year` (optional — defaults to current month) | Per-category totals and budget status for a given month |
| `GET`  | `/v1/summary/trends`     | `months` (optional — defaults to `6`)                  | Income vs. expense trend over N months                  |
| `GET`  | `/v1/summary/categories` | `startDate`, `endDate` (required, ISO 8601)            | Category breakdown for a custom date range              |


---



## Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 15+
- Redis 7+
- An RS256 key pair (private key for signing, public key for verification — see [Local Setup](#local-setup))

---



## Tech Stack


| Concern                | Choice                             |
| ---------------------- | ---------------------------------- |
| Runtime                | Node.js (LTS)                      |
| Framework              | Express.js ^5.2                    |
| ORM                    | Sequelize ^6.37 + sequelize-cli    |
| Database               | PostgreSQL                         |
| Cache / token denylist | Redis via ioredis ^5.11            |
| Authentication         | jsonwebtoken ^9 (RS256)            |
| Password hashing       | bcryptjs ^3                        |
| Validation             | express-validator ^7.3             |
| ID generation          | uuid ^14                           |
| Cookies                | cookie-parser ^1.4                 |
| Security headers       | helmet ^8.3                        |
| CORS                   | cors ^2.8                          |
| Environment config     | dotenv ^17.4                       |
| Testing                | Jest + Supertest + @faker-js/faker |
| Dev server             | nodemon                            |


---



## Environment Variables

Create a `.env` file at the project root. All variables are required unless a default is noted.

```env
# Server
NODE_ENV=development
PORT=3000

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USERNAME=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DATABASE=expense_tracker_dev
POSTGRES_DATABASE_TEST=expense_tracker_test

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT key paths (RS256)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Token lifetimes
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

---



## Local Setup



### 1. Install dependencies

```bash
npm install
```



### 2. Generate an RS256 key pair

The API signs JWTs with RS256 — a private key signs, a public key verifies. Generate a pair and place it at the paths configured in `.env`:

```bash
mkdir -p keys
openssl genpkey -algorithm RSA -out keys/private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in keys/private.pem -out keys/public.pem
```



### 3. Create the database

```bash
npx sequelize-cli db:create
```



### 4. Run migrations

```bash
npm run migrate
```



### 5. Start the development server

```bash
npm run dev
```

The server listens on `http://localhost:$PORT` (default: `3000`). A `GET /health` liveness check is available without authentication.

---



## Running Tests

Tests use a dedicated PostgreSQL database (`POSTGRES_DATABASE_TEST`). Jest's `globalSetup` creates it and runs all pending migrations automatically; `globalTeardown` drops it when the suite finishes.

```bash
# Run the full test suite
npm test

# Run a single test file
npm test -- --testPathPattern=summary/monthly

# Run with verbose output
npm test -- --verbose
```

Integration tests hit a real PostgreSQL database and a real Redis instance. No database mocks are used — this keeps test behaviour faithful to production query semantics, including index usage, ENUM ordering, and `BETWEEN` date range behaviour.

---



## Database Migrations

```bash
# Run pending migrations (development database)
npm run migrate

# Generate a new migration file
npx sequelize-cli migration:generate --name <description>
```

Migrations are in `src/migrations/` and follow the pattern `<timestamp>-<description>.js`. Every index declared in a model's `indexes` array has a corresponding `addIndex` call in the migration that created the table.

---



## How the Aggregation Queries Work

The three summary endpoints are the most technically interesting part of this codebase. They aren't just simple SELECT queries — each one makes deliberate decisions about where to compute things, how many database round-trips to make, and how to handle the case where no data exists for a given period.

### The core challenge: SQL aggregation on financial data

When a user asks "what did I spend in June?", the straightforward approach is to query every transaction in that month and total them up in application code. That works, but it means transferring potentially hundreds of rows just to produce a handful of numbers. A better approach is to let the database do the heavy lifting — use `GROUP BY` with `SUM()` and `COUNT()` to return one row per category, with totals already computed.

All three summary endpoints use this pattern:

```sql
SELECT
    t."categoryId",
    c.name        AS "categoryName",
    c.type        AS "categoryType",
    SUM(t.amount) AS "total",
    COUNT(t.id)   AS "count"
FROM transactions t
JOIN categories c ON t."categoryId" = c.id
WHERE t."userId"    = :userId
  AND t.date        BETWEEN :startDate AND :endDate
  AND t."deletedAt" IS NULL
GROUP BY t."categoryId", c.name, c.type
ORDER BY c.type, c.name
```

A few things worth unpacking here:

**Parameterized queries prevent SQL injection.** Every user-supplied value — `userId`, `startDate`, `endDate` — is passed via Sequelize's `replacements` object, never interpolated into the SQL string. The database driver handles escaping. This is non-negotiable for any query that touches user input.

`AND t."deletedAt" IS NULL` **respects soft deletes.** Transactions aren't physically removed when deleted — instead a `deletedAt` timestamp is set (Sequelize's `paranoid: true` mode). If this filter were omitted, deleted transactions would silently inflate the user's totals. Every summary query explicitly excludes them.

`ORDER BY c.type, c.name` sorts income before expense. PostgreSQL sorts ENUM values by their declaration order, and `'income'` is declared before `'expense'` in the categories table — so this sort is stable and consistent without any application-level sorting.

`numeric` **columns arrive as strings in Node.js.** PostgreSQL's `DECIMAL`/`numeric` type preserves arbitrary precision, but the Node.js `pg` driver serializes these as strings to avoid floating-point loss. Every serializer wraps raw totals in `parseFloat()` before doing arithmetic. Forgetting this produces silent string concatenation bugs (e.g. `"100" + "50" === "10050"` instead of `150`).

---



### Monthly Summary: joining budget data

The Monthly Summary endpoint answers "how did I do against my budget this month?" It returns per-category totals plus a `budget` object for any category that has a spending limit set.

The query design here has two separate reads:

1. One aggregation query that groups transactions by category for the month
2. One `findAll` via the Budget model that fetches all budgets for that user/month/year

These run sequentially rather than as a single JOIN, because budgets are Sequelize model instances that carry useful ORM methods, while the aggregation result is a raw SQL result set. Keeping them separate lets the serializer cross-reference them by `categoryId` without fighting the impedance mismatch.

The budget comparison logic lives entirely in the serializer. Given a category row and a budget:

```js
const limit = parseFloat(budget.amount);
const remaining = parseFloat((limit - total).toFixed(2));
const percentage = parseFloat(((total / limit) * 100).toFixed(1));
budgetInfo = { limit, remaining, percentage };
```

Rounding to two decimal places for currency and one decimal place for percentages happens here, not in SQL. This is a deliberate choice — SQL's `ROUND()` function would work, but keeping the rounding logic in JavaScript means it can be changed in one place without touching migrations.

---



### Monthly Trends: one query, gap-filling in the serializer

The Trends endpoint returns income vs. expense totals for each of the last N months. The interesting design decision is how to handle months where a user had no transactions — should the database return a row with zeros, or should the application fill in the blanks?

The database can't easily return a zero row for a period that has no transactions. You'd need a date-series generator (PostgreSQL's `generate_series`) or a calendar table — possible, but complex. The simpler approach is to let the application own the calendar logic:

```js
const periods = [];
const now = new Date();
for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({ month: d.getMonth() + 1, year: d.getFullYear() });
}
```

This builds the authoritative list of periods *before* the query runs. JavaScript's `Date` constructor handles year rollovers automatically — `new Date(2027, -1, 1)` resolves to December 2026 without any special-casing.

The repository then issues a **single query** covering the full date range from the earliest to the latest period. It doesn't issue N queries — one per month — because that would create N round-trips to the database, and the latency would grow linearly with the number of months requested.

The serializer then maps over the pre-built `periods` array and looks up each month's row from the result:

```js
const incomeRow = rows.find((r) => r.month === month && r.year === year && r.type === 'income');
const expenseRow = rows.find((r) => r.month === month && r.year === year && r.type === 'expense');
const income = parseFloat(parseFloat(incomeRow ? incomeRow.total : 0).toFixed(2));
const expenses = parseFloat(parseFloat(expenseRow ? expenseRow.total : 0).toFixed(2));
```

If no row exists for a given month, the ternary defaults to `0`. This gap-filling is O(periods × rows) — fast in practice because both are small.

`EXTRACT(MONTH FROM t.date)::int` pulls the month number out of the transaction date. `EXTRACT()` returns `double precision` in PostgreSQL — the `::int` cast is defensive clarity: it makes the intent explicit and ensures the JavaScript comparison `r.month === month` works without type coercion surprises.

---



### Category Breakdown: cross-field validation

The Category Breakdown endpoint accepts a user-supplied `startDate` and `endDate`. Two fields, but they have a relationship: the end date must come after the start date, and the range can't exceed one year. This kind of cross-field validation can't be expressed with a simple per-field rule — it requires access to both fields at once.

`express-validator` supports this through the `.custom()` method, which receives the current field's value and the full `req` object:

```js
query('endDate')
    .custom((endDate, { req }) => {
        const startDate = req.query.startDate;
        if (!startDate) return true;  // let the startDate validator report this error
        if (new Date(endDate) <= new Date(startDate))
            throw new Error('End date must be after start date.');
        const diffMs = new Date(endDate) - new Date(startDate);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 365)
            throw new Error('Date range cannot exceed 1 year.');
        return true;
    })
```

The one-year cap prevents accidentally expensive queries on large transaction histories. The underlying SQL query scales linearly with the number of rows in the date range — unbounded ranges are a denial-of-service risk for multi-tenant systems.

---



### Indexes: making the queries fast

Raw SQL bypasses Sequelize's automatic query optimisation. The developer is responsible for ensuring the right indexes exist. Two composite indexes were added in the transaction migration to serve the summary queries efficiently:

`idx_transactions_userId_date` — covers all three summary queries. Every summary query filters by `userId` first and `date` second. A composite index on `(userId, date)` lets PostgreSQL jump directly to that user's transactions within the target date range, without scanning unrelated rows.

`idx_transactions_userId_categoryId` — serves queries that filter by both user and category. The `JOIN` on `categoryId` benefits from this being indexed.

The budget table has a unique constraint — `uq_budgets_userId_categoryId_month_year` — that prevents a user from creating two budgets for the same category in the same month. This is enforced at the database level, not just in application validation, so it holds even under concurrent requests.

---



## Architecture Highlights

**Thin controllers.** Route controllers do exactly three things: extract data from `req`, call the repository and serializer, build an `ApiResponse`, and send it. No business logic, no SQL, no conditional branching beyond the `try/catch`. This keeps controllers readable at a glance and makes the actual logic easy to test in isolation.

**Repository pattern.** All Sequelize model access goes through `src/repositories/`. Controllers, validators, and services never import a model directly. This creates a clean seam — if the database or ORM ever needs to change, the change is contained to the repository layer. Repositories are always called via the namespace import (`summaryRepository.getMonthlySummary(...)`) to make the call site self-documenting.

**Global authentication middleware.** `isUserAuthenticated` is mounted once at the app level, before all protected route groups. It's not wired into individual middleware arrays. This means it's impossible to accidentally expose a protected route — any route mounted after the guard inherits protection automatically.

**Global exception handler.** `exceptionHandler` is the last middleware registered in `index.js`. Controllers call `next(error)` and never send error responses themselves. Every custom exception class (`NotFound`, `PermissionDenied`, `Conflict`, etc.) sets a `statusCode` property that the handler maps to the right HTTP status. New exception types require a matching `instanceof` block in the handler — the pattern is enforced by convention rather than by type-checking.

**Serializers transform, controllers send.** Sequelize instances carry internal fields (`deletedAt`, `passwordHash`, raw `id`) that should never reach the API response. Serializers are the boundary layer — they rename `id` to `<resource>Id`, parse `DECIMAL` columns to floats, and strip any field that isn't part of the public contract. Serializers are called only from controllers, never from repositories or services.

**Refresh token rotation with reuse detection.** Every `/v1/auth/refresh` call issues a new access/refresh token pair and invalidates the old refresh token via Redis. If a refresh token is presented a second time — which would happen if an attacker exfiltrated a valid token — the service detects the reuse and revokes *all* of that user's sessions simultaneously, forcing a fresh login.

---



## Scripts Reference


| Script              | Command                | Description                                     |
| ------------------- | ---------------------- | ----------------------------------------------- |
| Start (production)  | `npm start`            | Run with `node`                                 |
| Start (development) | `npm run dev`          | Run with `nodemon` (hot reload)                 |
| Test                | `npm test`             | Run Jest suite (creates and tears down test DB) |
| Migrate             | `npm run migrate`      | Run pending Sequelize migrations                |
| Lint                | `npm run lint`         | ESLint check                                    |
| Lint (fix)          | `npm run lint:fix`     | ESLint auto-fix                                 |
| Format check        | `npm run format:check` | Prettier check                                  |


