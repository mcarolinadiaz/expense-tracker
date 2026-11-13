# Expense Tracker

Personal finance app where each person records income and expenses by category, sees a monthly summary, and projects how their fixed costs will increase. See `README.md` for the product overview.

## Architecture

The project is moving to this architecture. See the Roadmap at the end for what is done.

- **Frontend (`web/`):** an installable PWA. All user data, such as transactions, categories and fixed costs, stays on the device in IndexedDB. There are no accounts, and backups are exported and imported as a file.
- **API (`api/`):** a stateless Laravel API with no user data and no database. It serves public data: the monthly IPC from INDEC, cached in files, and IPC adjustment factors for projections. User amounts never reach the API.
- **Hosting:** static hosting for the frontend, and a free or low-cost container for the API. The goal is to run at little or no cost.

The owner is an experienced Angular developer who is learning Laravel through this project:

- **Laravel work:** explain the concepts behind a change, and let the owner write the code unless they ask otherwise.
- **Angular work:** skip the basics. Suggest structure and design, not step-by-step tutorials.

## Stack

- **API (`api/`):** PHP 8.4, Laravel 13, Pest 4. No database: the cache, sessions and queue use files or run in the request.
- **Frontend (`web/`):** Angular 22, Tailwind CSS 4, Dexie (IndexedDB), Vitest. Planned: Transloco for translations and `big.js` for decimal math.
- **Development machine:** Debian 13. If an external APT repository is ever needed, keep its key in `/etc/apt/keyrings`, not `/usr/share/keyrings`.

The first server-based version, with users, MariaDB and a CRUD API, is kept in the Git tag `v0-server-crud`.

## Product decisions

- **Currencies:** USD and ARS, through the frontend's `CURRENCY` constant.
  - Each transaction stores its own currency.
  - Never add USD and ARS together or convert between them. Totals are always per currency.
- **Languages:** `es-AR` and `en-US`, for the interface and for number, date and currency formats. User-created content, such as category names, is not translated.
- **No accounts:** the app has no sign-up or login. Each device keeps its own data.
- **Privacy:** never send user amounts, names or descriptions to the API. Projections combine IPC factors from the API with local amounts in the browser.

## Project structure

```text
expense-tracker/
├── README.md
├── AGENTS.md                   # This guide (CLAUDE.md imports it)
├── web/src/
│   ├── styles.css              # Theme tokens and shared component classes
│   └── app/
│       ├── core/               # App-wide code: AppDb, Clock, dates, money, APP_TEXT, page routes
│       ├── shared/             # Reusable UI: select, month-picker (with SelectedMonthService), stat-card, pipes
│       ├── layout/             # side-bar and navbar
│       ├── overview/           # Overview page and its summary service
│       ├── transactions/       # Activity page, transaction model and service, side panel
│       └── categories/         # Categories page, category model and service
└── api/
    ├── app/
    │   ├── Data/               # Readonly data objects, such as IpcMonth and IpcFactor
    │   ├── Enums/              # IpcEstimate
    │   ├── Exceptions/         # IpcUnavailableException (503)
    │   ├── Http/
    │   │   ├── Controllers/Api/  # IpcController, IpcFactorsController
    │   │   ├── Middleware/     # SetLocale (language from Accept-Language)
    │   │   ├── Requests/       # Form Requests (validation)
    │   │   └── Resources/      # API Resources (JSON output)
    │   └── Services/           # IpcSeries (INDEC data), IpcFactors (projections), SeriesSettings
    ├── config/                 # services.php (series), cors.php, app.php (supported locales)
    ├── lang/                   # es.json (own messages), es/validation.php
    ├── routes/api.php          # All endpoints (automatically prefixed with /api)
    └── tests/Feature/          # One test file per API area
```

Run `php artisan`, `composer` and `./vendor/bin/*` from `api/`. Run `git` from anywhere in the repository. Run `npm` and `ng` from `web/`.

## API

All endpoints are public, read-only and use JSON. They share one rate limit per IP, `SERIES_RATE_LIMIT_PER_MINUTE`.

Scramble generates the docs from the routes, Form Requests and API Resources, so keep them accurate rather than writing docs by hand. The page is at `/docs/api` and the OpenAPI document at `/docs/api.json`. Both are public, use the same rate limit and start no session (`config/scramble.php`).

| Method and path | Purpose |
|---|---|
| `GET /api/ipc?from=YYYY-MM&to=YYYY-MM` | Monthly IPC variation from INDEC, cached for 12 hours. `meta.last_month` is the latest official month, which lags a few months. If INDEC is down, it serves the last data it fetched and tries again after `SERIES_RETRY_AFTER_MINUTES`. Returns `503` only if it has never fetched any data |
| `GET /api/ipc/factors?from=YYYY-MM&months=13&every=4&estimate=average` | Cumulative factors to multiply a cost's current amount by, month by month, for a cost that increases every `every` months by the IPC since its last increase (`last_increase`, default `from`). Months without official data use `estimate`: `average` of the last `average_months` (default 6) or `custom` with `rate`. Each month says whether it `increases` and whether its factor is `estimated` |

Response conventions:

- Send `Accept-Language` to choose the language of validation and error messages. `es-*` returns Spanish, and anything else returns English.
- Successful bodies are wrapped in `data`, with a `meta` object for details such as `last_month` and `source`. Every error is JSON.
- Numbers that need exact decimals, such as variations and factors, are strings, such as `"2.11"` or `"1.0952"`. Months are `YYYY-MM`.
- Status codes: `404` not found, `422` validation errors, `429` too many requests, `503` official data unavailable.
- Browsers may only call the API from the origins in `CORS_ALLOWED_ORIGINS`, and only with `GET`.

## Commands

```bash
php artisan serve                       # Run the API on http://127.0.0.1:8000
php artisan test                        # Run all tests
php artisan test --filter=IpcTest       # Run one test file
php artisan route:list --path=api       # List the endpoints
php artisan scramble:export             # Write the OpenAPI document to api.json
php artisan cache:clear                 # Forget the cached IPC data
./vendor/bin/pint                       # Format the PHP code
```

Tests never call the real INDEC API: each one fakes it with `Http::fake()`, and `Http::preventStrayRequests()` makes any real call fail.

## Best practices for future changes

### Constants and configuration

- Don't hardcode values such as timeouts, retry counts, limits, decimal places, cache durations, URLs or source names, for example `10`, `2`, `500` or `'INDEC'`. Name each value once and reuse it.
- Choose where it lives by who may change it:
  - **Values that can differ by environment** go in a config file with an `env()` default, such as `config/services.php`, and are read with `config()`.
  - **Fixed values that belong to one class** go in a constant of that class, such as `IpcSeries::CACHE_KEY`.
  - **Fixed values shared across the frontend** go in an `as const` object, such as `CURRENCY`.
- Group the fixed parameters of an external API request in one constant, so the request is described in one place.
- Exceptions: `0`, `1` and `-1` in plain arithmetic, array indexes, and expected values in tests, which should stay literal so the test shows what it checks.

### Security and privacy

- Never add endpoints that receive or store user data, such as amounts, names or descriptions.
- Validate every query parameter with a Form Request, and use only `$request->validated()` data.
- Never log request bodies, and configure any error-tracking tool not to send them.
- Rate limit every endpoint.
- Never commit `.env`, tokens or passwords.

### Money and dates

- Never use `float` for money or rates, in PHP or in calculations.
- The frontend calculates totals and projections from local data. Do all money math in integer cents or with a decimal library, never with `number` decimals.
- In PHP, calculate with `bcmath` functions on numeric strings, such as `bcmul` and `bcround`, never with `float`.
- The API runs on UTC, so the frontend should always send the months it means, such as `from`, rather than relying on the API's current month.
- Don't parse `YYYY-MM-DD` with `new Date(value)` in the frontend. It's read as UTC, so in Argentina it displays as the previous day.
- Format money and dates using the active language, and show which currency a value is in. The language decides the format, and the currency decides the symbol.

### Translations

- Never hardcode user-facing text in components or API responses. Add new text in both `es-AR` and `en-US`.
- Frontend: keep shared text in `APP_TEXT` (`web/src/app/core/constants/app-text.ts`). It's English only until translations are set up.
- Frontend: don't repeat fixed values such as `'ARS'` or `'income'` as string literals. Define them once in an `as const` object, such as `CURRENCY` or `STAT_CARD_TONE`, derive the type from it, and import it.
- Frontend: add a page in `APP_PAGE_ROUTES` (`web/src/app/core/constants/app-page-routes.ts`) with a `title`. The side bar builds its links from those routes, so don't list them again.
- API: wrap your own messages in `__()` and add them to `lang/es.json`, using the English text as the key.
- API: `lang/es/validation.php` only covers the rules this project uses. When you add a validation rule or field, add its message and attribute name too, or they appear in English. `LocaleTest` checks each rule in use.
- API: `404` and `429` messages stay in English. The frontend must show its own translated text for these, based on the status code.

### Styling

- Use the theme tokens in `web/src/styles.css`, such as `bg-accent`, `text-muted` and `border-line`, rather than hex values or Tailwind's default colors. To change the look, change the token.
- Income and expense amounts also need a `+` or `−` sign, so they don't rely on color alone.
- Don't put lists of Tailwind utilities in templates. A template can use one specific class, such as `card`, `container` or `app-content`, plus a shared class's modifier, such as `btn btn-primary`.
- When an element needs several styles, give it one descriptive class and build that class from Tailwind utilities with `@apply` in a CSS file. Only write plain CSS when no utility covers the style.
- Define a class in the component's own CSS file by default, starting that file with `@reference` to `web/src/styles.css`.
- Move a class to the `components` layer of `web/src/styles.css` only once more than one component needs it. That layer already has shared classes such as `card`, `btn`, `field` and `amount`.
- Name classes for what they are, such as `card`, not how they look, such as `white-box`.
- Don't reuse the name of a Tailwind utility for your own class, such as `container`, `flex` or `hidden`, or Tailwind will apply its own styles too.

### Frontend data

- Organize the frontend by feature: each feature folder, such as `transactions/`, holds its page, model, service, sub-components and tests. A feature may use another feature's service, as the side panel uses `CategoryService`.
- `core/` holds code the whole app needs and never imports a feature, except `AppDb` for its schema, `APP_TEXT` and the page routes. `shared/` only holds reusable UI with no feature logic.
- Components get their data from a service, never from values defined in the component. Create a service only when a component needs it.
- Services that own user data read and write local storage (IndexedDB). Only public data, such as the IPC, comes from the API.
- The database is `AppDb` (`web/src/app/core/db/app-db.ts`). Read with `liveQuery()` wrapped in `from()`, so the view updates when the data changes. To change the schema, add a new `version()`, and never edit an existing one.
- Store amounts as integer cents (`Cents`), dates as `YYYY-MM-DD` strings and months as `YYYY-MM`. Transactions point to their category by `categoryId`, so renaming a category doesn't touch them.
- Services report broken rules with an error code, such as `CategoryError` with `CATEGORY_ERROR.taken`, and the interface shows its own translated message for it.
- Tests use `fake-indexeddb` (`src/test-setup.ts`) and delete the database after each test.
- Services return an `Observable`, using the model types of their feature, such as `transactions/transaction.ts`. Until a service is connected to its real source, it returns sample data, so connecting it later only changes that service.

### TypeScript

- TypeScript 6 and Angular 22 enable `strict` and `strictTemplates` by default. Never turn them off.
- Let TypeScript infer types when they are obvious, and write them when they document an API, such as a function's return type.
- Never use `any`. Use `unknown` when the type is uncertain, and narrow it before use.

### Angular conventions

**Structure and loading**

- Use standalone components, never NgModules. Don't write `standalone: true`, which is the default.
- Lazy load every page with `loadComponent` in `APP_PAGE_ROUTES`.
- Load heavy, non-critical services with `injectAsync()`, and heavy UI below the fold with `@defer`.
- Use `NgOptimizedImage` (`ngSrc`) for static images. It doesn't work with inline base64 images.

**Components**

- Keep components small, with one responsibility, and only presentation logic. Business rules and data access go in services.
- Components are `OnPush` and zoneless by default. Don't write `changeDetection: ChangeDetectionStrategy.OnPush`.
- Use `input()`, `output()` and `model()`, never `@Input()` or `@Output()`. Use `model()` for two-way binding with `[(prop)]`, rather than an `input()` and `output()` pair.
- Use `viewChild()` and `contentChild()` rather than their decorators.
- Put host bindings and listeners in the `host` object of `@Component` or `@Directive`, never in `@HostBinding` or `@HostListener`.
- Mark members used only by the template `protected`, and inputs, queries and injected dependencies `readonly`.
- Prefer inline templates for small components. External templates and styles use paths relative to the component file.

**State**

- Keep state in `signal()`, derived values in `computed()`, and state that follows other signals but can also be set in `linkedSignal()`. Prefer signals to RxJS subjects.
- Update signals with `set()` or `update()` and new objects or arrays, never by mutating them. Keep these transformations pure.

**Templates**

- Use built-in control flow (`@if`, `@for`, `@switch`), never `*ngIf`, `*ngFor` or `*ngSwitch`. Give every `@for` a unique `track`.
- Use `[class.name]` and `[style.prop]` bindings, never `ngClass` or `ngStyle`.
- Import only the directives and pipes a template uses, such as `AsyncPipe`, never `CommonModule`.
- Keep templates simple: compute values in the class with `computed()`. Read observables with `toSignal()` or `rxResource()`, or with the `async` pipe.
- Don't call globals such as `new Date()` from components or templates. Get the current date from `Clock` (`web/src/app/core/clock.service.ts`), the only code that reads the system clock. Tests fix the date with `provideFixedClock('2026-11-06')`.

**Forms**

- Use Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular 22.
- When a form can't use Signal Forms yet, use reactive forms, never template-driven forms.

**Services**

- Design each service around one responsibility.
- Use `@Service()` for app-wide singleton services. Keep `@Injectable()` only for custom provider setups, such as `useClass` or `useFactory`.
- Use `inject()`, never constructor parameters.

**Accessibility**

- Every page must pass all axe checks and meet WCAG AA, including focus management, color contrast and ARIA attributes.
- Prefer native elements, such as `<button>` and `<nav>`, to `role` attributes. Use `role` only for widgets with no native element, and implement their keyboard behavior, or use the Angular CDK, which already does.

**Tests**

- Write unit tests with Vitest, the default runner.

### Laravel conventions

- Follow the existing request flow: Route → Middleware → Form Request → Controller → Service → data objects → API Resource.
- Keep controllers thin. Business logic and calls to external APIs go in a class in `app/Services/`.
- Pass data between layers as readonly classes in `app/Data/`, not as arrays. Use the `SnakeCaseArray` trait for their JSON keys.
- Return API Resources, using `DataCollection` for lists with a `meta` object.
- The cache only stores plain arrays, because `cache.serializable_classes` is `false`. Convert data objects to arrays before caching them, as `IpcSeries` does.

### Tests

- Every new or changed endpoint needs feature tests in `tests/Feature/`. Cover the successful case, validation, translations, and failures of external sources.
- Fake every external API with `Http::fake()`.
- Run `php artisan test` before committing, and only commit when it passes.
- A red underline on `$this->...` properties in Pest tests is an editor false alarm. Prefer helper functions, such as `fakeIpcSeries()`, which the editor understands.

### Git

- Make small commits with an imperative message, such as "Add monthly summary endpoint".
- Don't commit or push unless the owner asks.

## Before production

These development defaults are not yet handled:

- Set `APP_DEBUG=false`, because `true` exposes stack traces in error responses.
- Set `CORS_ALLOWED_ORIGINS` to the frontend's real domain.
- Make the cache folder, `storage/framework/cache`, writable in the container.
- Run behind HTTPS.

## Roadmap

| Stage | Part | Work | Status |
|---|---|---|---|
| 0 | Git | Tag the server-based version as `v0-server-crud` before removing anything | Done |
| 1 | API | `GET /api/ipc`: monthly IPC from the datos.gob.ar series API (series `148.3_INIVELNAL_DICI_M_26`), cached, with `503` on failure | Done |
| 2 | API | `GET /api/ipc/factors`: adjustment factors for the next months for a cost that increases every N months, estimating future months from the average of recent months or a custom rate | Done |
| 3 | API | Remove users, authentication, the CRUD endpoints and MariaDB. Switch to the file cache and restrict CORS | Done |
| 4 | API | Add API docs, serve the last known IPC data when INDEC is down, and deploy a container | Pending |
| 5 | Web | Store transactions, categories and fixed costs in IndexedDB behind the existing services, with money in cents, and add backup export and import | Pending |
| 6 | Web | Build the Projections and Data pages from the mockup, make the app a PWA, add translations and deploy it | Pending |

The REM series on datos.gob.ar appear to stop in 2025, so the REM estimate option is postponed until a current source is found.
