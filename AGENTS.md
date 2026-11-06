# Expense Tracker

Personal finance app where each user records income and expenses by category and sees a monthly summary. See `README.md` for the product overview.

The owner is an experienced Angular developer who is learning Laravel through this project:

- **Laravel work:** explain the concepts behind a change, and let the owner write the code unless they ask otherwise.
- **Angular work:** skip the basics. Suggest structure and design, not step-by-step tutorials.

## Stack

- **API (`api/`):** PHP 8.4, Laravel 13, Sanctum bearer tokens, Pest 4
- **Database:** MariaDB
- **Frontend (`web/`):** Angular 22, Tailwind CSS 4
- **Development machine:** Debian 13. If an external APT repository is ever needed, keep its key in `/etc/apt/keyrings`, not `/usr/share/keyrings`.

## Product decisions

- **Currencies:** USD and ARS, through the `Currency` enum.
  - Each transaction stores its own currency.
  - Never add USD and ARS together or convert between them. Totals are always per currency.
- **Languages:** `es-AR` and `en-US`, for the interface and for number, date and currency formats. User-created content, such as category names, is not translated.
- **Token storage:** the frontend starts with `localStorage`, kept behind `AuthService`. This is temporary and must be reviewed before production.

## Project structure

```text
expense-tracker/
├── README.md
├── AGENTS.md                   # This guide (CLAUDE.md imports it)
├── web/                        # Angular app (src/styles.css holds the theme)
└── api/
    ├── app/
    │   ├── Enums/              # TransactionType, Currency
    │   ├── Http/
    │   │   ├── Controllers/Api/  # Auth, Category, Transaction, Summary
    │   │   ├── Middleware/     # SetLocale (language from Accept-Language)
    │   │   ├── Requests/       # Form Requests (validation)
    │   │   └── Resources/      # API Resources (JSON output)
    │   ├── Models/             # User, Category, Transaction
    │   └── Policies/           # Record ownership checks
    ├── database/
    │   ├── factories/          # Test data for every model
    │   └── migrations/
    ├── lang/                   # es.json (own messages), es/validation.php
    ├── routes/api.php          # All endpoints (automatically prefixed with /api)
    └── tests/Feature/          # One test file per API area
```

Run `php artisan`, `composer` and `./vendor/bin/*` from `api/`. Run `git` from anywhere in the repository. Run `npm` and `ng` from `web/`.

## Data model

```text
users ──< categories ──< transactions
  └───────────────────────────^
```

- `categories`: `name` is unique per user. Two users can each have "Food".
- `transactions`: `type` and `currency` are enums, `amount` is `decimal(12, 2)`, and `date` has no time. Both `user_id` and `category_id` are required.
- Deleting a user cascades to their data. A category with transactions can't be deleted.

## API

All endpoints use JSON. Anything except register and login needs `Authorization: Bearer <token>`.

| Method and path | Purpose |
|---|---|
| `POST /api/register`, `POST /api/login` | Return `{ token }`. Limited to 5 requests per minute |
| `POST /api/logout` | Delete the current token |
| `GET /api/user` | Current user |
| `GET, POST /api/categories` | List or create |
| `PUT, DELETE /api/categories/{id}` | Rename or delete. Delete returns `409` while the category is in use |
| `GET, POST /api/transactions` | List (15 per page, newest first) or create. Optional filters: `month`, `currency`, `type`, `category_id`, `search`, `page` |
| `GET, PUT, DELETE /api/transactions/{id}` | Read, update or delete |
| `GET /api/summary?month=YYYY-MM&currency=ARS` | Income, expense, balance and expenses by category, for one required currency |

Response conventions:

- Send `Accept-Language` to choose the language of validation and error messages. `es-*` returns Spanish, and anything else returns English.
- Successful bodies are wrapped in `data`, except the `{ token }` responses and the raw `GET /api/user` model. Paginated lists also include `links` and `meta`.
- Money is a string with 2 decimals, such as `"25.50"`, and dates are `YYYY-MM-DD`.
- Status codes: `401` no valid token, `403` another user's record, `404` not found, `409` conflict, `422` validation errors, `429` too many requests.

## Commands

```bash
php artisan serve                       # Run the API on http://127.0.0.1:8000
php artisan test                        # Run all tests
php artisan test --filter=SummaryTest   # Run one test file
php artisan route:list --path=api       # List the endpoints
php artisan migrate                     # Run pending migrations
./vendor/bin/pint                       # Format the PHP code
```

Tests run on the `expense_tracker_test` MariaDB database, as set in `phpunit.xml`. `RefreshDatabase` drops every table in the database it runs on, so never point tests at `expense_tracker`.

## Best practices for future changes

### Security and ownership

- Every record belongs to a user, so check ownership in all of these places:
  - **Lists and creation:** go through the relationship, as in `$request->user()->transactions()`.
  - **Single records:** call `Gate::authorize('manage', $record)`, backed by a Policy.
  - **IDs in the request body:** validate ownership, as in `Rule::exists('categories', 'id')->where('user_id', ...)`.
- Never accept `user_id` from a request, and keep it out of `#[Fillable]`.
- Save only validated data: `$request->validated()` or the result of `$request->validate()`.
- Never put request data directly into `selectRaw` or other raw SQL. Use bindings.
- Never commit `.env`, tokens or passwords.

### Money and dates

- Never use `float` for money, in PHP or in calculations. Use `decimal` columns, the `decimal:2` cast, and SQL aggregates.
- The API returns money as strings, so the frontend must not do arithmetic on them as floats. Use the totals from `/api/summary`.
- The API runs on UTC, so the frontend should always send `month` to `/api/summary`.
- Don't parse `YYYY-MM-DD` with `new Date(value)` in the frontend. It's read as UTC, so in Argentina it displays as the previous day.
- Format money and dates using the active language, and show which currency a value is in. The language decides the format, and the currency decides the symbol.

### Translations

- Never hardcode user-facing text in components or API responses. Add new text in both `es-AR` and `en-US`.
- Frontend: keep shared text in `APP_TEXT` (`web/src/app/core/constants/app-text.ts`). It's English only until translations are set up.
- Frontend: add a page in `APP_PAGE_ROUTES` (`web/src/app/core/constants/app-page-routes.ts`) with a `title`. The side bar builds its links from those routes, so don't list them again.
- API: wrap your own messages in `__()` and add them to `lang/es.json`, using the English text as the key.
- API: `lang/es/validation.php` only covers the rules this project uses. When you add a validation rule or field, add its message and attribute name too, or they appear in English.
- API: `401`, `403`, `404` and `429` messages stay in English and can expose internal names. The frontend must show its own translated text for these, based on the status code.

### Styling

- Use the theme tokens in `web/src/styles.css`, such as `bg-accent`, `text-muted` and `border-line`, rather than hex values or Tailwind's default colors. To change the look, change the token.
- Income and expense amounts also need a `+` or `−` sign, so they don't rely on color alone.
- Don't put lists of Tailwind utilities in templates. A template can use one specific class, such as `card`, `container` or `app-content`, plus a shared class's modifier, such as `btn btn-primary`.
- When an element needs several styles, give it one descriptive class and build that class from Tailwind utilities with `@apply` in a CSS file. Only write plain CSS when no utility covers the style.
- Define a class in the component's own CSS file by default, starting that file with `@reference` to `web/src/styles.css`.
- Move a class to the `components` layer of `web/src/styles.css` only once more than one component needs it. That layer already has shared classes such as `card`, `btn`, `field` and `amount`.
- Name classes for what they are, such as `card`, not how they look, such as `white-box`.
- Don't reuse the name of a Tailwind utility for your own class, such as `container`, `flex` or `hidden`, or Tailwind will apply its own styles too.

### Laravel conventions

- Follow the existing request flow: Route → Middleware → Form Request or `validate()` → Controller → Policy → Model → API Resource.
- Keep controllers thin. Add a service or Action class only when logic is shared or gets complex, not by default. Don't add repository classes on top of Eloquent.
- Return API Resources rather than models, so new columns are never exposed by accident.
- Load relationships with `with()` or `load()` to avoid N+1 queries.
- Use `#[Fillable]` attributes on models, matching the existing ones.
- Never edit a migration that has already been pushed or run elsewhere. Add a new migration instead.
- Add a factory for each new model.

### Tests

- Every new or changed endpoint needs feature tests in `tests/Feature/`. Cover the successful case, validation, unauthenticated access, and another user's data.
- Run `php artisan test` before committing, and only commit when it passes.
- A red underline on `$this->user` in Pest tests is an editor false alarm. The test run decides whether there's a real problem.

### Git

- Make small commits with an imperative message, such as "Add monthly summary endpoint".
- Don't commit or push unless the owner asks.

## Before production

These development defaults are not yet handled:

- Set `APP_DEBUG=false`, because `true` exposes stack traces in error responses.
- Restrict CORS to the frontend's domain. Publish the config with `php artisan config:publish cors`, because all origins are allowed at the moment.
- **Review token storage (required):** `localStorage` exposes the token if the app ever has an XSS vulnerability. Compare it with Sanctum's cookie-based SPA authentication, and record the decision here.
- Decide on token lifetime. `sanctum.expiration` is `null`, so tokens never expire.
- Run behind HTTPS, because tokens and passwords travel in every request or login.
