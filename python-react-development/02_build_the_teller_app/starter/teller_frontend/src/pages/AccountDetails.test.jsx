import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import AccountDetails from './AccountDetails';

vi.mock('../services/api', () => ({
  login:              vi.fn(),
  logout:             vi.fn(),
  getAuthToken:       vi.fn(() => 'teller'),
  setAuthToken:       vi.fn(),
  getAccounts:        vi.fn(),
  getBalanceByIban:   vi.fn(),
  getTransactions:    vi.fn(),
  checkBackendStatus: vi.fn(() => Promise.resolve(true)),
}));

import * as api from '../services/api';

const ACCOUNT_ID = 'c8f83143-fb7f-4dd2-bf8a-8ccd88ef5cba';
const IBAN = 'DE89545769475769453536';

const mockAccounts = [{ account_id: ACCOUNT_ID, iban: IBAN, customer_id: 'cust-1' }];
const mockBalance = {
  iban: IBAN,
  account_id: ACCOUNT_ID,
  current_balance_eur: 5581.33,
  available_balance_eur: 5581.33,
  overdraft_limit_eur: 0,
  recent_transactions: [],
};
const mockNegativeBalance = { ...mockBalance, current_balance_eur: -500, available_balance_eur: -500 };

const mockTransactions = [
  { tx_id: 'tx-1', account_id: ACCOUNT_ID, booking_ts: '2025-05-16T18:35:29', amount_eur: 100, type: 'PAYMENT' },
  { tx_id: 'tx-2', account_id: ACCOUNT_ID, booking_ts: '2025-05-16T18:36:00', amount_eur: -50, type: 'TRANSFER_OUT' },
];

const LayoutWrapper = () => <Outlet context={{ isOnline: true }} />;

const renderPage = (accountId = ACCOUNT_ID) =>
  render(
    <MemoryRouter initialEntries={[`/accounts/${accountId}`]}>
      <AuthProvider>
        <Routes>
          <Route element={<LayoutWrapper />}>
            <Route path="/accounts/:accountId" element={<AccountDetails />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe('AccountDetails page', () => {
  it('ACC-1: renders balance tiles with formatted amounts', async () => {
    api.getAccounts.mockResolvedValueOnce(mockAccounts);
    api.getBalanceByIban.mockResolvedValueOnce(mockBalance);
    api.getTransactions.mockResolvedValueOnce(mockTransactions);
    renderPage();
    // current and available are both €5,581.33 — use getAllByText
    await waitFor(() => expect(screen.getAllByText('€5,581.33').length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText('Current Balance')).toBeInTheDocument();
    expect(screen.getByText('Available Balance')).toBeInTheDocument();
    expect(screen.getByText('Overdraft Limit')).toBeInTheDocument();
  });

  it('ACC-2: negative balance rendered with error colour token', async () => {
    api.getAccounts.mockResolvedValueOnce(mockAccounts);
    api.getBalanceByIban.mockResolvedValueOnce(mockNegativeBalance);
    api.getTransactions.mockResolvedValueOnce([]);
    renderPage();
    // Both current and available are negative; find one with the error token style
    await waitFor(() => screen.getAllByText(/-€500\.00/));
    const errorEls = screen.getAllByText(/-€500\.00/).filter(
      (el) => el.getAttribute('style')?.includes('support-error'),
    );
    expect(errorEls.length).toBeGreaterThanOrEqual(1);
  });

  it('ACC-4: transaction table renders date, type, and amount', async () => {
    api.getAccounts.mockResolvedValueOnce(mockAccounts);
    api.getBalanceByIban.mockResolvedValueOnce(mockBalance);
    api.getTransactions.mockResolvedValueOnce(mockTransactions);
    renderPage();
    await waitFor(() => expect(screen.getByText('PAYMENT')).toBeInTheDocument());
    expect(screen.getByText('TRANSFER_OUT')).toBeInTheDocument();
    expect(screen.getByText('€100.00')).toBeInTheDocument();
  });

  it('ACC-5: type filter hides non-matching transactions', async () => {
    api.getAccounts.mockResolvedValueOnce(mockAccounts);
    api.getBalanceByIban.mockResolvedValueOnce(mockBalance);
    api.getTransactions.mockResolvedValueOnce(mockTransactions);
    renderPage();
    await waitFor(() => screen.getByText('PAYMENT'));
    // Open MultiSelect via its toggle button (combobox role)
    const toggleBtn = screen.getByRole('combobox', { name: /filter by type/i });
    await userEvent.click(toggleBtn);
    // Click the TRANSFER_OUT option in the listbox
    await waitFor(() => screen.getByRole('option', { name: /TRANSFER_OUT/i }));
    await userEvent.click(screen.getByRole('option', { name: /TRANSFER_OUT/i }));
    // Close the dropdown
    await userEvent.keyboard('{Escape}');
    // PAYMENT row should be gone
    await waitFor(() => expect(screen.queryByText('PAYMENT')).not.toBeInTheDocument());
  });

  it('ACC-6: empty transaction array shows empty-state message', async () => {
    api.getAccounts.mockResolvedValueOnce(mockAccounts);
    api.getBalanceByIban.mockResolvedValueOnce(mockBalance);
    api.getTransactions.mockResolvedValueOnce([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no transactions found/i)).toBeInTheDocument(),
    );
  });

  it('ACC-7: unknown accountId shows account not found error', async () => {
    api.getAccounts.mockResolvedValueOnce([]);
    api.getBalanceByIban.mockResolvedValue(mockBalance);
    api.getTransactions.mockResolvedValue([]);
    renderPage('unknown-id');
    await waitFor(() =>
      expect(screen.getByText(/account not found/i)).toBeInTheDocument(),
    );
  });
});
