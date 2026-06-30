import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDateTime,
  formatIban,
  isValidIban,
} from './formatters';

describe('formatCurrency', () => {
  it('FMT-1: formats a positive EUR amount', () => {
    expect(formatCurrency(1234.56)).toBe('€1,234.56');
  });

  it('FMT-2: formats a negative EUR amount', () => {
    const result = formatCurrency(-50530.51);
    expect(result).toMatch(/50[,.]?530/);
    expect(result).toContain('€');
  });

  it('FMT-3: formats zero', () => {
    expect(formatCurrency(0)).toBe('€0.00');
  });

  it('FMT-4: handles NaN gracefully', () => {
    expect(() => formatCurrency(NaN)).not.toThrow();
    expect(formatCurrency(NaN)).toBe('€0.00');
  });

  it('FMT-4b: handles undefined gracefully', () => {
    expect(() => formatCurrency(undefined)).not.toThrow();
    expect(formatCurrency(undefined)).toBe('€0.00');
  });
});

describe('formatDateTime', () => {
  it('FMT-5: formats a valid ISO timestamp', () => {
    const result = formatDateTime('2025-05-16T18:35:29');
    expect(result).toBeTruthy();
    expect(result).toMatch(/2025/);
  });

  it('FMT-6: handles null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('FMT-6b: handles empty string', () => {
    expect(formatDateTime('')).toBe('');
  });
});

describe('formatIban', () => {
  it('FMT-7: groups IBAN into blocks of 4', () => {
    expect(formatIban('DE89545769475769453536')).toBe('DE89 5457 6947 5769 4535 36');
  });
});

describe('isValidIban', () => {
  it('FMT-8: accepts a valid IBAN', () => {
    expect(isValidIban('DE89545769475769453536')).toBe(true);
  });

  it('FMT-9: rejects an empty string', () => {
    expect(isValidIban('')).toBe(false);
  });

  it('FMT-9b: rejects a short string', () => {
    expect(isValidIban('123')).toBe(false);
  });

  it('FMT-9c: rejects lowercase non-IBAN', () => {
    expect(isValidIban('xx')).toBe(false);
  });
});
