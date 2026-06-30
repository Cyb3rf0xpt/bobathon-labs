# GFM Bank — Teller Front-End Specification

## Overview

A modern, professional banking teller interface built with React and the IBM Carbon Design System, connecting to the existing GFM Bank Core Banking backend — the same API used by `teller_client.py`. The application gives bank tellers a fast, accessible, browser-based workstation for the daily operations they perform on behalf of customers: looking up accounts, checking balances, reviewing transaction history, initiating transfers, and submitting overdraft requests to the back-office team.

---

## Goals

- **Account lookup** — allow a teller to find a customer account by IBAN using client-side search across the full accounts list. Customer names are not available to the teller role.
- **Balance inquiry** — display the current balance, available balance, overdraft limit, and recent transactions for any account using `POST /balance-inquiry`.
- **Transaction history** — show the full transaction ledger for a selected account via `GET /transactions/{account_id}`, with signed amounts and transaction types, sortable and filterable by date, amount, and type.
- **IBAN transfer** — enable the teller to move funds between two accounts by IBAN via `POST /iban-transfer`, with a confirmation modal before submission and clear feedback including the new balance on success or the backend's `detail` message on failure.
- **Overdraft request** — collect the IBAN and requested overdraft amount (0–10,000 EUR) and produce a formatted request message for the back-office team. This is a client-side action only — no API call is made.
- **Secure session** — authenticate via `POST /token` (form-encoded, not JSON) and carry the bearer token on every subsequent request. Logout clears the token; there is no server-side expiry on this backend.
- **Accessibility & usability** — meet Carbon Design System accessibility standards so the interface is usable by all tellers, including keyboard-only and screen-reader users.

---

## Functional Requirements

### FR-1 Authentication

- **FR-1.1** The login form POSTs `application/x-www-form-urlencoded` (not JSON) to `POST /token` with `username` and `password` fields. Sending JSON returns HTTP 422; the implementation must use `URLSearchParams`.
- **FR-1.2** On success the app stores the returned `access_token` in memory or `sessionStorage` and attaches it as `Authorization: Bearer <token>` on every subsequent request.
- **FR-1.3** Credentials are read from a `.env` file (`VITE_TELLER_USER`, `VITE_TELLER_PASS`) and pre-filled into the login form; the teller may override them.
- **FR-1.4** On HTTP 401 the app displays an inline error ("Invalid credentials") and does not navigate away from the login screen.
- **FR-1.5** A logout action clears the stored token and returns the teller to the login screen. There is no automatic expiry — logout is always manual.

### FR-2 Account Lookup

- **FR-2.1** On login the app fetches the full account list from `GET /accounts` (≈1,000 records) and caches it for the session.
- **FR-2.2** The teller can filter accounts by typing an IBAN substring; filtering is performed client-side against the cached list.
- **FR-2.3** Each result row shows `iban` and `account_id`. Customer names are not displayed — the teller role has no access to `GET /customers`.
- **FR-2.4** Selecting an account navigates to its detail view.

### FR-3 Balance Inquiry

- **FR-3.1** The account detail view calls `POST /balance-inquiry` with the account's IBAN and displays `current_balance_eur`, `available_balance_eur`, `overdraft_limit_eur`, and the `recent_transactions` array returned by the backend.
- **FR-3.2** All monetary values are formatted as EUR with two decimal places and thousands separators, e.g. `€1,234.56` (locale `en-IE` or equivalent). Negative values are displayed in red.
- **FR-3.3** While the request is in flight a Carbon skeleton loading state is shown in place of the balance figures.

### FR-4 Transaction History

- **FR-4.1** The full ledger view calls `GET /transactions/{account_id}` and renders results in a Carbon DataTable.
- **FR-4.2** The table displays columns: `booking_ts` (formatted as local date/time), `type`, `amount_eur` (formatted currency, signed). `tx_id` and `account_id` are omitted from the visible columns.
- **FR-4.3** The table is sortable by `booking_ts` (default: descending) and `amount_eur`.
- **FR-4.4** The teller can filter rows by transaction `type` (multi-select: `PAYMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `FEE_REVERSAL`, `MANUAL_ADJ`).
- **FR-4.5** An empty array is a valid response (zero-activity account); the UI displays an empty-state message rather than an error.

### FR-5 IBAN Transfer

- **FR-5.1** The transfer form collects source IBAN, destination IBAN, and amount (positive EUR value).
- **FR-5.2** Before submitting, the app shows a Carbon confirmation modal summarising source IBAN, destination IBAN, and amount. The transfer is only posted after the teller confirms.
- **FR-5.3** The app posts `POST /iban-transfer` with `{ source_iban, destination_iban, amount_eur }`. It must **not** use the legacy `POST /transfer` endpoint — that route returns HTTP 500 on the deployed backend.
- **FR-5.4** On success (`status: "POSTED"`) the app displays a success notification including `new_balance_eur` for the source account.
- **FR-5.5** On HTTP 403 the app surfaces the backend's `detail` field (e.g. "Insufficient funds. Balance -50530.51, overdraft 0.00") as an inline error notification.

### FR-6 Overdraft Request

- **FR-6.1** The overdraft request form collects the IBAN and a requested limit in EUR (0–10,000; validated client-side).
- **FR-6.2** On submission the app produces a formatted request message, e.g.:  
  `*** OVERDRAFT REQUEST *** Please grant €500.00 overdraft on DE89545769475769453536`  
  and displays it in a read-only text area for the teller to copy and forward to the back-office team.
- **FR-6.3** No API call is made. This is a purely client-side action.

### FR-7 Backend Connectivity Indicator

- **FR-7.1** The UI Shell header displays a status indicator (online / offline).
- **FR-7.2** The indicator polls `POST /token` (or an equivalent lightweight endpoint) every 30 seconds to determine reachability.
- **FR-7.3** If the backend is unreachable the indicator turns red and a banner notifies the teller that the backend is offline; all action buttons are disabled.

### FR-8 Currency Formatting

- **FR-8.1** All EUR amounts throughout the application are formatted consistently: two decimal places, thousands separator, `€` prefix, e.g. `€1,234.56`.
- **FR-8.2** Negative amounts are rendered in red; positive amounts in the default text colour.
- **FR-8.3** A shared utility function (`formatCurrency`) is used for all formatting — no inline `toFixed` calls scattered through components.

---

## Non-Functional Requirements

### Design
- Use the IBM Carbon Design System (`@carbon/react` v11) for all UI components.
- Apply a professional banking theme: Carbon blues, grays, and whites; no custom colour overrides outside Carbon design tokens.
- Use the Carbon UI Shell (`Header`, `SideNav`) as the application layout frame.
- Use Carbon `DataTable` for all tabular data, Carbon `InlineNotification` / `ToastNotification` for feedback, Carbon `SkeletonText` / `SkeletonPlaceholder` for loading states, and Carbon `Modal` for confirmation dialogs.

### Security
- Store teller credentials in a `.env` file (`VITE_TELLER_USER`, `VITE_TELLER_PASS`); never hard-code them in source files.
- Store the bearer token in `sessionStorage` (cleared on tab close) or in-memory only — not in `localStorage`.
- Logout always clears the stored token. Note: this backend issues a static token with no server-side expiry; there is nothing to revoke.
- Sanitize all user-supplied inputs (IBAN, amount) before sending to the API.
- All API calls go over HTTPS. In development, calls are proxied through the Vite dev server (`/api/...`) to avoid CORS errors — the backend does not send `Access-Control-Allow-Origin` headers and cannot be called directly from the browser.

### Accessibility
- All interactive elements have descriptive ARIA labels.
- Full keyboard navigation is supported (tab order, focus management in modals).
- Colour is never the sole means of conveying information (e.g. negative balance shows both red colour and a minus sign).

### Responsiveness
- The layout is usable at desktop (1280 px+), laptop (1024 px), and tablet (768 px) widths using the Carbon 16-column grid.

### Technical constraints
- React 18 functional components with hooks only — no class components.
- React Router v6 for client-side navigation.
- Project structure: `src/pages/`, `src/components/`, `src/services/`, `src/utils/`.
- Use the Vite starter in `starter/` — its `vite.config.js` already configures the `/api` proxy to the backend base URL. Do not scaffold a new project.
- Axios or the Fetch API for HTTP calls; wrap in a service layer (`src/services/api.js`) rather than calling fetch/axios directly from components.
- Environment-based configuration via Vite `import.meta.env` variables.

---

## Edge Cases & Failure Modes

| Case | Expected behaviour |
|---|---|
| Backend offline / connectivity check fails | Status indicator turns red; a banner notifies the teller; all action buttons are disabled until connectivity is restored. |
| Invalid login credentials (HTTP 401) | Inline error shown on the login form: "Invalid credentials. Please try again." No navigation occurs. |
| Transfer exceeds available balance (HTTP 403) | The backend's `detail` message (e.g. "Insufficient funds. Balance X, overdraft Y") is shown as an inline error notification on the transfer form. |
| Invalid or unknown IBAN entered | If not found in the cached accounts list, show an inline validation error before making any API call. If `POST /balance-inquiry` returns an error, show a notification: "Account not found." |
| Session token absent or cleared mid-session | Any API call returning HTTP 401 clears the token and redirects to the login screen with a notification: "Your session has ended. Please log in again." |
| Network timeout or API error during an operation | Show a Carbon `InlineNotification` (kind: error) with a human-readable message. Never expose raw stack traces or internal error objects to the teller. |
| Empty transaction history | Display an empty-state message in the DataTable: "No transactions found for this account." This is a valid backend response, not an error. |
| Duplicate / double-submitted transaction | Disable the submit button and show a spinner immediately after the first click. Re-enable only after the API response (success or error) is received. |

---

## Out of Scope

- **Deposits, withdrawals, and account creation** — the backend exposes no teller endpoints for these operations. The only manual transaction route (`POST /transactions/{account_id}`) requires the `BACKOFFICE` role and returns HTTP 403 for a teller token.
- **Back-office / administrative functions** — customer lookup (`GET /customers`), overdraft approval (`PATCH /accounts/{id}/overdraft`), manual postings, and fee reversals are back-office-only and will be addressed in Part 4 of the lab.
- **Customer-facing self-service banking** — this is an internal teller workstation, not a consumer app.
- **Real payment settlement or interbank clearing** — the backend is a demo system; no real funds move.
- **Multi-currency support** — all accounts and transactions are denominated in EUR only.
- **Data persistence beyond the backend** — the front-end holds no local database. All state comes from the Core Banking API.
- **The legacy `POST /transfer` endpoint** — it exists in `teller_client.py` but returns HTTP 500 on the deployed backend. The front-end must use `POST /iban-transfer` exclusively.
