import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import OverdraftRequest from './OverdraftRequest';

vi.mock('../services/api', () => ({
  login:                  vi.fn(),
  logout:                 vi.fn(),
  getAuthToken:           vi.fn(() => 'teller'),
  setAuthToken:           vi.fn(),
  buildOverdraftRequest:  vi.fn(),
  checkBackendStatus:     vi.fn(() => Promise.resolve(true)),
}));

import * as api from '../services/api';

const VALID_IBAN = 'DE89545769475769453536';

const LayoutWrapper = () => <Outlet context={{ isOnline: true }} />;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/overdraft']}>
      <AuthProvider>
        <Routes>
          <Route element={<LayoutWrapper />}>
            <Route path="/overdraft" element={<OverdraftRequest />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe('OverdraftRequest page', () => {
  it('OVD-1: invalid IBAN shows inline error after blur', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/account iban/i), 'NOTVALID');
    await userEvent.tab();
    await waitFor(() =>
      expect(screen.getByText(/enter a valid iban/i)).toBeInTheDocument(),
    );
  });

  it('OVD-2: amount below 0 shows inline error', async () => {
    api.buildOverdraftRequest.mockImplementation(() => { throw new Error('Amount must be between 0 and 10,000 EUR'); });
    renderPage();
    await userEvent.type(screen.getByLabelText(/account iban/i), VALID_IBAN);
    await userEvent.type(screen.getByLabelText(/requested overdraft/i), '-1');
    await userEvent.tab();
    await waitFor(() =>
      expect(screen.getByText(/between/i)).toBeInTheDocument(),
    );
  });

  it('OVD-3: amount above 10000 shows inline error', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/account iban/i), VALID_IBAN);
    await userEvent.type(screen.getByLabelText(/requested overdraft/i), '99999');
    await userEvent.tab();
    await waitFor(() =>
      expect(screen.getByText(/between/i)).toBeInTheDocument(),
    );
  });

  it('OVD-4: valid submission shows the generated message', async () => {
    const msg = `Overdraft Request\n\nAccount: ${VALID_IBAN}\nRequested Overdraft Amount: €500.00\n\nThis request requires back-office approval.`;
    api.buildOverdraftRequest.mockReturnValueOnce(msg);
    renderPage();
    await userEvent.type(screen.getByLabelText(/account iban/i), VALID_IBAN);
    await userEvent.type(screen.getByLabelText(/requested overdraft/i), '500');
    await userEvent.click(screen.getByRole('button', { name: /generate request/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/back-office request message/i)).toBeInTheDocument(),
    );
  });

  it('OVD-5: generated message contains the IBAN and amount', async () => {
    const msg = `Overdraft Request\n\nAccount: ${VALID_IBAN}\nRequested Overdraft Amount: €500.00\n\nThis request requires back-office approval.`;
    api.buildOverdraftRequest.mockReturnValueOnce(msg);
    renderPage();
    await userEvent.type(screen.getByLabelText(/account iban/i), VALID_IBAN);
    await userEvent.type(screen.getByLabelText(/requested overdraft/i), '500');
    await userEvent.click(screen.getByRole('button', { name: /generate request/i }));
    await waitFor(() => screen.getByLabelText(/back-office request message/i));
    const textarea = screen.getByLabelText(/back-office request message/i);
    expect(textarea.value).toContain(VALID_IBAN);
    expect(textarea.value).toContain('€500.00');
  });

  it('OVD-6: Reset button clears form and hides the message', async () => {
    const msg = `Overdraft Request\n\nAccount: ${VALID_IBAN}\nRequested Overdraft Amount: €500.00\n\nThis request requires back-office approval.`;
    api.buildOverdraftRequest.mockReturnValueOnce(msg);
    renderPage();
    await userEvent.type(screen.getByLabelText(/account iban/i), VALID_IBAN);
    await userEvent.type(screen.getByLabelText(/requested overdraft/i), '500');
    await userEvent.click(screen.getByRole('button', { name: /generate request/i }));
    await waitFor(() => screen.getByRole('button', { name: /reset/i }));
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    await waitFor(() =>
      expect(screen.queryByLabelText(/back-office request message/i)).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/account iban/i)).toHaveValue('');
  });
});
