# AGENTS.md — expense-tracker

This file provides guidance for AI coding agents (e.g. GitHub Copilot, Claude, Codex) working on
Node.js and Express.js backend services. The conventions defined here are intended to be consistent
across all projects in this ecosystem.

---

## Tech Stack

| Concern | Choice |
| --- | --- |
| **Runtime** | Node.js (LTS) |
| **Framework** | Express.js |
| **Validation** | `express-validator` |
| **Environment config** | `dotenv` |
| **Database / ORM** | PostgreSQL via `sequelize` + `sequelize-cli` (migrations) |
| **Cache / ephemeral store** | Redis via `ioredis` |
| **Auth tokens** | `jsonwebtoken` (RS256), key pair loaded from disk, published via a JWKS endpoint |
| **Password hashing** | `bcryptjs` |
| **IDs** | `uuid` (token `jti`, etc.) |
| **Cookies** | `cookie-parser` |
| **Testing** | Jest + Supertest |
| **Process manager** | `nodemon` (dev), `node` (prod) |

---

## Repository Layout

```
src/
  index.js                        # Express app entry point — registers routes, middleware, starts server
  app/
    controllers/                     # Route controller functions (*-controller.js)
    middlewares/                  # Feature-level middleware arrays (*-middlewares.js)
    routes/                       # Express Router definitions (*-routes.js)
  configs/
    config.js                     # Environment-aware app config (reads from process.env)
    sequelize.js                  # Sequelize instance, connects using configs/config.js
    redis.js                      # ioredis client instance
  models/                         # sequelize.define(...) model definitions (<model>.js, exports { ModelName })
  migrations/                     # Sequelize-CLI migrations (<timestamp>-<description>.js)
  repositories/                   # Data-access functions per resource (*-repository.js)
  services/                       # External-integration classes and internal multi-step logic modules
  tests/
    setup.js                      # Creates the test DB and runs migrations (intended as Jest globalSetup)
    teardown.js                   # Drops the test DB (intended as Jest globalTeardown)
    setupFilesAfterEnv.js         # Per-test helpers (starts/stops the app, shared variables)
  utils/
    exceptions/
      custom-exceptions.js        # Custom error classes (BadRequest, NotFound, TokenExpired, …)
      exception-handler.js        # Global Express error handler + validation helpers
    serializers/                  # API response transformers, one file per resource (*-serializer.js)
    validators/                   # express-validator chains per feature (*-validators.js)
    keys.js                       # Loads JWT signing keys from disk, builds the JWKS
    responses.js                  # ApiResponse class + status constants
```

---

## Architecture Rules

1. **Thin controllers** — route controllers (`-controller.js`) contain only: extract data from `req`, build `ApiResponse`, send `res`. No business logic.
2. **Middleware arrays per route** — each route has a matching middleware array.
3. **Service classes for external integrations** — anything that calls a third-party API lives in `src/services/` as a class with a `handle()` method. Internal multi-step logic that has no
single natural entry point (e.g. signing/verifying JWTs) may instead be a plain function module — see [Service Classes](#service-classes) below for both patterns.
4. **Repositories own data access** — controllers, validators, and services never call Sequelize models directly. All reads/writes go through a `*-repository.js` function in `src/repositories/`, called via a namespace import (`const userRepository = require('.../user-repository')`), not destructured.
5. **Global error handler** — `exceptionHandler` from `utils/exceptions/exception-handler.js` is registered as the *last* middleware in `index.js`. controllers must call `next(error)` and never
catch errors silently.
6. **No secrets in code** — all configuration values come from `process.env` via `dotenv`. Never hardcode connection strings, API keys, or credentials.

---

## API Response Conventions

All route controllers must return a response built with `ApiResponse` (from `utils/responses.js`). This guarantees a consistent, predictable API contract for every client.

### Standard Response Structure

```json
{
  "status": "success",
  "message": "Current weather retrieved successfully.",
  "data": { ... }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `status` | `"success"` | `"error"` | Outcome of the operation |
| `message` | `string` | Human-readable summary |
| `data` | `object | array | null` | Response payload; always present (even when `null`) |

### Building Responses in controllers

```jsx
const { ApiResponse } = require('../../../utils/responses');

const mycontroller = async (req, res, next) => {
    try {
        // ... work ...
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Current weather retrieved successfully.';
        apiResponse.data = result;
        return res.status(200).json(apiResponse);
    } catch (error) {
        next(error);
    }
};
```

### HTTP Status Codes

| Code | When Used |
| --- | --- |
| `200 OK` | Successful read, update, delete |
| `201 Created` | Resource successfully created (POST) |
| `400 Bad Request` | Validation failure or malformed body |
| `401 Unauthorized` | Missing or invalid authentication token |
| `403 Forbidden` | Authenticated but lacks permission |
| `404 Not Found` | Resource does not exist |
| `500 Internal Server Error` | Unhandled exception |

### Validation Error Response

When validation fails, `data` contains a map of field names to error messages:

```json
{
  "status": "error",
  "message": "Request failed.",
  "data": {
    "latitude": "Latitude must be a decimal between -90 and 90.",
    "longitude": "Longitude must be a decimal between -180 and 180."
  }
}
```

---

## Global Exception Handling

All error-to-response mapping is centralised in `exceptionHandler` (from
`utils/exceptions/exception-handler.js`), registered as the last middleware in `index.js`.

**controllers and middleware must never send error responses directly.** Always call `next(error)` to
let the global handler produce a consistent response.

---

## Routing Conventions

- All routes are versioned under `/v1/<resource>/`.
- Each feature has a single router file in `src/app/routes/<feature>-routes.js`.
- Routers are mounted in `src/index.js`.
- Route paths use `kebab-case` for multi-word segments (e.g. `/current-weather`, `/weather-forecast`).
- **Exceptions to versioning:** well-known/discovery and infra endpoints are not versioned —
`jwks-routes.js` is mounted at `/.well-known` (serves `/.well-known/jwks.json`) and `/health` is a
plain unversioned liveness check defined directly in `index.js`.

**Route file pattern:**

```jsx
const express = require('express');
const { mycontroller } = require('../controllers/my-controller');
const { myMiddleware } = require('../middlewares/my-middlewares');

const router = express.Router();

router.post('/weather-forecast', myMiddleware, mycontroller);

module.exports = router;
```

**index.js mounting pattern:**

```jsx
app.use('/v1/weather-ai/', weatherRoutes);
```

---

## Service Classes

`src/services/` holds two kinds of modules, depending on the shape of the logic:

### 1. Class with `handle()` — third-party integrations

Use this when the service calls a third-party API (payments, Spotify, SMS, etc.) and has one
natural entry point.

```jsx
class MyIntegrationService {
    constructor(config) {
        this.config = config;
        this.client = axios.create({ baseURL: config.app.WEATHER_AI_BASE_URL });
    }

    async handle(payload) {
        try {
            const response = await this.client.post('/v1/current', payload);
            return response.data;
        } catch (error) {
            throw new BadRequest('Integration call failed.', { detail: error.message });
        }
    }
}

module.exports = { MyIntegrationService };
```

### 2. Plain function module — internal multi-operation logic

Use this when the logic is internal (no external API call) and offers several related operations
with no single `handle()` entry point — e.g. `src/services/token-service.js` signs/verifies access
and refresh tokens. Export named functions instead of a class:

```jsx
const signAccessToken = ({ sub, email, role }) => { /* ... */ };
const verifyAccessToken = (token) => { /* ... */ };

module.exports = { signAccessToken, verifyAccessToken };
```

Only reach for this pattern when a class + `handle()` would force unrelated operations behind one
method name — default to the class pattern otherwise.

---

## Sequelize Models

`src/models/<model>.js` defines the model directly with `sequelize.define(...)` and exports the
resulting model — **not** the `module.exports = (sequelize, DataTypes) => {...}` factory pattern
that `sequelize-cli` scaffolds by default.

```jsx
const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    jti: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'refresh_tokens'
});

module.exports = { RefreshToken };
```

Instance methods (e.g. `User.prototype.isValidPassword`) and hooks (e.g. `beforeCreate` password
hashing) are attached below the `sequelize.define(...)` call, in the same file.

### Indexes

All indexes are declared in the `indexes` array in the model options and **must include an explicit `name`**. Never rely on Sequelize's auto-generated index names — they are unpredictable and make migration rollbacks fragile.

Naming convention: `idx_<tableName>_<descriptor>`

```jsx
}, {
    tableName: 'likes',
    indexes: [
        {
            name: 'idx_likes_userId',
            fields: ['userId']
        },
        {
            name: 'idx_likes_entity',
            fields: ['entityId', 'entityType']
        },
        {
            name: 'unique_likes_userId_entityId_entityType',
            unique: true,
            fields: ['userId', 'entityId', 'entityType']
        }
    ]
});
```

Every index declared in the model must have a corresponding `addIndex` call in a dedicated migration (never added to the original `createTable` migration after it has already run). The `name` in the model and migration must be identical — this is what `removeIndex` targets during rollback.

Foreign key columns (`userId`, `entityId`, etc.) must always be indexed. Primary keys are indexed automatically by Postgres.

---

## Data Access — Repositories

`src/repositories/<resource>-repository.js` is the only place allowed to import a Sequelize model
and query it. Each file exports plain async functions (no class) named after the operation they
perform, and returns model instances or plain values directly (no `ApiResponse` wrapping — that
happens in the controller).

```jsx
const { User } = require('../models/user');

const registerUser = async ({ email, password, role = 'USER' }) => {
    return User.create({ email, password, role });
};

const findUserByEmail = async (email) => {
    return User.findOne({ where: { email } });
};

module.exports = { registerUser, findUserByEmail };
```

Callers require the whole repository module as a namespace object and call functions off of it —
never destructure individual functions out of a repository:

```jsx
const userRepository = require('../../repositories/user-repository');

const user = await userRepository.findUserByEmail(value);
const newUser = await userRepository.registerUser({ email, password });
```

Validators (e.g. an "email already registered" custom validator) may call repository functions
directly — they must not query models either.

---

## Database Transactions

Use Sequelize's **managed transaction** pattern for any operation that must be atomic — where partial completion would leave data in an inconsistent state.

### Managed transaction pattern

```js
const sequelize = require('../configs/sequelize');

await sequelize.transaction(async (t) => {
    await ModelA.destroy({ where: { ... }, transaction: t });
    await ModelB.bulkCreate(rows, { transaction: t });
});
```

Sequelize automatically commits when the callback resolves and automatically rolls back when the callback throws. Never use the unmanaged pattern (manual `t.commit()` / `t.rollback()`) — it requires explicit try-catch and is error-prone.

### Rules

- **Pass `transaction: t` to every Sequelize operation inside the callback.** An operation without it runs on a separate DB connection outside the transaction — atomicity is broken.
- **Use `bulkCreate` over looping `create`.** N individual `create` calls inside a transaction are N round-trips. `bulkCreate` collapses them into one `INSERT` statement regardless of row count.
- **Require `sequelize` in the repository file** that needs transactions: `const sequelize = require('../configs/sequelize')`.

### When to use transactions

| Operation | Needs transaction? | Reason |
| --- | --- | --- |
| Delete existing records then insert a replacement set | Yes | If insert fails after delete, data is permanently lost |
| Multi-step writes where any intermediate state is invalid | Yes | Atomicity — all succeed or none do |
| Single `create` / `update` / `destroy` | No | Already atomic at the DB level |
| Read-only queries | No | No state change |

### ACID in practice

- **Atomicity** — the entire callback succeeds or the database is unchanged
- **Consistency** — FK constraints are still enforced within the transaction
- **Isolation** — concurrent queries see either the old full state or the new full state, never a partial intermediate
- **Durability** — committed changes survive a crash or restart

---

## API Response Serializers

`src/utils/serializers/<resource>-serializer.js` transforms Sequelize model instances into
plain objects safe for the API response. Serializers decouple the API contract from the
internal model shape — field renames, type coercions, and field exclusions happen here and
nowhere else.

### Pattern

Plain function module — not a class. Named exports, one per representation:

```jsx
const serializeUser = (user) => ({
    userId: user.id,
    email: user.email,
    role: user.role,
    authMethod: user.googleSub ? 'google' : 'email',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const serializeAuthUser = (user) => ({
    userId: user.id,
    email: user.email,
    role: user.role,
});

module.exports = { serializeUser, serializeAuthUser };
```

### Naming convention

| Function | Purpose |
| --- | --- |
| `serialize<Resource>` | Full detail — used in single-resource GET responses |
| `serialize<Resource>Summary` | Condensed — used as individual items in list responses (add when needed) |
| `serialize<Resource>List` | Maps an array through `serialize<Resource>Summary` (add alongside Summary) |
| `serialize<Resource><Variant>` | Named contextual variants — e.g. `serializeAuthUser` for minimal auth token payloads |

### Rules

- **Never expose** internal columns: `password`, `googleSub`, `deletedAt`, or any hash/token field.
- **Rename fields**: `id` → `<resource>Id` (e.g. `userId`); derive computed fields where appropriate (e.g. `authMethod` from `googleSub`).
- **Parse DECIMAL columns** to float with a null guard: `value !== null ? parseFloat(value) : null`.
- **Controllers only** — serializers are called exclusively from controllers. Never call them from repositories, services, or middleware.

### Controller usage

Require the whole module as a namespace and call functions off it — do not destructure:

```jsx
const userSerializer = require('../../utils/serializers/user-serializer');

// Full profile response
apiResponse.data = userSerializer.serializeUser(user);

// Minimal shape for auth responses
apiResponse.data = { ...userSerializer.serializeAuthUser(user), accessToken, refreshToken };
```

---

## Authentication & Tokens

- JWTs are signed with **RS256** using a private/public key pair loaded from disk by
`utils/keys.js` (`loadPrivateKey`, `loadPublicKey`), paths configured via `JWT_PRIVATE_KEY_PATH` /
`JWT_PUBLIC_KEY_PATH`.
- The public key is exposed as a JWKS document (`utils/keys.js#buildJWKS`) so other services can
verify tokens independently.
- `src/services/token-service.js` is the only module that signs or verifies tokens
(`signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`). Every token gets
a unique `jti` (`uuid`). Access tokens carry `sub`/`email`/`role` and are verified against
`JWT_ISSUER`/`JWT_AUDIENCE`; refresh tokens only carry `sub`/`jti`.
- JWT verification errors are normalized into `TokenExpired` / `InvalidJsonWebToken` (from
`custom-exceptions.js`) rather than leaking the raw `jsonwebtoken` error names.
- Passwords are hashed with `bcryptjs` in a Sequelize `beforeCreate` hook on the `User` model —
never hash passwords in controllers, services, or repositories.

---

## Testing Guidelines

### Test types

| Type | Tool | What it tests | DB / Redis |
| --- | --- | --- | --- |
| **Integration** | Supertest + Jest | Full HTTP request → middleware → controller → DB → serialized response | Real Postgres test DB, real Redis |
| **Unit** | Jest | A single service, utility, or validator in isolation | Mocked |

Default to integration tests for anything that has an HTTP endpoint. Reach for unit tests only when testing a utility module (e.g. `pkceService`, a serializer) directly without HTTP overhead.

---

### Directory structure

```
src/tests/
  setup.js                              # globalSetup — creates test DB, runs migrations
  teardown.js                           # globalTeardown — drops test DB
  setupFilesAfterEnv.js                 # runs before each test file — mocks, app ref, cleanup
  refresh-token-controller.test.js
  logout-controller.test.js
  jwks-controller.test.js
  oauthentication-controllers.js.test.js
  ...
```

Test files live flat in `src/tests/` (not in resource subdirectories). Naming convention: `<action>-<resource>-controller.test.js`.

---

### Test infrastructure

#### `jest` config (`package.json`)

```json
"jest": {
    "testEnvironment": "node",
    "testTimeout": 10000,
    "globalSetup": "./src/tests/setup.js",
    "globalTeardown": "./src/tests/teardown.js",
    "setupFilesAfterEnv": ["./src/tests/setupFilesAfterEnv.js"]
}
```

| Key | Role |
| --- | --- |
| `globalSetup` | Runs once in a separate process before all test files. Creates the test DB and runs migrations. Has no access to `jest` globals. |
| `globalTeardown` | Runs once after all test files. Closes DB connections and drops the test DB. |
| `setupFilesAfterEnv` | Runs before each test file in the same Jest worker. Registers mocks and schedules connection cleanup. |

#### `setup.js`

Creates `POSTGRES_DATABASE_TEST` if it does not exist, then runs pending migrations:

```js
await execPromise('NODE_ENV=test npx sequelize-cli db:migrate');
```

`NODE_ENV=test` is mandatory — without it, the CLI reads `config.development` and migrates the wrong database.

#### `teardown.js`

Calls `pg_terminate_backend` before `DROP DATABASE`. Without this, Postgres refuses to drop a database with active connections.

---

### Mocking strategy

The auth-service uses real RS256 key pairs — `tokenService.signAccessToken` and `signRefreshToken` produce genuine RS256 JWTs in tests. Do not mock `token-service.js` globally.

What IS mocked:

| Module | Why mocked |
| --- | --- |
| `GoogleOAuthService.prototype.handle` | Calls real Google token endpoints. Mock per-test with `jest.spyOn` in `beforeEach`, restore in `afterEach`. |

`jest.mock` factory functions cannot reference outer-scope variables (Babel hoisting). Always `require` inside the factory:

```js
jest.mock('../services/some-service', () => ({
    method: jest.fn(() => {
        const dep = require('./dep');   // ✓ require inside factory
        return dep.something();
    }),
}));
```

---

### Token patterns

**Access token for `Authorization` header:**

```js
const { token: accessToken } = tokenService.signAccessToken({
    sub: TEST_USER_ID,
    email: 'user@test.local',
    role: 'USER',
});
// Use as: `Authorization: Bearer ${accessToken}`
```

**Refresh token cookie from a login response:**

```js
const loginRes = await request(app).post('/v1/auth/login').send(credentials);
const rawCookie = loginRes.headers['set-cookie'][0];
const cookieHeader = rawCookie.split(';')[0];   // 'refresh_token=eyJ...'
// Use as: `.set('Cookie', cookieHeader)`
```

**Expired token:**

```js
const expiredToken = jwt.sign(
    { sub: TEST_USER_ID, jti: 'some-jti' },
    loadPrivateKey(),
    { algorithm: 'RS256', expiresIn: -1 }
);
```

**Orphaned token (valid JWT, no DB record):**

```js
const { token: orphanedToken } = tokenService.signRefreshToken({ sub: TEST_USER_ID });
// Never stored in DB — triggers TokenReuseDetected when sent
```

**Token reuse ordering:** `revokeAllUserSessions(userId)` deletes ALL refresh tokens for a user. The token-reuse test must run AFTER the success test in the same file, or use an orphaned token to avoid invalidating the valid session.

---

### Test case structure

Every endpoint test file follows this layered structure, matching the middleware chain top-to-bottom:

```
describe('<Resource> API - POST /v1/auth/<path>', () => {

    beforeAll(async () => {
        // Create DB records, sign tokens
    });

    afterAll(async () => {
        // Clean up: delete RefreshToken records before User records
        // (userId FK is SET NULL on delete — clean in dependency order)
    });

    describe('Authentication', () => {
        // Missing header → 401
        // Malformed header → 401
        // Expired token → 401
        // Denylisted token → 401
    });

    describe('Validation', () => {
        // Missing required fields → 400
        // Invalid field values → 400
    });

    describe('Success', () => {
        // Happy path — assert full response shape and DB side effects
    });

    describe('Error propagation', () => {
        // Direct controller call with broken req → next(error) called
    });
});
```

---

### Determinism and isolation

- **Clean up in dependency order.** `RefreshToken.userId` has `onDelete: 'SET NULL'` — delete `RefreshToken` records before the `User` they reference, or the FK becomes null rather than deleted cleanly.
- **Use `{ force: true }` for paranoid models** — `User` has `paranoid: true`. Without `force: true`, `destroy` sets `deletedAt` but leaves the row, causing conflicts in the next test run.
- **Scope cleanup by a constant ID.** Use predictable UUID constants for `userId` values in tests and delete by that ID in `afterAll`. Never `truncate`.
- **Order success before reuse-detection tests.** The token-reuse path calls `revokeAllUserSessions`, which deletes all tokens for that user. Any test that needs a valid session must run before the reuse test.

---

### Coverage expectations

Every endpoint test file must cover all layers of the middleware chain:

| Layer | Minimum tests |
| --- | --- |
| Authentication | Missing header, malformed header, expired token |
| Validation | Missing + at least one invalid value per validated field |
| Success | One happy-path test asserting full response shape and DB side effects |
| Error propagation | One direct controller call with empty `req` |

---

### Jest commands

```bash
# Run all tests
npm test

# Run a single test file
npm test -- --testPathPattern=refresh-token

# Run with verbose output
npm test -- --verbose

# Run a single named test
npm test -- --testNamePattern="should return 401"
```

---

## Pull Requests & Commits

- Follow **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Keep commits small and focused on a single concern.
- Run `npm test` locally and confirm all tests pass before opening a PR.
- PR descriptions must include: what changed, why it changed, and any migration or environment
variable additions required.
- Never force-push to `main`.

---

## Useful Commands

```bash
# Start the server (production)
npm run start

# Start with hot reload (development)
npm run dev

# Run all tests
npm test

# Run pending Sequelize migrations (development DB)
npx sequelize-cli db:migrate

# Create a new migration
npx sequelize-cli migration:generate --name <description>
```

---

## Things Agents Must NOT Do

- Add business logic to route controllers — controllers orchestrate, not compute.
- Call `next(error)` and also send a response in the same branch — pick one.
- Use `res.send()` for JSON APIs — always use `res.status(code).json(apiResponse)`.
- Use `process.env` directly in controllers or services — read from `configs/config.js`.
- Skip `handleValidationErrors()` in a middleware array that contains `express-validator` chains.
- Catch errors silently (`catch (e) {}`) — always propagate via `next(error)` or rethrow.
- Import or query a Sequelize model (`src/models/`) from anywhere other than a `src/repositories/*-repository.js` file.
- Destructure functions out of a repository import (`const { findUserByEmail } = require(...)`) — always call through the namespace object (`userRepository.findUserByEmail(...)`).
- Define a Sequelize model using the `module.exports = (sequelize, DataTypes) => {...}` factory pattern — use `sequelize.define(...)` directly, as in `src/models/user.js` / `src/models/refresh-token.js`.
- Sign or verify a JWT anywhere other than `src/services/token-service.js`.
- Call a serializer from anywhere other than a controller — serializers live in `src/utils/serializers/` and must only be invoked inside `src/app/controllers/`.