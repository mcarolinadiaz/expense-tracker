# Expense Tracker

[![CI](https://github.com/mcarolinadiaz/expense-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/mcarolinadiaz/expense-tracker/actions/workflows/ci.yml)

A personal finance app for everyday use. Record your income and expenses by category, see a summary of each month, and project how much your fixed costs will rise with inflation.

It's built with a **Laravel** API and an **Angular** frontend, both on their current versions.

## Contact

**María Carolina Díaz**, Software Engineer.

- LinkedIn: [linkedin.com/in/mariacarolinadiaz](https://www.linkedin.com/in/mariacarolinadiaz)
- Email: [diazmariacarolina6@gmail.com](mailto:diazmariacarolina6@gmail.com)

## Features

- **Transactions:** record income and expenses with an amount, date, category, currency and an optional description.
- **Custom categories:** create and rename them to match how you manage your money.
- **Monthly summary:** income, expenses, balance and spending by category for each month.
- **Projections:** add fixed costs, such as rent or utilities, and see what they'll cost over the next 12 months. Each one can increase with inflation (IPC), by a percentage or by a fixed amount.
- **Backups:** export and import all your data as a file.
- **Pesos and dollars:** each transaction keeps its own currency (ARS or USD).
- **Two languages:** Spanish (Argentina) and English, with dates and amounts in each one's format.

## Stack

| Part | Tools |
|---|---|
| Frontend (`web/`) | Angular 22 and Angular CDK, TypeScript 6, Tailwind CSS 4 |
| Local data | IndexedDB, through Dexie |
| Translations | Transloco, with typed keys |
| API (`api/`) | PHP 8.4 and Laravel 13, with no database (file cache) |
| API docs | Scramble (OpenAPI generated from the code) |
| Tests | Pest 4 for the API; Vitest, axe-core and fake-indexeddb for the frontend |
| Quality | Pint and Prettier for formatting, GitHub Actions for CI |
| Public data | Monthly IPC from INDEC, through the [datos.gob.ar](https://datos.gob.ar) series API |

## Design decisions

These are the main decisions I made, and why.

### Privacy: your data never leaves your device

The app has no accounts and no server-side database:

- Every transaction, category and fixed cost is stored in the browser, in **IndexedDB**. No account or server holds personal information.
- The API **never receives amounts, names or descriptions**. It only serves public data: the IPC and adjustment factors.
- Projections are calculated in the browser, by combining the IPC factors from the API with the local amounts.
- To avoid losing data, or to move it to another device, you export a backup file.

This removes the risk of leaking financial data and the need to maintain a database and authentication. It also lets the app be hosted for free or at very low cost.

### Money is never calculated with floating-point numbers

- In the frontend, amounts are stored as **integer cents**, and percentages and factors are multiplied with `BigInt`, with no library.
- In PHP, calculations use `bcmath` on numeric strings.
- The API sends numbers that need exact decimals as strings, such as `"1.0952"`.

This avoids errors like `0.1 + 0.2 = 0.30000000000000004`, which aren't acceptable in a money app.

### Pesos and dollars are never added together or converted

Argentina has several exchange rates, and the IPC measures inflation in pesos. So each currency has its own totals and projections, and the app never picks an exchange rate for the user.

### IPC projections without accumulated rounding

A cost that increases by IPC every N months is calculated by multiplying its current amount by the **cumulative factor** since its last increase, rather than rounding month by month. That way rounding errors never pile up.

For months that INDEC hasn't published yet, the app estimates from the average of recent months or from a rate the user chooses. It always shows which months are estimated.

### A simple, resilient API

- The API is stateless and has no database. It caches INDEC data for 12 hours.
- If INDEC is down, it serves the last data it fetched.
- It validates every parameter with Form Requests, rate limits each IP, only accepts `GET` from allowed origins, and returns errors in the user's language.
- Its OpenAPI docs are generated from the code by Scramble.

### Accessibility and quality

- Every page passes automated **axe** checks in the tests, aiming for WCAG AA: keyboard navigation, focus management and screen reader text.
- Amounts show a `+` or `−` as well as a color, so they don't rely on color alone.
- Every API endpoint has Pest tests, which never call the real INDEC API. The frontend has unit and component tests with Vitest.

### Modern Angular

Standalone components, **signals**, Signal Forms, change detection without Zone.js, and lazy-loaded pages. Translations use typed keys, so a misspelled key is a compile error.

## Running it locally

### Requirements

- **PHP 8.4** with the `bcmath`, `mbstring`, `xml` and `curl` extensions
- **Composer** 2
- **Node.js 24** and **npm** 11
- **Git**

### 1. Clone the repository

```bash
git clone https://github.com/mcarolinadiaz/expense-tracker.git
cd expense-tracker
```

### 2. Start the API

In one terminal:

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

The API runs at <http://127.0.0.1:8000>, and its docs are at <http://127.0.0.1:8000/docs/api>.

### 3. Start the frontend

In another terminal, from the root of the repository:

```bash
cd web
npm install
npm start
```

Open <http://localhost:4200> in your browser.

### 4. Run the tests (optional)

From the root of the repository:

```bash
(cd api && php artisan test)   # API
(cd web && npm test)           # Frontend
```

## Status

In active development.
