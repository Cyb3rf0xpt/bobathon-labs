# GFM Bank Teller Front-End — Implementation Plan

## Constraints (hard rules, do not deviate)

1. All backend calls go through the functions already exported from
   `src/services/api.js`. No second API layer, no new axios instance, no Vite
   proxy change.
2. Auth state is managed exclusively through `useAuth()` from
   `src/auth/AuthContext.jsx`. No local token handling in pages.
3. The Carbon stylesheet is the single `@use '@carbon/react';` already in
   `src/index.scss`. **Never add another Carbon CSS/SCSS import anywhere** —
   doing so breaks the Sass build.
4. `@carbon/react` v1.110.0 (Carbon v11) is installed. All imports below are
   verified for this version.
5. All formatting uses the helpers already in `src/utils/formatters.js`
   (`formatCurrency`, `formatDateTime`, `formatIban`, `isValidIban`).

---

## Assumptions

| # | Assumption | Rationale |
|---|---|---|
| A1 | `.env` file will be created at `starter/teller_frontend/.env` with `VITE_TELLER_USERNAME` and `VITE_TELLER_PASSWORD` before first run. Login.jsx already reads these env vars. | Login stub already uses these exact names. |
| A2 | `checkBackendStatus` polls `GET /docs` (already implemented in api.js). The plan uses this as-is; no endpoint change. | api.js line 71. |
| A3 | AccountDetails resolves the IBAN by calling `getAccounts()` and looking up the `accountId` from the URL param, then calling `getBalanceByIban(iban)`. This survives page refresh and direct URL navigation. | `getAccounts()` is cached implicitly by the browser for the session; the 1,000-record response is fast enough for this. |
| A4 | The Dashboard accounts table is paginated with Carbon `Pagination` (10 rows per page default). Client-side IBAN substring filter is applied before pagination. | ~1,000 accounts from `getAccounts()` — no server-side search exists. |
| A5 | The connectivity indicator lives in the Layout header and polls every 30 seconds using `setInterval` in a `useEffect`. It calls `checkBackendStatus()`. | FR-7.2. |
| A6 | The Transfer page sources the source IBAN from a `TextInput` (free-entry), not a dropdown over 1,000 accounts. A `ComboBox` over 1,000 items is sluggish; free entry + `isValidIban()` validation is faster for a teller. | Tellers know the IBAN from the customer. |
| A7 | The SideNav is a fixed left rail (not a hamburger-toggle overlay) using `SideNavItems` + `SideNavLink`. This matches the Carbon UI Shell pattern for desktop workstations. | NFR: desktop-first banking workstation. |
| A8 | Negative currency amounts are rendered with an inline `style={{ color: 'var(--cds-support-error)' }}` — the Carbon error token — rather than a custom class. This stays within Carbon design tokens. | NFR: no custom colour overrides outside tokens. |

---

## Build order

Files are listed in dependency order. Each file depends only on files above it.

```
1. src/components/Layout.jsx          — shell, nav, connectivity indicator
2. src/pages/Login.jsx                — Carbon login form
3. src/pages/Dashboard.jsx           — accounts table
4. src/pages/AccountDetails.jsx      — balance + transaction history
5. src/pages/Transfer.jsx            — transfer form + confirmation modal
6. src/pages/OverdraftRequest.jsx    — overdraft request form
```

No new files need to be created. `App.jsx`, `main.jsx`, `AuthContext.jsx`,
`ProtectedRoute.jsx`, `api.js`, and `formatters.js` are **not touched**.

---

## File 1 — `src/components/Layout.jsx`

**Replaces:** the temporary `<nav>` scaffold.

### What it does
- Renders the Carbon UI Shell: `Header` with GFM Bank branding, `HeaderGlobalBar`
  with a logout action, and a fixed left `SideNav` with links to Dashboard,
  Transfer, and Overdraft Request.
- Hosts the online/offline connectivity indicator in the header global bar.
- Renders `<Outlet />` in the main content area with correct left-offset for the
  side nav.

### api.js functions used
| Function | Purpose |
|---|---|
| `checkBackendStatus()` | Polled every 30 s in a `useEffect`; result drives the indicator |

### State
| Variable | Type | Purpose |
|---|---|---|
| `isOnline` | `boolean` | `true` = backend reachable |

### Logic
```
useEffect(() => {
  const check = async () => setIsOnline(await checkBackendStatus());
  check();                               // immediate on mount
  const id = setInterval(check, 30_000);
  return () => clearInterval(id);
}, []);
```
Logout: calls `useAuth().logout()` then `navigate('/login')`.

### Carbon components & verified imports (`@carbon/react` v1.110.0)

```js
import {
  Header,
  HeaderContainer,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from '@carbon/react';
```

- `Header` — top bar, `aria-label="GFM Bank Teller Portal"`
- `HeaderName` — "GFM Bank" prefix + "Teller Portal" text, links to `/dashboard`
- `HeaderGlobalBar` — right-side icon actions
- `HeaderGlobalAction` — logout button (icon-only, needs `aria-label`)
- `SideNav` — fixed left rail, `isFixedNav`, `expanded`, `aria-label="Side navigation"`
- `SideNavItems` / `SideNavLink` — Dashboard, Transfer, Overdraft Request links
- `SkipToContent` — accessibility skip link

### Icons needed (from `@carbon/icons-react`)
- Logout icon → query MCP at build time for exact export name
- Status indicator: use a colored `<span>` with a `•` character styled with
  `var(--cds-support-success)` / `var(--cds-support-error)` — avoids icon name
  guessing for a simple dot indicator.

### Layout offset
The main content area needs `padding-left: 16rem` (256 px) to clear the fixed
side nav. Apply via `style={{ marginLeft: '16rem', padding: '2rem' }}` on the
`<main>` element wrapping `<Outlet />`.

---

## File 2 — `src/pages/Login.jsx`

**Replaces:** the plain-HTML stub.

### What it does
- Renders a centered Carbon login card: GFM Bank heading, username + password
  inputs, sign-in button, and inline error notification on failure.
- Pre-fills inputs from `import.meta.env.VITE_TELLER_USERNAME` /
  `VITE_TELLER_PASSWORD` (already in stub; keep exactly these env var names).
- On success, navigates to `/dashboard`.

### api.js functions used
None directly — calls `useAuth().login(username, password)` which delegates to
`api.login()`.

### State
| Variable | Type | Purpose |
|---|---|---|
| `username` | `string` | Controlled input |
| `password` | `string` | Controlled input |
| `error` | `string \| null` | Error message; `null` = no error shown |
| `busy` | `boolean` | Disables button + shows spinner while request in flight |

### Error handling (matches existing stub logic — keep it)
- `err.response.status === 401` → "Invalid username or password."
- anything else → "Could not reach the backend — it may be waking up (~15 s). Please try again."

### Carbon components & verified imports

```js
import {
  Form,
  FormGroup,
  TextInput,
  PasswordInput,
  Button,
  InlineNotification,
  Stack,
  Tile,
  Heading,
} from '@carbon/react';
```

- `Tile` — white card container, centered on page
- `Heading` — "GFM Bank — Teller Portal" h1
- `Form` — wraps inputs + button; `onSubmit` handler
- `Stack` — vertical spacing between form elements (gap 6)
- `TextInput` — username; `id="username"`, `labelText="Username"`,
  `autoComplete="username"`
- `PasswordInput` — password; `id="password"`, `labelText="Password"`,
  `autoComplete="current-password"`
- `Button` — type `"submit"`, `disabled={busy || !username || !password}`,
  kind `"primary"`, full-width
- `InlineNotification` — kind `"error"`, shown only when `error !== null`;
  `title="Sign-in failed"`, `subtitle={error}`

### Layout
Outer wrapper: `display:flex; align-items:center; justify-content:center;
min-height:100vh; background:var(--cds-background)`.
`Tile` max-width 400 px.

---

## File 3 — `src/pages/Dashboard.jsx`

**Replaces:** the one-line TODO stub.

### What it does
- Loads all accounts on mount via `getAccounts()`.
- Renders a Carbon `DataTable` with client-side IBAN substring search and
  `Pagination`.
- Each row has a "View" button that navigates to `/accounts/:accountId`.

### api.js functions used
| Function | Purpose |
|---|---|
| `getAccounts()` | Fetches ~1,000 accounts on mount; cached in component state |

### State
| Variable | Type | Purpose |
|---|---|---|
| `accounts` | `array` | Full list from `getAccounts()` |
| `filter` | `string` | Current IBAN search string |
| `loading` | `boolean` | Shows skeleton while fetching |
| `error` | `string \| null` | Shown in `InlineNotification` on fetch failure |
| `page` | `number` | Current pagination page |
| `pageSize` | `number` | Rows per page (default 10) |

### Derived values (computed, no extra state)
```js
const filtered = accounts.filter(a =>
  a.iban.includes(filter.replace(/\s/g, '').toUpperCase())
);
const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
```

### Carbon components & verified imports

```js
import {
  DataTable,
  Table,
  TableContainer,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Pagination,
  Button,
  InlineNotification,
  SkeletonText,
  Grid,
  Column,
} from '@carbon/react';
```

- `TableContainer` — `title="Accounts"`, `description="Search by IBAN"`
- `TableToolbar` + `TableToolbarSearch` — calls `setFilter(value)` on change;
  `persistent` prop so the search box is always visible
- `DataTable` — columns: `IBAN`, `Account ID`, `Actions`
- `TableCell` in Actions column — `<Button size="sm" kind="ghost"
  onClick={() => navigate(`/accounts/${row.account_id}`)}>`View`</Button>`
- `Pagination` — `totalItems={filtered.length}`, `pageSize={pageSize}`,
  `page={page}`, updates `page` + `pageSize` via `onChange`
- `SkeletonText` — shown in place of table while `loading === true` (3 lines)
- `InlineNotification` — shown when `error !== null`

### Columns definition
```js
const headers = [
  { key: 'iban',       header: 'IBAN'       },
  { key: 'account_id', header: 'Account ID' },
];
```
IBAN cells render `formatIban(row.iban)` for grouped display.

---

## File 4 — `src/pages/AccountDetails.jsx`

**Replaces:** the `useParams` stub.

### What it does
- Resolves `accountId` → IBAN by calling `getAccounts()` and finding the match.
- Calls `getBalanceByIban(iban)` for the balance summary tile.
- Calls `getTransactions(accountId)` for the full ledger table.
- Supports sort by `booking_ts` (default desc) and `amount_eur`.
- Supports filter by transaction `type` via a `MultiSelect` dropdown.

### api.js functions used
| Function | Purpose |
|---|---|
| `getAccounts()` | Resolve `accountId` → `iban` |
| `getBalanceByIban(iban)` | Balance summary: current, available, overdraft, recent_transactions |
| `getTransactions(accountId)` | Full ledger for the DataTable |

### State
| Variable | Type | Purpose |
|---|---|---|
| `iban` | `string \| null` | Resolved from accounts list |
| `balance` | `object \| null` | Response from `getBalanceByIban` |
| `transactions` | `array` | Response from `getTransactions` |
| `loadingBalance` | `boolean` | Skeleton on balance tile |
| `loadingTx` | `boolean` | Skeleton on table |
| `error` | `string \| null` | Any fetch error |
| `sortKey` | `'booking_ts' \| 'amount_eur'` | Active sort column |
| `sortDir` | `'asc' \| 'desc'` | Sort direction (default `'desc'`) |
| `typeFilter` | `string[]` | Selected types; empty = show all |

### IBAN resolution (Assumption A3)
```js
useEffect(() => {
  getAccounts().then(list => {
    const match = list.find(a => a.account_id === accountId);
    if (match) setIban(match.iban);
    else setError('Account not found.');
  });
}, [accountId]);

useEffect(() => {
  if (!iban) return;
  setLoadingBalance(true);
  getBalanceByIban(iban)
    .then(setBalance)
    .finally(() => setLoadingBalance(false));
  setLoadingTx(true);
  getTransactions(accountId)
    .then(setTransactions)
    .finally(() => setLoadingTx(false));
}, [iban]);
```

### Derived values
```js
const displayed = transactions
  .filter(tx => typeFilter.length === 0 || typeFilter.includes(tx.type))
  .sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    return sortKey === 'amount_eur'
      ? mul * (a.amount_eur - b.amount_eur)
      : mul * (new Date(a.booking_ts) - new Date(b.booking_ts));
  });
```

### Carbon components & verified imports

```js
import {
  Grid,
  Column,
  Tile,
  SkeletonText,
  SkeletonPlaceholder,
  DataTable,
  Table,
  TableContainer,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  MultiSelect,
  InlineNotification,
  Button,
  Tag,
} from '@carbon/react';
```

### Balance summary tile (FR-3.1)
Four `Tile` components in a `Grid` row (each `Column sm={4} md={2} lg={4}`):
- Current Balance — `formatCurrency(balance.current_balance_eur)`, red if negative
- Available Balance — `formatCurrency(balance.available_balance_eur)`, red if negative
- Overdraft Limit — `formatCurrency(balance.overdraft_limit_eur)`
- Account IBAN — `formatIban(iban)`

Skeleton: `SkeletonPlaceholder` (height 80 px) while `loadingBalance`.

### Transaction table (FR-4)
Columns: `Date / Time`, `Type`, `Amount`.
- `booking_ts` → `formatDateTime()`
- `amount_eur` → `formatCurrency()`, negative = red `style`
- `type` → Carbon `Tag` (kind mapping: `PAYMENT`→`blue`, `TRANSFER_IN`→`green`,
  `TRANSFER_OUT`→`red`, `FEE_REVERSAL`→`purple`, `MANUAL_ADJ`→`gray`)
- Sort toggled by clicking `TableHeader` (uses `isSortable` + `sortDirection` props)
- Type filter: `MultiSelect` in `TableToolbarContent`; items = 5 type values
- Empty state: `TableRow` with single `TableCell` colspan 3,
  "No transactions found for this account."

---

## File 5 — `src/pages/Transfer.jsx`

**Replaces:** the one-line TODO stub.

### What it does
- Two-step form: (1) fill in source IBAN, destination IBAN, amount; (2) confirm
  modal before posting; (3) success or error notification.
- Disables the submit button on first click until the API responds (FR edge-case:
  duplicate submit prevention).

### api.js functions used
| Function | Purpose |
|---|---|
| `transferByIban(src, dst, amount)` | POST `/iban-transfer` |

### State
| Variable | Type | Purpose |
|---|---|---|
| `sourceIban` | `string` | Controlled input |
| `destIban` | `string` | Controlled input |
| `amount` | `string` | Controlled input (string for input; parsed to float on submit) |
| `confirmOpen` | `boolean` | Whether the confirmation modal is open |
| `busy` | `boolean` | Disables confirm button, shows spinner |
| `result` | `object \| null` | Success response (`new_balance_eur` etc.) |
| `error` | `string \| null` | Error message (from `detail` on 403, or generic) |

### Flow
1. Teller fills form → client-side validation (`isValidIban`, amount > 0).
2. "Transfer" button opens `Modal` (sets `confirmOpen = true`). Button stays
   enabled so teller can review; does NOT call the API yet.
3. Modal shows summary: source IBAN, destination IBAN, amount formatted.
   Primary action "Confirm Transfer" → calls `transferByIban`, sets `busy=true`.
4. On success: closes modal, shows `InlineNotification` kind `"success"` with
   `new_balance_eur`. Resets form.
5. On HTTP 403: closes modal, shows `InlineNotification` kind `"error"` with
   `err.response.data.detail`.
6. On other errors: shows generic error notification.

### Carbon components & verified imports

```js
import {
  Form,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Modal,
  InlineNotification,
  Grid,
  Column,
  Tile,
} from '@carbon/react';
```

- `TextInput` — source IBAN (`id="source-iban"`, `labelText="Source IBAN"`)
- `TextInput` — destination IBAN (`id="dest-iban"`, `labelText="Destination IBAN"`)
- `NumberInput` — amount (`id="amount"`, `labelText="Amount (EUR)"`, `min={0.01}`,
  `step={0.01}`); note: `NumberInput` value is managed as a string in state, parsed
  to `parseFloat` before the API call
- `Button` kind `"primary"` — "Review Transfer" (opens modal); disabled if
  validation fails
- `Modal` — `open={confirmOpen}`, `modalHeading="Confirm Transfer"`,
  `primaryButtonText="Confirm Transfer"`, `secondaryButtonText="Cancel"`,
  `primaryButtonDisabled={busy}`, `onRequestSubmit` calls API,
  `onRequestClose` closes modal
- `InlineNotification` — success or error, shown after modal closes

---

## File 6 — `src/pages/OverdraftRequest.jsx`

**Replaces:** the one-line TODO stub.

### What it does
- Form: IBAN input + amount (0–10,000 EUR).
- On submit calls `buildOverdraftRequest(iban, amount)` from api.js, which
  returns a formatted string.
- Displays the result in a read-only `TextArea` for the teller to copy.
- No API call is made.

### api.js functions used
| Function | Purpose |
|---|---|
| `buildOverdraftRequest(iban, amount)` | Returns formatted request string; throws if amount out of range |

### State
| Variable | Type | Purpose |
|---|---|---|
| `iban` | `string` | Controlled input |
| `amount` | `string` | Controlled input |
| `message` | `string \| null` | Generated request text; `null` = not yet generated |
| `error` | `string \| null` | Validation error from `buildOverdraftRequest` |

### Validation (client-side, before calling buildOverdraftRequest)
- `isValidIban(iban)` → show `TextInput` invalid state
- `parseFloat(amount)` between 0 and 10,000 inclusive → show `NumberInput`
  invalid state
- Both must pass before enabling "Generate Request" button.

### Carbon components & verified imports

```js
import {
  Form,
  Stack,
  TextInput,
  NumberInput,
  TextArea,
  Button,
  InlineNotification,
  Grid,
  Column,
  Tile,
} from '@carbon/react';
```

- `TextInput` — IBAN; `id="od-iban"`, `labelText="Account IBAN"`,
  `invalid={ibanTouched && !isValidIban(iban)}`,
  `invalidText="Enter a valid IBAN (e.g. DE89…)"`
- `NumberInput` — amount; `id="od-amount"`, `labelText="Requested Overdraft (EUR)"`,
  `min={0}`, `max={10000}`, `step={100}`,
  `invalid={amountTouched && (amt < 0 || amt > 10000)}`,
  `invalidText="Amount must be between €0 and €10,000"`
- `Button` kind `"primary"` — "Generate Request"; disabled until both inputs valid
- `TextArea` — `readOnly`, `labelText="Back-Office Request Message"`,
  `value={message || ''}`, rows 6; shown only when `message !== null`
- `InlineNotification` kind `"error"` — shown if `buildOverdraftRequest` throws
  (out-of-range guard)

---

## Shared patterns across all pages

### Error boundary (no new component needed)
Every page wraps its main `useEffect` fetch calls in `try/catch` and stores the
error string in local state, then renders `<InlineNotification kind="error"
title="Error" subtitle={error} />` at the top of the page body.

### Loading skeletons
Every data-fetching page shows `SkeletonText` (3–4 lines) or
`SkeletonPlaceholder` while the initial fetch is in flight. Never show an empty
table or blank tile during load.

### `session-expired` event
`AuthContext.jsx` already listens for this event and clears the token (sets
`isAuthenticated = false`), which causes `ProtectedRoute` to redirect to `/login`.
Pages do not need to handle 401 — the interceptor in `api.js` fires the event
and `AuthContext` reacts to it.

### Currency colour
All negative amounts: `style={{ color: 'var(--cds-support-error)' }}`.
All positive amounts: default (no inline style needed).

---

## `.env` file (create before first `npm run dev`)

```
# starter/teller_frontend/.env
VITE_API_BASE_URL=/api
VITE_TELLER_USERNAME=teller
VITE_TELLER_PASSWORD=teller123
```

`VITE_API_BASE_URL` is already read by `api.js` line 16. The two credential vars
are already read by `Login.jsx` (stub) — kept with the same names.

---

## What is deliberately NOT changed

| File | Reason |
|---|---|
| `src/App.jsx` | Routes are already correct |
| `src/main.jsx` | Entry point wiring is complete |
| `src/auth/AuthContext.jsx` | Auth logic is complete and correct |
| `src/auth/ProtectedRoute.jsx` | Works correctly as-is |
| `src/services/api.js` | Full service layer is already implemented |
| `src/utils/formatters.js` | All helpers are already provided |
| `src/index.scss` | One-line Carbon import is correct; do not touch |
| `vite.config.js` | Proxy is already configured |
