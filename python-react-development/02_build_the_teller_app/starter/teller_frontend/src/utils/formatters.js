// Small formatting helpers shared across pages. Pre-provided so currency/date/IBAN
// rendering is consistent and correct everywhere.

/** Format a EUR amount as "€1,234.56". */
export const formatCurrency = (amount) => {
  const n = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

/** Format an ISO timestamp as a readable date + time. */
export const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

/** Group an IBAN into blocks of four for display: DE89 8506 4317 … */
export const formatIban = (iban) => {
  if (!iban) return '';
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
};

/**
 * IBAN validation — shape check + ISO 13616 MOD-97 checksum (VULN-08).
 * A pure shape check (previous version) accepted invalid IBANs like DE00…
 * which pass the regex but have a wrong check digit.
 */
export const isValidIban = (iban) => {
  if (!iban || typeof iban !== 'string') return false;
  const clean = iban.replace(/\s/g, '').toUpperCase();

  // Shape: 2 letters + 2 digits + 1–30 alphanumerics, total 4–34 chars
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(clean)) return false;

  // MOD-97 checksum (ISO 13616):
  // 1. Move the first 4 characters to the end
  // 2. Replace each letter with its numeric value (A=10, B=11, … Z=35)
  // 3. Compute the number modulo 97 — valid IBANs give remainder 1
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

  // Process in chunks to avoid BigInt / precision issues with large numbers
  let remainder = '';
  for (const ch of numeric) {
    remainder = String(Number(remainder + ch) % 97);
  }
  return Number(remainder) === 1;
};
