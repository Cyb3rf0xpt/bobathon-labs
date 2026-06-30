import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Dashboard from './Dashboard';

vi.mock('../services/api', () => ({
  login:              vi.fn(),
  logout:             vi.fn(),
  getAuthToken:       vi.fn(() => 'teller'),
  setAuthToken:       vi.fn(),
  getAccounts:        vi.fn(),
  checkBackendStatus: vi.fn(() => Promise.resolve(true)),
}));

import * as api from '../services/api';

// Fake outlet context provides isOnline=true
const LayoutWrapper = () => <Outlet context={{ isOnline: true }} />;

const makeAccounts = (n) =>
  Array.from({ length: n }, (_, i) => ({
    account_id: `id-${i}`,
    iban: `DE89${String(i).padStart(18, '0')}`,
    customer_id: `cust-${i}`,
  }));

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route element={<LayoutWrapper />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/accounts/:id" element={<div>Account page</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe('Dashboard page', () => {
  it('DSH-1: renders account IBANs after getAccounts resolves', async () => {
    api.getAccounts.mockResolvedValueOnce(makeAccounts(3));
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText(/DE89 0000 0000 0000 0000 00/)).toBeInTheDocument(),
    );
  });

  it('DSH-2: shows skeleton while loading', () => {
    api.getAccounts.mockReturnValueOnce(new Promise(() => {}));
    renderDashboard();
    // Skeleton renders a paragraph container
    expect(document.querySelector('.cds--skeleton__text') ||
           screen.queryByText(/loading/i) ||
           document.querySelector('[class*="skeleton"]')).toBeTruthy();
  });

  it('DSH-3: IBAN search filter hides non-matching rows', async () => {
    const accounts = makeAccounts(5);
    // Replace one with a distinctive IBAN that won't appear in others
    accounts[2] = { account_id: 'id-special', iban: 'GB29NWBK60161331926819', customer_id: 'cust-sp' };
    api.getAccounts.mockResolvedValueOnce(accounts);
    renderDashboard();
    await waitFor(() => screen.getByText(/GB29/));
    await userEvent.clear(screen.getByPlaceholderText(/search iban/i));
    await userEvent.type(screen.getByPlaceholderText(/search iban/i), 'GB29');
    // Only the GB IBAN row + header row
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(2);
    });
  });

  it('DSH-4: View button navigates to account details', async () => {
    api.getAccounts.mockResolvedValueOnce(makeAccounts(1));
    renderDashboard();
    await waitFor(() => screen.getByRole('button', { name: /view/i }));
    await userEvent.click(screen.getByRole('button', { name: /view/i }));
    await waitFor(() =>
      expect(screen.getByText('Account page')).toBeInTheDocument(),
    );
  });

  it('DSH-5: getAccounts failure shows error notification', async () => {
    api.getAccounts.mockRejectedValueOnce(new Error('Network'));
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText(/failed to load accounts/i)).toBeInTheDocument(),
    );
  });

  it('DSH-6: pagination shows only pageSize rows', async () => {
    api.getAccounts.mockResolvedValueOnce(makeAccounts(15));
    renderDashboard();
    await waitFor(() => screen.getAllByRole('button', { name: /view/i }));
    const viewBtns = screen.getAllByRole('button', { name: /view/i });
    expect(viewBtns.length).toBe(10);
  });
});
