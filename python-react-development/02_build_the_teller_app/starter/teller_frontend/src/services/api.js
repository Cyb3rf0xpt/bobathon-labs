// GFM Bank Core Banking API client.
//
// Security notes:
//   - Token is kept in memory only (VULN-06): sessionStorage was removed because any
//     same-origin JS (XSS, compromised dependency) can read sessionStorage.
//     The trade-off is that a page refresh requires re-login, which is acceptable for
//     a teller workstation.
//   - accountId / IBAN path params are validated before use (VULN-04).
//   - session-expired event is protected with a one-time nonce (VULN-09).
//   - Login is rate-limited client-side (VULN-07).
//   - Connectivity check polls an authenticated endpoint (VULN-11).
//   - Transfer response is schema-validated (VULN-10).

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({ baseURL: API_BASE_URL });

// ---------------------------------------------------------------------------
// VULN-06: Token stored in memory only — NOT sessionStorage.
// sessionStorage is readable by any same-origin JS. A page refresh will require
// re-login, which is the correct security trade-off for a banking workstation.
// ---------------------------------------------------------------------------
let authToken = null;

export const getAuthToken = () => authToken;

export const setAuthToken = (token) => {
  authToken = token || null;
  if (authToken) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// ---------------------------------------------------------------------------
// VULN-09: session-expired event hardening.
// A random nonce is generated at module load. Only events carrying this nonce
// are acted on, preventing an attacker (via XSS) from dispatching a bare
// CustomEvent to force logout.
// ---------------------------------------------------------------------------
const SESSION_NONCE = crypto.randomUUID();

export const dispatchSessionExpired = () => {
  window.dispatchEvent(new CustomEvent('session-expired', { detail: { nonce: SESSION_NONCE } }));
};

export const SESSION_NONCE_VALUE = SESSION_NONCE;

// Auto-logout signal on 401 — AuthContext listens and verifies the nonce.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      dispatchSessionExpired();
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// VULN-04: Input validation helpers — validate before interpolating into URLs.
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const assertUuid = (value, label) => {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid ${label}: must be a UUID`);
  }
};

// ---------------------------------------------------------------------------
// VULN-07: Client-side login rate limiting.
// Max 5 attempts, then a 30-second cooldown. This does not replace server-side
// throttling but adds a UX friction layer against scripted brute-force.
// ---------------------------------------------------------------------------
let loginAttempts = 0;
let loginLockedUntil = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Log in with the OAuth2 form flow. Stores the bearer token in memory. */
export const login = async (username, password) => {
  const now = Date.now();
  if (now < loginLockedUntil) {
    const secs = Math.ceil((loginLockedUntil - now) / 1000);
    throw new Error(`Too many failed attempts. Please wait ${secs} seconds.`);
  }

  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);

  try {
    const { data } = await apiClient.post('/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    // Successful login resets the counter
    loginAttempts = 0;
    loginLockedUntil = 0;
    setAuthToken(data.access_token);
    return data;
  } catch (err) {
    if (err?.response?.status === 401) {
      loginAttempts += 1;
      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        loginLockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
        loginAttempts = 0;
      }
    }
    throw err;
  }
};

export const logout = () => setAuthToken(null);

// ---------------------------------------------------------------------------
// VULN-11: Connectivity check polls an authenticated endpoint.
// Polling /docs (unauthenticated) only proved the proxy was alive, not that
// the authenticated banking API was functional. We now POST to /balance-inquiry
// with a known test IBAN using the current bearer token. A 200 or 422 means
// the backend is alive and auth is working; anything else is treated as offline.
// ---------------------------------------------------------------------------
const CONNECTIVITY_TEST_IBAN = import.meta.env.VITE_CONNECTIVITY_IBAN || 'DE89545769475769453536';

export const checkBackendStatus = async () => {
  if (!authToken) {
    // Not logged in — do a lightweight unauthenticated probe instead
    try {
      await apiClient.get('/docs', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await apiClient.post('/balance-inquiry', { iban: CONNECTIVITY_TEST_IBAN }, { timeout: 5000 });
    return true;
  } catch (err) {
    // 422 (validation error on IBAN) still means the backend and auth are working
    if (err?.response?.status === 422 || err?.response?.status === 404) return true;
    // 401 means the session is gone — treat as offline (interceptor handles logout)
    return false;
  }
};

// ---------------------------------------------------------------------------
// Accounts & transactions
// ---------------------------------------------------------------------------

/** List all accounts: [{ account_id, iban, customer_id }]. ~1000 rows. */
export const getAccounts = async () => (await apiClient.get('/accounts')).data;

/** Find one account by IBAN, or null. */
export const findAccountByIban = async (iban) => {
  const accounts = await getAccounts();
  return accounts.find((a) => a.iban === iban) || null;
};

/** Full transaction ledger for an account_id (UUID-validated). */
export const getTransactions = async (accountId) => {
  // VULN-04: validate before interpolating into the URL path
  assertUuid(accountId, 'accountId');
  return (await apiClient.get(`/transactions/${accountId}`)).data;
};

/**
 * Balance inquiry by IBAN — backend-computed balance, overdraft limit, and recent
 * transactions in one call.
 */
export const getBalanceByIban = async (iban) =>
  (await apiClient.post('/balance-inquiry', { iban })).data;

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

// VULN-10: Expected shape of a successful /iban-transfer response.
const isValidTransferResponse = (data) =>
  data &&
  typeof data === 'object' &&
  data.status === 'POSTED' &&
  typeof data.new_balance_eur === 'number' &&
  typeof data.amount_eur === 'number' &&
  typeof data.source_iban === 'string' &&
  typeof data.destination_iban === 'string';

/**
 * Transfer between two IBANs.
 * Throws if the backend response does not match the expected schema (VULN-10).
 */
export const transferByIban = async (sourceIban, destinationIban, amountEur) => {
  const { data } = await apiClient.post('/iban-transfer', {
    source_iban: sourceIban,
    destination_iban: destinationIban,
    amount_eur: amountEur,
  });
  // VULN-10: validate the response shape before trusting it
  if (!isValidTransferResponse(data)) {
    throw new Error('Unexpected response from transfer endpoint. The transfer status is unknown — please check the account balance before retrying.');
  }
  return data;
};

// ---------------------------------------------------------------------------
// Overdraft request (client-side only; not a teller API capability)
// ---------------------------------------------------------------------------

/** Build the back-office overdraft request message (0–10,000 EUR). */
export const buildOverdraftRequest = (iban, amount) => {
  if (amount < 0 || amount > 10000) {
    throw new Error('Overdraft amount must be between 0 and 10,000 EUR');
  }
  return (
    `Overdraft Request\n\n` +
    `Account: ${iban}\n` +
    `Requested Overdraft Amount: €${Number(amount).toFixed(2)}\n\n` +
    `This request requires back-office approval.`
  );
};

export default apiClient;
