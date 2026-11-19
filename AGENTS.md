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
- **Frontend (`web/`):** Angular 22, Tailwind CSS 4, Dexie (IndexedDB), Transloco, Vitest. Decimal math uses native `BigInt` in `core/decimal.ts`, with no library.
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
│   ├── environments/           # apiUrl per build (environment.development.ts for ng serve)
│   └── app/
│       ├── core/               # App-wide code: AppDb, Clock, dates, money, decimal, API_URL, i18n (translations, LanguageService, Translator), page routes
│       ├── shared/             # Reusable UI: select, month-picker (with SelectedMonthService), stat-card, spinner, confirm-dialog, pipes (money, text, plural)
│       ├── layout/             # side-bar and navbar
│       ├── overview/           # Overview page and its summary service
│       ├── transactions/       # Activity page, transaction model and service, side panel
│       ├── categories/         # Categories page, category model and service
│       ├── projections/        # Projections page, fixed costs and their panel, the IPC factors client and the projection
│       └── data/               # Data page: backup format, export, import and deleting all data
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
- In the frontend, format and read money and dates only through `LocaleFormat` (`web/src/app/core/locale-format.service.ts`), or the `money` pipe that uses it. Never inject `LOCALE_ID` or call `Intl` in components: the language is a signal in `LocaleFormat`, so it can change without reloading.
- Show a `+` or `−` before income and expense amounts with `TRANSACTION_SIGN`, never a hyphen.

### Translations

- Never hardcode user-facing text in components or API responses. Add new text in both `es-AR` and `en-US`.
- Frontend: keep every text in `web/src/app/core/i18n/en.json` and `es.json`, with the same keys. `translations.spec.ts` checks that both files match.
- Frontend: in templates, use the `text` pipe, as in `{{ 'data.title' | text }}`, or `plural` for a count, as in `{{ 'activity.count' | plural: total }}`. In TypeScript, such as `computed()` labels or `LiveAnnouncer`, use `Translator.translate()` or `plural()`. Never use Transloco's own pipe or directive: their keys aren't typed.
- Frontend: keys are typed (`TextKey`), so a key missing from `en.json` fails to compile. For a key per code, such as an error or a rule, return a template literal typed as `TextKey`, such as `` `fixedCostErrors.${code}` ``, rather than a map. Mark a key kept outside a template, such as a route title, with `textKey()`.
- Frontend: placeholders use `{{ name }}`, filled from the params. A plural text is an object with `one` and `other`, and `{{ count }}` is formatted in the active language.
- Frontend: change the language only through `LanguageService.use()`, which keeps Transloco, `LocaleFormat` and `<html lang>` in step and saves it on the device.
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
- `core/` holds code the whole app needs and never imports a feature, except `AppDb` for its schema and the page routes. `shared/` only holds reusable UI with no feature logic.
- Components get their data from a service, never from values defined in the component. Create a service only when a component needs it.
- Services that own user data read and write local storage (IndexedDB). Only public data, such as the IPC, comes from the API.
- The database is `AppDb` (`web/src/app/core/db/app-db.ts`). Read with `liveQuery()` wrapped in `from()`, so the view updates when the data changes. To change the schema, add a new `version()`, and never edit an existing one.
- Store amounts as integer cents (`Cents`), dates as `YYYY-MM-DD` strings and months as `YYYY-MM`. Transactions point to their category by `categoryId`, so renaming a category doesn't touch them.
- Services report broken rules with an error code, such as `CategoryError` with `CATEGORY_ERROR.taken`, and the interface shows its own translated message for it.
- Tests use `fake-indexeddb` (`src/test-setup.ts`) and delete the database after each test.
- Services return an `Observable`, using the model types of their feature, such as `transactions/transaction.ts`. Until a service is connected to its real source, it returns sample data, so connecting it later only changes that service.

### Frontend comments

- Don't write comments in frontend code: no `//` in TypeScript, including tests, no `<!-- -->` in templates and no `/* */` in CSS. Name things so the code explains itself.
- Keep `/** */` doc comments on exported functions, classes, services and constants, which the editor shows on hover.
- When code needs a clarification that its names can't give, add it to "Frontend implementation notes" below, under its feature.

### Frontend implementation notes

**App shell**

- From `md` up, the shell is exactly as tall as the window: the side bar stays whole and only the content area scrolls. On narrower screens the side bar stacks above the content and the whole page scrolls.
- The content area scrolls on its own, and the router only resets the window's scroll, so `App` sets the content area's `scrollTop` to `0` after each navigation.
- The content area has `cdkScrollable`, so overlays such as an open dropdown follow it when it scrolls.

**Shared styles (`styles.css`)**

- `@theme` holds the design tokens from the mockup. Each token creates Tailwind utilities, such as `bg-accent` and `text-muted`.
- Classes in the `components` layer can still be overridden by a utility, as in `class="card p-8"`.
- Buttons combine `btn` with one variant, such as `btn btn-primary`. `btn-icon` makes a square button for a single icon, which needs an `aria-label`.
- The segmented control (`segmented` and `segmented-item`) is a group of buttons where `aria-pressed` marks the active one.
- `panel-backdrop` is global because the CDK adds the backdrop behind side panels outside any component.
- Side panels share the `panel-*` classes and `amount-field`. Each panel component sets `side-panel` on its host through `host: { class }`, since `:host` styles can't be shared. A class set on the host only works from `styles.css`: the component's own CSS scopes each selector to its template, which doesn't include the host, so style the host there with `:host`.

**Translations (`core/i18n/`)**

- Transloco only loads the files and fills the placeholders. The app's own `text` and `plural` pipes and `Translator` add the typed keys. Each language's file is imported on demand, so it's its own chunk and needs no HTTP request.
- `@jsverse/transloco-messageformat` (ICU) was left out on purpose: it added about 100 kB to the initial bundle, over the budget, for a handful of plurals. `Translator.plural()` picks `one` or `other` with `Intl.PluralRules`, and other categories, such as Spanish `many`, use `other`.
- `LanguageService.start()` runs in an app initializer: it reads the saved language, or the browser's, and loads its file before the first render, so the page never shows keys.
- The `text` and `plural` pipes are impure and `Translator` reads the active language as a signal, so text in templates and `computed()` updates when the language changes.
- Route titles are text keys. `TranslatedTitleStrategy` writes the document title, and the navbar translates the title with `Translator.isKey()`, because the router types it as plain text.
- `acceptLanguageInterceptor` sends the active language to the API, so its validation and error messages match.
- The language selector at the bottom of the side bar shows each language's name in that language (`LANGUAGE_NAME`), with a `lang` attribute, and never translates it.
- Option lists built in TypeScript, such as the type filter or the frequency options, are `computed()`, so their labels follow the language.

**Dates and money (`core/`)**

- `LocaleFormat.monthName()` capitalizes the first letter, because Spanish writes month names in lower case but the name may start a line.
- `parseAmount()` only accepts thousands separators in the whole part and one decimal separator, so `1.250,5.0` is rejected rather than read as `1.250,50`.
- `LocaleFormat.money()` writes `−` before a negative amount, such as a negative balance, rather than the hyphen `Intl` uses.
- `Intl` separates a currency symbol and its number with a non-breaking space. Tests that compare formatted amounts replace `\s` with a plain space first.
- `core/decimal.ts` keeps factors and percentages as plain decimal text, such as `"1.0952"` or `"8.5"`, and multiplies them by cents with `BigInt`, rounding half away from zero to the cent.
- `parsePercent()` rejects a thousands separator, so `2.5` typed in es-AR is not read as 25.

**Database (`core/db/`)**

- Dexie's `stores()` only lists the primary key and the indexed fields. Other fields are stored too, but can't be queried with `where()`.
- `TransactionService.listMonth()` reads the month as the text range from `YYYY-MM-01` to `YYYY-MM-31`, which works for every month because dates are `YYYY-MM-DD` strings.
- `version(2)` adds `fixedCosts`, indexed by `currency`. A later version only lists the stores it adds or changes, and Dexie keeps the others.
- `version(3)` adds `settings`, keyed by `key`, for settings of the device such as the day of the last backup. They are never part of a backup.

**Select (`shared/select/`)**

- The field looks like `.field`, plus a chevron. The CDK marks the chosen option with `aria-selected` and the keyboard or mouse position with `.cdk-option-active`, and `select.css` styles both.
- The panel opens below the field, or above it when there is no room below.
- A click outside the panel closes it, except a click on the field itself, which already toggles it.
- The list only exists once the panel renders, so `openPanel()` focuses it in `afterNextRender()`. Focusing the list moves to the selected option.

**Transactions (`transactions/`)**

- `TransactionPanelService` remembers the type, currency and category of the last saved transaction and starts the next one with them. "Save and add another" also keeps the date.
- The panel's form keeps the amount as text. When saving, the amount validator has already checked that it parses, so `persist()` can parse it without checking again.
- The Activity filters need no validation, so their form only binds the fields to the `filterValues` signal.
- The Activity table scrolls sideways inside its own box on narrow screens. The side panel's buttons stay at its bottom when the form is short.
- Activity reads `?category=<id>` and `?currency=<code>` (`ACTIVITY_QUERY_PARAM`) as its `category` and `currency` inputs, through `withComponentInputBinding()`. Its filters are a `linkedSignal` that starts from them, and they only cover the selected month.

**Overview (`overview/`)**

- `SummaryService` combines the month's transactions with the categories, keeps one currency and adds up in integer cents. Each category's `share` is its percentage of the largest category, used only for the width of its bar.
- Overview and Activity share the month through `SelectedMonthService`, but each page keeps its own currency. The category bars and "View all" are links to Activity with the same currency, and the bar's category.

**Categories (`categories/`)**

- Deleting a category asks for no confirmation, because the service only deletes a category that no transaction uses. Otherwise the row explains why and offers "View transactions", which opens Activity filtered by that category.
- Only one row is renamed at a time, so the rename field has a fixed id. After saving, or cancelling with Escape, the focus goes back to that row's Rename button.
- The name fields use `maxLength()` with the `tooLong` error code, so `FormField` sets the native `maxlength` and any error shows the same message as the service's.

**Projections (`projections/`)**

- Every fixed cost has a `lastIncrease` month and increases every `every` months after it, whatever its rule. The first projected month is today's amount and never increases, as in the API.
- Percentage and fixed-amount increases are calculated in the browser. IPC increases multiply today's amount by the cumulative factor the API gives for each month, so rounding never piles up.
- `ProjectionService` asks for factors once per distinct `every` and `lastIncrease`, plus a monthly schedule from today that gives the IPC estimate even without IPC costs. It only sends months and estimate settings, never amounts or names.
- It keeps the factors it read for the same month and settings, and forgets a failed request so the next one tries again. While the API fails, IPC costs stay the same and `ipc.status` is `unavailable`.
- The Projections page keeps the last valid estimate settings in a `linkedSignal`, so a custom rate that is still being typed, or is invalid, keeps the previous projection instead of requesting factors. Choosing "Custom" fills the rate with the current monthly estimate.
- On the first load, a spinner takes the place of the cards and the table. After that, a new estimate keeps the current figures dimmed and `aria-busy`, with a spinner by the table title, until the new ones arrive. A new currency starts empty. A hidden `role="status"` text announces the loading.
- "Try again" calls `reload()` on the projection resource. Since the service forgot the failed request, it asks the API again.
- Deleting a fixed cost asks for no confirmation, as in the mockup. The page announces it with `LiveAnnouncer`.
- The table scrolls sideways in a focusable `region`, so it can be scrolled with the keyboard, and its first column stays in place. The region is `relative`: `sr-only` text is `position: absolute`, and without a positioned ancestor it is placed against the whole page, so the cells of the last months would widen the page. Increase months are tinted and bold, and say "increase" to screen readers, so they don't rely on color. The bar chart is `aria-hidden` because the table holds the same totals.
- The fixed cost panel asks for `lastIncrease` with `type="month"` for every rule, and rejects a month after the current one, which the API also rejects.
- The currency selector only shows the costs stored in that currency. Projections never convert between USD and ARS, as the product decisions say.

**Data (`data/`)**

- A backup is a JSON file with `format`, `version`, `exportedOn` and every category, transaction and fixed cost, with their ids, so transactions keep pointing to their categories after an import.
- `parseBackup()` never trusts the file: it checks every field of every record, that ids and category names are unique, and that each transaction's category is in the file, and keeps only the known fields. Any problem fails with a `BackupError` code before anything is written.
- Importing replaces all data in one IndexedDB transaction, so a failure leaves the old data. A file from a newer `version` asks to update the app. Raise `BACKUP_VERSION` and read older versions when the stored records change.
- Exporting saves the day in `settings`, shown as "Last backup". `FileDownload` (`core/`) saves the file, so tests replace it instead of the browser download.
- Importing asks first in an inline alert, as in the mockup, then opens the file picker of a hidden `input`. Deleting everything asks in a modal (`ConfirmDialogService`, `shared/confirm-dialog/`), which starts on Cancel so Enter never deletes by mistake, and gives the focus back to the button.
- The API docs link comes from `API_DOCS_URL`, built from `API_URL`.

**Tests**

- IndexedDB answers outside Angular. After a change that reads or writes the database, wait a macrotask with `setTimeout` before `fixture.whenStable()`, or the view still shows the old data.
- `fixture.whenStable()` waits for resources that are loading. To check a loading state, refresh the view with `fixture.detectChanges()` instead, as `projections.spec.ts` does.
- Components that show text need `provideTestTranslations()` (`core/i18n/translations.testing.ts`), which loads both languages before the test, in English. Compare with texts from `en.json`, or with a literal string when the text has placeholders, such as `'3 transactions'`.
- A page that reads several `liveQuery()` results, or writes and then reads, may need more than one macrotask. Wait for the expected result with `vi.waitFor()` instead of a fixed number of waits, as `categories.spec.ts` does.

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
- Keep the form's data in a `signal()` model, create the form with `form()` and its validators, and bind each control with `[formField]`. Keep amounts as text in the model and parse them with `LocaleFormat` when saving.
- Submit with `submit()`, which marks every field as touched and only runs the action when the form is valid. A rule a service rejects, such as `CategoryError`, comes back from the action as an error on its field.
- Show a field's errors once it is touched, not while the user types it the first time.
- Custom controls, such as `app-select`, implement `FormValueControl` with a `value = model()`, rather than `ControlValueAccessor`.

**Services**

- Design each service around one responsibility.
- Use `@Service()` for app-wide singleton services. Keep `@Injectable()` only for custom provider setups, such as `useClass` or `useFactory`.
- Use `inject()`, never constructor parameters.

**Accessibility**

- Every page must pass all axe checks and meet WCAG AA, including focus management, color contrast and ARIA attributes.
- Prefer native elements, such as `<button>` and `<nav>`, to `role` attributes. Use `role` only for widgets with no native element, and implement their keyboard behavior, or use the Angular CDK, which already does.
- Every page and every component with an overlay, such as a dialog or a dropdown, has a test that calls `expectNoAxeViolations()` (`web/src/app/core/axe.testing.ts`), in each state that changes its markup, such as open, empty or showing errors. Pass `{ page: true }` when checking the whole app shell, and give the test `AXE_TEST_TIMEOUT_MS`.
- jsdom can't compute colors, so the axe tests skip color contrast. Check contrast in a real browser, with Lighthouse or the end-to-end tests.

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
- Set `apiUrl` in `web/src/environments/environment.ts` to the deployed API. It still points to `php artisan serve`.
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
| 5 | Web | Store transactions, categories and fixed costs in IndexedDB behind the existing services, with money in cents, and add backup export and import | Done |
| 6 | Web | Build the Projections and Data pages from the mockup, make the app a PWA, add translations and deploy it | Pending |

The REM series on datos.gob.ar appear to stop in 2025, so the REM estimate option is postponed until a current source is found.
