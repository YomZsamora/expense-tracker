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
| **Testing** | Jest + Supertest + `@faker-js/faker` |
| **Process manager** | `nodemon` (dev), `node` (prod) |

---

## Repository Layout

```
src/
  index.js                        # Express app entry point — registers routes, middleware, starts server
  app/
    controllers/                  # Route controller functions (*-controller.js)
    middlewares/                  # Feature-level middleware arrays (*-middlewares.js)
    routes/                       # Express Router definitions (*-routes.js)
  configs/
    config.js                     # Environment-aware app config (reads from process.env)
    sequelize.js                  # Sequelize instance, connects using configs/config.js
    redis.js                      # ioredis client instance
  models/                         # sequelize.define(...) model definitions (<model>.js, exports { ModelName })
    associations.js               # All Sequelize associations — required once in index.js
  migrations/                     # Sequelize-CLI migrations (<timestamp>-<description>.js)
  repositories/                   # Data-access functions per resource (*-repository.js)
  services/                       # External-integration classes and internal multi-step logic modules
  tests/
    setup.js                      # Creates the test DB and runs migrations (intended as Jest globalSetup)
    teardown.js                   # Drops the test DB (intended as Jest globalTeardown)
    setupFilesAfterEnv.js         # Per-test teardown — closes sequelize and redis connections
    authentication/               # Auth endpoint tests
    categories/                   # Category endpoint tests
    transactions/                 # Transaction endpoint tests
  utils/
    exceptions/
      custom-exceptions.js        # Custom error classes (BadRequest, NotFound, Conflict, …)
      exception-handler.js        # Global Express error handler + handleBadRequests helper
    serializers/                  # API response transformers, one file per resource (*-serializer.js)
    validators/                   # express-validator chains + async middleware validators (*-validators.js)
    keys.js                       # Loads JWT signing keys from disk, builds the JWKS
    responses.js                  # ApiResponse class + status constants
```

---

## Architecture Rules

1. **Thin controllers** — route controllers (`-controller.js`) contain only: extract data from `req`, build `ApiResponse`, send `res`. No business logic.
2. **Middleware arrays per route** — each route has a matching middleware array in `*-middlewares.js`.
3. **Service classes for external integrations** — anything that calls a third-party API lives in `src/services/` as a class with a `handle()` method. Internal multi-step logic that has no single natural entry point (e.g. signing/verifying JWTs) may instead be a plain function module — see [Service Classes](#service-classes) below for both patterns.
4. **Repositories own data access** — controllers, validators, and services never call Sequelize models directly. All reads/writes go through a `*-repository.js` function in `src/repositories/`, called via a namespace import (`const categoryRepository = require('.../category-repository')`), not destructured.
5. **Global error handler** — `exceptionHandler` from `utils/exceptions/exception-handler.js` is registered as the *last* middleware in `index.js`. Controllers must call `next(error)` and never catch errors silently.
6. **No secrets in code** — all configuration values come from `process.env` via `dotenv`. Never hardcode connection strings, API keys, or credentials.
7. **Global authentication middleware** — `isUserAuthenticated` is mounted at the app level (`app.use(isUserAuthenticated)`) before all protected route groups, not wired into individual middleware arrays. Public routes (e.g. `/v1/auth/`) are mounted before this middleware.

---

## API Response Conventions

All route controllers must return a response built with `ApiResponse` (from `utils/responses.js`). This guarantees a consistent, predictable API contract for every client.

### Standard Response Structure

```json
{
  "status": "success",
  "message": "Categories retrieved successfully.",
  "data": { ... }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `status` | `"success"` \| `"error"` | Outcome of the operation |
| `message` | `string` | Human-readable summary |
| `data` | `object \| array \| null` | Response payload; always present (even when `null`) |

### Building Responses in Controllers

```js
const { ApiResponse } = require('../../../utils/responses');

const myController = async (req, res, next) => {
    try {
        // ... work ...
        const apiResponse = new ApiResponse();
        apiResponse.message = 'Categories retrieved successfully.';
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
| `200 OK` | Successful read or update |
| `201 Created` | Resource successfully created (POST) |
| `204 No Content` | Successful delete (no body returned) |
| `400 Bad Request` | Validation failure or malformed body |
| `401 Unauthorized` | Missing, invalid, or expired authentication token |
| `403 Forbidden` | Authenticated but lacks permission (wrong owner, insufficient role) |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Request conflicts with existing state (e.g. duplicate category name+type) |
| `422 Unprocessable Entity` | Well-formed request that fails business logic validation |
| `500 Internal Server Error` | Unhandled exception |

### Validation Error Response

When validation fails, `data` contains a map of field names to error messages:

```json
{
  "status": "error",
  "message": "Error occurred while creating category.",
  "data": {
    "name": "Name is required.",
    "type": "Type must be income or expense."
  }
}
```

---

## Custom Exceptions

All custom error classes live in `src/utils/exceptions/custom-exceptions.js`. Every class sets `this.statusCode` and `this.name` so `exceptionHandler` can map them to the right HTTP response.

| Class | Status | When to throw |
| --- | --- | --- |
| `BadRequest` | 400 | Validation failure not caught by express-validator |
| `NotAuthenticated` | 401 | Missing or invalid auth credentials |
| `TokenExpired` | 401 | JWT has expired |
| `InvalidJsonWebToken` | 401 | JWT is malformed or signature is invalid |
| `TokenReuseDetected` | 401 | Refresh token reuse detected — all sessions revoked |
| `PermissionDenied` | 403 | Authenticated but wrong owner or insufficient role |
| `NotFound` | 404 | Resource does not exist |
| `Conflict` | 409 | Request conflicts with existing state (duplicate, locked resource) |
| `UnprocessedEntity` | 422 | Business-logic rejection on a well-formed request |

**Rule:** whenever a new exception class is added to `custom-exceptions.js`, a matching `instanceof` block must also be added to `exceptionHandler` in `exception-handler.js`.

---

## Global Exception Handling

All error-to-response mapping is centralised in `exceptionHandler` (`utils/exceptions/exception-handler.js`), registered as the last middleware in `index.js`.

**Controllers and middleware must never send error responses directly.** Always call `next(error)`.

The `handleBadRequests(errorMessage)` helper from `exception-handler.js` is placed inside middleware arrays after `express-validator` chains to collect and format validation errors:

```js
const createCategoryMiddleware = [
    nameFieldValidator,
    typeFieldValidator,
    handleBadRequests('Error occurred while creating category.'),  // runs after validators
    categoryUniqueValidator,                                        // async DB check runs after
];
```

---

## Routing Conventions

- All routes are versioned under `/v1/<resource>/`.
- Each feature has a single router file in `src/app/routes/<feature>-routes.js`.
- Routers are mounted in `src/index.js`.
- Route paths use `kebab-case` for multi-word segments.
- **Public routes** are mounted before `app.use(isUserAuthenticated)`. **Protected routes** are mounted after it.
- **Exceptions to versioning:** `/health` is a plain unversioned liveness check defined directly in `index.js`.

**Route file pattern:**

```js
const express = require('express');
const { myController } = require('../controllers/my-controller');
const { myMiddleware } = require('../middlewares/my-middlewares');

const router = express.Router();
router.post('/some-resource', myMiddleware, myController);

module.exports = router;
```

**index.js mounting pattern:**

```js
// Public
app.use('/v1/auth/', authRoutes);

// Global auth guard
app.use(isUserAuthenticated);

// Protected
app.use('/v1/categories/', categoryRoutes);
app.use('/v1/transactions/', transactionRoutes);
```

---

## Validators

`src/utils/validators/<feature>-validators.js` holds two kinds of validators:

### 1. express-validator chains

Named exports built with `body(...)`. These run inside a middleware array alongside `handleBadRequests(...)`:

```js
const nameFieldValidator = body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.');
```

### 2. Async Express middleware functions

Plain `async (req, res, next)` functions that perform DB lookups, ownership checks, or business logic that cannot be expressed as express-validator chains. These also live in `*-validators.js`.

A common pattern is a **resolve-and-attach** middleware that looks up a resource, checks ownership, and attaches the instance to `req` for downstream handlers:

```js
const resolveCategoryMiddleware = async (req, res, next) => {
    try {
        const category = await categoryRepository.findCategoryById(req.params.id);
        if (!category) return next(new NotFound('The requested category could not be found.'));
        if (category.userId !== req.user.sub) return next(new PermissionDenied());
        req.category = category;   // attach for downstream use
        next();
    } catch (error) {
        next(error);
    }
};
```

**Placement rule:** async validator functions are placed *after* `handleBadRequests(...)` in the middleware array — they run only once field-level validation has passed:

```js
const updateCategoryMiddleware = [
    nameFieldValidator,
    handleBadRequests('Error occurred while updating category.'),
    resolveCategoryMiddleware,   // DB lookup + ownership check — runs after field validation
    categoryUniqueValidator,     // conflict check — runs last
];
```

---

## Service Classes

`src/services/` holds two kinds of modules:

### 1. Class with `handle()` — third-party integrations

```js
class MyIntegrationService {
    constructor(config) {
        this.client = axios.create({ baseURL: config.app.SOME_BASE_URL });
    }

    async handle(payload) {
        try {
            const response = await this.client.post('/endpoint', payload);
            return response.data;
        } catch (error) {
            throw new BadRequest('Integration call failed.', { detail: error.message });
        }
    }
}

module.exports = { MyIntegrationService };
```

### 2. Plain function module — internal multi-operation logic

```js
const signAccessToken = ({ sub, email }) => { /* ... */ };
const verifyAccessToken = (token) => { /* ... */ };

module.exports = { signAccessToken, verifyAccessToken };
```

Only use this pattern when a class + `handle()` would force unrelated operations behind one method name.

---

## Sequelize Models

`src/models/<model>.js` defines the model directly with `sequelize.define(...)` — **not** the `module.exports = (sequelize, DataTypes) => {...}` factory pattern.

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'categories',
    paranoid: true,
    indexes: [
        { name: 'idx_categories_userId', fields: ['userId'] },
    ],
});

module.exports = { Category };
```

Instance methods and hooks are attached below the `sequelize.define(...)` call in the same file.

### Indexes

All indexes must be declared in the `indexes` array with an explicit `name`. Never rely on Sequelize's auto-generated names.

Naming convention: `idx_<tableName>_<descriptor>`

Every index declared in the model must have a corresponding `addIndex` call in a dedicated migration. Foreign key columns must always be indexed.

---

## Sequelize Associations

Declare associations in `src/models/associations.js` — never inside individual model files (circular dependencies). Require it once in `src/index.js` before routes are registered:

```js
require('./models/associations');
```

```js
// associations.js
const { Transaction } = require('./transaction');
const { Category } = require('./category');

Transaction.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Transaction,   { foreignKey: 'categoryId', as: 'transactions' });
```

Use `hasMany`/`belongsTo` (not `belongsToMany`) when the relationship is direct (no junction table). Use `belongsToMany` only when a junction table with two FK columns represents the relationship.

Eager-load with `include` when associated data is always needed in the response:

```js
Transaction.findByPk(id, {
    include: [{ model: Category, as: 'category' }],
});
```

---

## Data Access — Repositories

`src/repositories/<resource>-repository.js` is the only place allowed to import a Sequelize model and query it. Each file exports plain async functions (no class).

```js
const { Category } = require('../models/category');

const createCategory = async ({ userId, name, type }) => {
    return Category.create({ userId, name, type });
};

const findCategoryById = async (id) => {
    return Category.findByPk(id);
};

module.exports = { createCategory, findCategoryById };
```

**Always call through the namespace object — never destructure:**

```js
const categoryRepository = require('../../repositories/category-repository');

const category = await categoryRepository.findCategoryById(req.params.id);
```

---

## Database Transactions

Use Sequelize's **managed transaction** pattern for any operation that must be atomic.

```js
const sequelize = require('../configs/sequelize');

await sequelize.transaction(async (t) => {
    await ModelA.destroy({ where: { ... }, transaction: t });
    await ModelB.bulkCreate(rows, { transaction: t });
});
```

- **Pass `transaction: t` to every operation inside the callback.**
- **Use `bulkCreate` over looping `create`.**
- Never use the unmanaged pattern (manual `t.commit()` / `t.rollback()`).

| Operation | Needs transaction? |
| --- | --- |
| Delete then insert a replacement set | Yes |
| Multi-step writes where any intermediate state is invalid | Yes |
| Single `create` / `update` / `destroy` | No |
| Read-only queries | No |

---

## API Response Serializers

`src/utils/serializers/<resource>-serializer.js` transforms Sequelize model instances into plain API-safe objects.

```js
const serializeCategory = (category) => ({
    categoryId: category.id,
    name: category.name,
    type: category.type,
    isDefault: category.isDefault,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
});

const serializeCategoryList = (categories) => categories.map(serializeCategory);

module.exports = { serializeCategory, serializeCategoryList };
```

### Naming convention

| Function | Purpose |
| --- | --- |
| `serialize<Resource>` | Full detail — used in single-resource GET/POST/PATCH responses |
| `serialize<Resource>List` | Maps an array through `serialize<Resource>` |
| `serialize<Resource><Variant>` | Named contextual variants (e.g. `serializeAuthUser` for minimal auth payloads) |

### Rules

- **Never expose:** `passwordHash`, `deletedAt`, or any internal token/hash field.
- **Rename:** `id` → `<resource>Id` (e.g. `categoryId`).
- **Parse DECIMAL columns** to float with a null guard: `value !== null ? parseFloat(value) : null`.
- **Controllers only** — serializers are called exclusively from controllers.

**Controller usage (namespace, not destructured):**

```js
const categorySerializer = require('../../utils/serializers/category-serializer');

apiResponse.data = categorySerializer.serializeCategory(category);
apiResponse.data = categorySerializer.serializeCategoryList(categories);
```

---

## Authentication & Tokens

- JWTs are signed with **RS256** using a private/public key pair loaded from disk by `utils/keys.js`, paths configured via `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH`.
- `src/services/token-service.js` is the **only** module that signs or verifies tokens (`signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`, `isDenylisted`).
- Access tokens carry `sub` and `email`; refresh tokens carry `sub`/`jti`.
- JWT verification errors are normalized into `TokenExpired` / `InvalidJsonWebToken` — never leak raw `jsonwebtoken` error names.
- Passwords are hashed with `bcryptjs` in a Sequelize `beforeCreate` hook on the `User` model — never in controllers, services, or repositories. The field is named `passwordHash` (not `password`).
- The `isUserAuthenticated` middleware in `authorization-middlewares.js` verifies the Bearer token, checks the denylist via Redis, and attaches the decoded payload to `req.user`.

---

## Testing Guidelines

### Test types

| Type | Tool | What it tests | DB / Redis |
| --- | --- | --- | --- |
| **Integration** | Supertest + Jest | Full HTTP request → middleware → controller → DB → serialized response | Real Postgres test DB, real Redis |
| **Unit** | Jest | A single service or utility in isolation | Mocked |

Default to integration tests for anything that has an HTTP endpoint.

---

### Directory structure

```
src/tests/
  setup.js                              # globalSetup — creates test DB, runs migrations
  teardown.js                           # globalTeardown — drops test DB
  setupFilesAfterEnv.js                 # afterAll — closes sequelize and redis connections
  authentication/
    basic-login-controller.test.js
    basic-registration-controller.test.js
    logout-controller.test.js
    refresh-token-controller.test.js
  categories/
    create-category-controller.test.js
    list-categories-controller.test.js
    patch-category-controller.test.js
    delete-category-controller.test.js
  transactions/
    ...
```

Test files are **grouped by resource in subdirectories**. Naming: `<action>-<resource>-controller.test.js`.

`describe` block: `describe('<METHOD> /v1/<resource>', () => { ... })` — e.g. `describe('POST /v1/categories', () => { ... })`.

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

#### `setup.js`

Creates `POSTGRES_DATABASE_TEST` if it does not exist, then runs pending migrations:

```js
await execPromise('NODE_ENV=test npx sequelize-cli db:migrate');
```

`NODE_ENV=test` is mandatory — without it the CLI migrates the wrong database.

#### `teardown.js`

Calls `pg_terminate_backend` before `DROP DATABASE` to avoid "database is being accessed by other users" errors.

#### `setupFilesAfterEnv.js`

Closes sequelize and redis connections after each test file to prevent Jest open-handle warnings. No mocks are registered here — mock at the top of individual test files when needed.

---

### Mocking strategy

Token service is **not** mocked. Tests sign real RS256 JWTs using `tokenService.signAccessToken` and `signRefreshToken`.

What IS mocked:

| Module | Why mocked |
| --- | --- |
| External OAuth service calls | Calls real third-party endpoints — mock per-test with `jest.spyOn` |

`jest.mock` factory functions cannot reference outer-scope variables (Babel hoisting). Always `require` inside the factory.

---

### User creation in tests

Tests create real `User` rows using `faker` for dynamic, collision-free data. The `passwordHash` field accepts any string when creating test users directly (the `beforeCreate` hook hashes whatever is passed, so use a plain string like `'irrelevant'`):

```js
const { faker } = require('@faker-js/faker');

user = await User.create({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    passwordHash: 'irrelevant',
});
```

Sign an access token for the created user:

```js
const tokenService = require('../../services/token-service');

({ token: accessToken } = tokenService.signAccessToken({
    sub: user.id,
    email: user.email,
}));
// Use as: `Authorization: Bearer ${accessToken}`
```

---

### Test case structure

Every endpoint test file follows this layered structure:

```
describe('<METHOD> /v1/<resource>', () => {

    let user;
    let accessToken;

    beforeAll(async () => {
        // Create User with faker, sign token
    });

    afterAll(async () => {
        // Hard-delete in dependency order (child records before parent)
        // paranoid models require { force: true }
    });

    // 1. Authentication
    it('should return 401 when no Authorization header is provided', ...);

    // 2. Validation — one test per field constraint
    it('should return 400 when <field> is missing', ...);
    it('should return 400 when <field> is <invalid>', ...);

    // 3. Resource resolution / ownership
    it('should return 404 when the resource does not exist', ...);
    it('should return 403 when the resource belongs to a different user', ...);

    // 4. Business logic (Conflict, UnprocessedEntity)
    it('should return 409 when a duplicate already exists', ...);

    // 5. Success
    it('should return 201 with the created resource', ...);

    // 6. Error propagation
    it('should call next() with an error if any exception is thrown', ...);
});
```

#### Validation error tests — assert message and field value

Every 400 test must assert both the top-level `message` (the string passed to `handleBadRequests`) and the specific field error string in `data`:

```js
expect(res.status).toBe(400);
expect(res.body).toHaveProperty('status', 'error');
expect(res.body).toHaveProperty('message', 'Error occurred while creating category.');
expect(res.body.data).toHaveProperty('name', 'Name is required.');
```

For 400 errors produced by async middleware (e.g. `new BadRequest('Validation failed.', { ... })`), assert the message that the middleware passes to `BadRequest`:

```js
expect(res.body).toHaveProperty('message', 'Validation failed.');
expect(res.body.data).toHaveProperty('categoryId', 'Category not found.');
```

Never assert only `.toHaveProperty('fieldName')` without a value — always pin the exact error string so a changed message fails the test.

#### Success test — assert the serialized shape

```js
expect(res.status).toBe(201);
expect(res.body).toHaveProperty('status', 'success');
expect(res.body).toHaveProperty('message', 'Category created successfully.');
expect(res.body.data).toMatchObject({
    name: 'Side Projects',
    type: 'income',
    isDefault: false,
});
expect(res.body.data).toHaveProperty('categoryId');
expect(res.body.data).not.toHaveProperty('id');          // raw column not exposed
expect(res.body.data).not.toHaveProperty('deletedAt');   // paranoid field not exposed
```

#### Error propagation pattern

```js
it('should call next() with an error if any exception is thrown', async () => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    await createCategoryController(req, res, next);
    expect(next).toHaveBeenCalled();
});
```

---

### Determinism and isolation

- **Clean up in dependency order.** Delete child records (e.g. `Transaction`) before parent records (`User`, `Category`).
- **`{ force: true }` for paranoid models.** `User` and `Category` have `paranoid: true`. Without `force: true`, `destroy` sets `deletedAt` but leaves the row — causing conflicts in the next run.
- **Scope cleanup by `userId`.** Use the `user.id` created in `beforeAll` to scope all `destroy()` calls. Never `truncate`.

---

### Coverage expectations

Every endpoint test file must cover all layers of the middleware chain:

| Layer | Minimum tests |
| --- | --- |
| Authentication | Missing Authorization header |
| Validation | Missing + at least one invalid value per validated field |
| Resource resolution | 404 when not found; 403 when wrong owner |
| Business logic | At least one Conflict or UnprocessedEntity case (where applicable) |
| Success | One happy-path test asserting full serialized response shape |
| Error propagation | One direct controller call with empty `req` |

---

### Jest commands

```bash
# Run all tests
npm test

# Run a single test file
npm test -- --testPathPattern=categories/create

# Run with verbose output
npm test -- --verbose

# Run a single named test
npm test -- --testNamePattern="should return 201"
```

---

## Pull Requests & Commits

- Follow **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Keep commits small and focused on a single concern.
- Run `npm test` locally and confirm all tests pass before opening a PR.
- PR descriptions must include: what changed, why it changed, and any migration or environment variable additions required.
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
- Skip `handleBadRequests()` in a middleware array that contains `express-validator` chains.
- Catch errors silently (`catch (e) {}`) — always propagate via `next(error)` or rethrow.
- Import or query a Sequelize model (`src/models/`) from anywhere other than a `src/repositories/*-repository.js` file.
- Destructure functions out of a repository import — always call through the namespace object (`categoryRepository.findCategoryById(...)`).
- Define a Sequelize model using the `module.exports = (sequelize, DataTypes) => {...}` factory pattern — use `sequelize.define(...)` directly.
- Sign or verify a JWT anywhere other than `src/services/token-service.js`.
- Call a serializer from anywhere other than a controller.
- Declare Sequelize associations inside individual model files — use `src/models/associations.js`.
- Wire `isUserAuthenticated` into individual route middleware arrays — it is a global middleware mounted at the app level in `index.js`.
- Hash passwords in controllers, services, or repositories — the `beforeCreate` hook on `User` handles this automatically.
