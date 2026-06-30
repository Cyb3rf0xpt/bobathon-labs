# GFM Bank Teller Front-End — Test Plan

## Background

This plan covers adding an automated test suite to `starter/teller_frontend`
using **Vitest** and **React Testing Library**. The backend API is mocked at
the module boundary (`src/services/api.js`) so tests run fully offline with no
proxy or network dependency.

Reference: [`SPEC.md`](SPEC.md) — functional requirements FR-1 through FR-8.

---

## Decisions & Assumptions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Vitest** as the test runner (not Jest) | Vitest is the idiomatic choice for Vite projects — zero extra config to resolve ESM/SCSS imports; shares `vite.config.js` transform pipeline. |
| D2 | **React Testing Library** for component tests | Tests user-visible behaviour, not implementation detail. Carbon components render standard HTML; RTL queries work against them without Carbon-specific adapters. |
| D3 | Mock `src/services/api.js` at the module level with `vi.mock` | Single mock point covers all pages. No HTTP traffic ever leaves the test process. |
| D4 | Mock `@carbon/react` SCSS via a Vitest `moduleNameMapper` / `css` transform | The `@use '@carbon/react'` in `index.scss` would fail in jsdom; a blanket CSS mock suppresses it without touching the source file. |
| D5 | One test file per page, plus one for `src/utils/formatters.js` | Mirrors `src/pages/` structure; each file is independently runnable. |
| D6 | Coverage threshold: **80% lines and branches** (enforced, build fails below) | Agreed in scoping. Measured with Vitest's built-in v8 provider. |
| D7 | New dev-dependencies only — no changes to `package.json` `dependencies` or any source file | Tests are additive; production bundle is unchanged. |
| D8 | `vite.config.js` gains a `test` block; the existing `server` and `build` blocks are untouched | Vitest reads the same config file under a `test` key. |

---

## New packages (devDependencies only)

| Package | Purpose |
|---|---|
| `vitest` | Test runner, assertions, mocking (`vi.mock`, `vi.fn`, `vi.spyOn`) |
| `@vitest/coverage-v8` | V8-based coverage provider |
| `@testing-library/react` | `render`, `screen`, `fireEvent`, `waitFor` |
| `@testing-library/user-event` | Realistic user interactions (type, click, tab) |
| `@testing-library/jest-dom` | Custom matchers: `toBeInTheDocument`, `toBeDisabled`, etc. |
| `jsdom` | DOM environment for Vitest |

---

## Config changes

### `vite.config.js` — add `test` block

```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.js'],
  css: true,                        // suppresses SCSS parse errors in jsdom
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    thresholds: { lines: 80, branches: 80 },
    include: ['src/**/*.{js,jsx}'],
    exclude: ['src/main.jsx', 'src/test/**'],
  },
},
```

### `src/test/setup.js` (new file)

```js
import '@testing-library/jest-dom';
```

### `package.json` — add scripts

```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

---

## Mock strategy

All tests mock `../services/api` (or `../../services/api`) with `vi.mock`.
The mock module exports the same function names as the real `api.js`:

```js
vi.mock('../services/api', () => ({
  login:               vi.fn(),
  logout:              vi.fn(),
  getAccounts:         vi.fn(),
  getBalanceByIban:    vi.fn(),
  getTransactions:     vi.fn(),
  transferByIban:      vi.fn(),
  buildOverdraftRequest: vi.fn(),
  checkBackendStatus:  vi.fn(),
}));
```

`AuthContext` is **not** mocked — it is used as-is (wrapping the component
under test in `<AuthProvider>` + `<MemoryRouter>`). This validates the real
auth state machine with mocked API calls.

---

## Test files

```
src/
  test/
    setup.js
  pages/
    Login.test.jsx
    Dashboard.test.jsx
    AccountDetails.test.jsx
    Transfer.test.jsx
    OverdraftRequest.test.jsx
  utils/
    formatters.test.js
```

---

## Requirements & Acceptance Criteria

### `formatters.test.js` — utility functions

| ID | Requirement (from SPEC FR-8) | Acceptance criterion |
|---|---|---|
| FMT-1 | `formatCurrency` formats a positive EUR amount | `formatCurrency(1234.56)` → `"€1,234.56"` |
| FMT-2 | `formatCurrency` formats a negative EUR amount | `formatCurrency(-50530.51)` → `"€-50,530.51"` or `"-€50,530.51"` (locale-defined) |
| FMT-3 | `formatCurrency` handles zero | `formatCurrency(0)` → `"€0.00"` |
| FMT-4 | `formatCurrency` handles NaN / undefined gracefully | Returns `"€0.00"`, does not throw |
| FMT-5 | `formatDateTime` formats a valid ISO timestamp | Returns a non-empty string containing year and time digits |
| FMT-6 | `formatDateTime` handles null / empty | Returns `""`, does not throw |
| FMT-7 | `formatIban` groups IBAN into blocks of 4 | `"DE89545769475769453536"` → `"DE89 5457 6947 5769 4535 36"` |
| FMT-8 | `isValidIban` accepts a valid IBAN | `isValidIban("DE89545769475769453536")` → `true` |
| FMT-9 | `isValidIban` rejects short / malformed strings | Returns `false` for `""`, `"123"`, `"xx"` |

---

### `Login.test.jsx` — FR-1

| ID | Requirement | Acceptance criterion |
|---|---|---|
| LOG-1 | Login page renders the username and password fields | Both inputs are present in the DOM |
| LOG-2 | Submit button is disabled when either field is empty | Button has `disabled` attribute when username or password is blank |
| LOG-3 | Successful login navigates to `/dashboard` | After `login` mock resolves, the router location is `/dashboard` |
| LOG-4 | HTTP 401 shows "Invalid username or password" error | `InlineNotification` with that text is visible; page does not navigate |
| LOG-5 | Non-401 network error shows the backend-waking message | Error notification appears with the correct fallback text |
| LOG-6 | Submit button shows "Signing in…" while request is in flight | Button text changes during the pending mock state |
| LOG-7 | `.env` pre-fill: inputs start with `VITE_TELLER_USERNAME` / `VITE_TELLER_PASSWORD` values | Fields have the expected default values |

---

### `Dashboard.test.jsx` — FR-2

| ID | Requirement | Acceptance criterion |
|---|---|---|
| DSH-1 | Account list renders after `getAccounts` resolves | IBAN of the first mock account is visible in the table |
| DSH-2 | Skeleton is shown while loading | Skeleton element is present before `getAccounts` resolves |
| DSH-3 | IBAN search filter hides non-matching rows | After typing a partial IBAN, only matching rows remain |
| DSH-4 | "View" button navigates to `/accounts/:accountId` | Clicking "View" changes the router location |
| DSH-5 | `getAccounts` failure shows an error notification | `InlineNotification` kind `error` is visible |
| DSH-6 | Pagination: only `pageSize` rows shown per page | With 15 mock accounts and pageSize 10, only 10 rows render |

---

### `AccountDetails.test.jsx` — FR-3, FR-4

| ID | Requirement | Acceptance criterion |
|---|---|---|
| ACC-1 | Balance tiles render `current_balance_eur`, `available_balance_eur`, `overdraft_limit_eur` | All three formatted amounts are present in the DOM |
| ACC-2 | Negative balance is rendered in the error colour token | The balance element has `color: var(--cds-support-error)` style |
| ACC-3 | Skeleton shown while balance is loading | `SkeletonPlaceholder` present before `getBalanceByIban` resolves |
| ACC-4 | Transaction table renders booking date, type, and amount | All three column values are visible for each mock transaction |
| ACC-5 | Type filter hides non-matching transaction rows | After selecting `TRANSFER_OUT`, only those rows appear |
| ACC-6 | Empty transaction array shows the empty-state message | "No transactions found for this account." is visible |
| ACC-7 | Unknown `accountId` shows "Account not found." error | Error notification is visible when `getAccounts` returns no match |

---

### `Transfer.test.jsx` — FR-5, Edge Cases

| ID | Requirement | Acceptance criterion |
|---|---|---|
| TRF-1 | "Review Transfer" opens confirmation modal | Modal heading "Confirm Transfer" is visible after clicking the button |
| TRF-2 | Modal shows source IBAN, destination IBAN, and amount | All three values from the form appear in the modal |
| TRF-3 | Confirming calls `transferByIban` with the correct arguments | `transferByIban` mock called with `(srcIban, dstIban, amount)` |
| TRF-4 | Success shows notification with `new_balance_eur` | Notification kind `success` appears and contains the formatted new balance |
| TRF-5 | HTTP 403 surfaces the backend `detail` message | Notification kind `error` shows "Insufficient funds…" from mock response |
| TRF-6 | Invalid source IBAN shows inline validation error | `invalidText` for the source field is visible after blur |
| TRF-7 | Identical source and destination IBANs show a validation error | "Source and destination IBANs must differ." is visible |
| TRF-8 | Non-positive amount shows validation error | `invalidText` for the amount field is visible |
| TRF-9 | Confirm button is disabled while the transfer is in flight | Button has `disabled` during the pending mock state |
| TRF-10 | Form resets after a successful transfer | All three fields are empty after success |

---

### `OverdraftRequest.test.jsx` — FR-6

| ID | Requirement | Acceptance criterion |
|---|---|---|
| OVD-1 | Invalid IBAN shows inline error | `invalidText` for the IBAN field is visible after blur |
| OVD-2 | Amount below 0 shows inline error | `invalidText` for amount visible |
| OVD-3 | Amount above 10,000 shows inline error | `invalidText` for amount visible |
| OVD-4 | Valid submission shows the generated message text area | `TextArea` with `readOnly` and the formatted message is visible |
| OVD-5 | Generated message contains the IBAN and amount | Message text includes the submitted IBAN and formatted amount |
| OVD-6 | "Reset" button clears the form and hides the message | After reset, inputs are empty and the `TextArea` is gone |

---

### `Layout.test.jsx` — FR-7 (server status indicator)

| ID | Requirement | Acceptance criterion |
|---|---|---|
| LAY-1 | "Online" indicator shown when `checkBackendStatus` returns `true` | Text "Online" with a green dot is present in the header |
| LAY-2 | "Offline" indicator shown when `checkBackendStatus` returns `false` | Text "Offline" with a red dot is present; offline banner notification visible |
| LAY-3 | Logout button calls `useAuth().logout` and navigates to `/login` | `logout` is called; router location becomes `/login` |

---

## Edge cases covered by tests

| Case (from SPEC) | Covered by |
|---|---|
| Invalid login credentials (401) | LOG-4 |
| Backend unreachable on login | LOG-5 |
| Transfer exceeds available balance (403) | TRF-5 |
| Invalid IBAN entered | TRF-6, TRF-7, OVD-1 |
| Non-positive / missing amount | TRF-8, OVD-2, OVD-3 |
| Duplicate submit (button disabled in-flight) | TRF-9 |
| Empty transaction history | ACC-6 |
| Unknown accountId in URL | ACC-7 |
| Backend offline indicator | LAY-2 |
| `getAccounts` fetch failure | DSH-5 |

---

## How to run the tests

```bash
# One-off run (CI-friendly, exits with code 1 on failure)
cd starter/teller_frontend
npm test

# Watch mode (re-runs on file save during development)
npm run test:watch

# With coverage report (fails if below 80% lines/branches)
npm run test:coverage
```

Coverage output is written to `coverage/` (HTML + lcov). Open
`coverage/index.html` in a browser for the full line-by-line report.

---

## What is NOT changing

- No changes to any `src/` page, component, service, or utility file.
- No changes to `src/index.scss`.
- No new production dependencies — test packages are `devDependencies` only.
- The Vite proxy, `.env`, and `vite.config.js` `server` / `build` blocks are untouched.
