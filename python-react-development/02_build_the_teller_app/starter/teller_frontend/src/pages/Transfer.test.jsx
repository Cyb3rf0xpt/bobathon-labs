import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Transfer from './Transfer';

vi.mock('../services/api', () => ({
  login:           vi.fn(),
  logout:          vi.fn(),
  getAuthToken:    vi.fn(() => 'teller'),
  setAuthToken:    vi.fn(),
  transferByIban:  vi.fn(),
  checkBackendStatus: vi.fn(() => Promise.resolve(true)),
}));

import * as api from '../services/api';

const SRC  = 'DE89545769475769453536';
const DST  = 'DE89850643171390053293';

const LayoutWrapper = () => <Outlet context={{ isOnline: true }} />;
const OfflineWrapper = () => <Outlet context={{ isOnline: false }} />;

const renderTransfer = (online = true) =>
  render(
    <MemoryRouter initialEntries={['/transfer']}>
      <AuthProvider>
        <Routes>
          <Route element={online ? <LayoutWrapper /> : <OfflineWrapper />}>
            <Route path="/transfer" element={<Transfer />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

const fillForm = async (src = SRC, dst = DST, amt = '100') => {
  await userEvent.type(screen.getByLabelText(/source iban/i), src);
  await userEvent.type(screen.getByLabelText(/destination iban/i), dst);
  await userEvent.type(screen.getByLabelText(/amount/i), amt);
};

beforeEach(() => vi.clearAllMocks());

describe('Transfer page', () => {
  // Helper: wait for the modal heading to appear (avoids ambiguity with the button text)
  const waitForModal = () =>
    waitFor(() => expect(screen.getByRole('heading', { name: /confirm transfer/i })).toBeInTheDocument());

  it('TRF-1: "Review Transfer" opens the confirmation modal', async () => {
    renderTransfer();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    await waitForModal();
  });

  it('TRF-2: modal shows source IBAN, destination IBAN, and amount', async () => {
    renderTransfer();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    await waitForModal();
    expect(screen.getByText(/DE89 5457/)).toBeInTheDocument();
    expect(screen.getByText(/DE89 8506/)).toBeInTheDocument();
    expect(screen.getAllByText('€100.00').length).toBeGreaterThanOrEqual(1);
  });

  it('TRF-3: confirming calls transferByIban with correct args', async () => {
    api.transferByIban.mockResolvedValueOnce({ status: 'POSTED', new_balance_eur: 5000 });
    renderTransfer();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    await waitForModal();
    await userEvent.click(screen.getByRole('button', { name: /^confirm transfer$/i }));
    await waitFor(() =>
      expect(api.transferByIban).toHaveBeenCalledWith(SRC, DST, 100),
    );
  });

  it('TRF-4: success shows notification with new_balance_eur', async () => {
    api.transferByIban.mockResolvedValueOnce({ status: 'POSTED', new_balance_eur: 5000 });
    renderTransfer();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    await waitForModal();
    await userEvent.click(screen.getByRole('button', { name: /^confirm transfer$/i }));
    await waitFor(() =>
      expect(screen.getByText(/transfer posted/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/€5,000\.00/)).toBeInTheDocument();
  });

  it('TRF-5: HTTP 403 surfaces backend detail message', async () => {
    const err = { response: { status: 403, data: { detail: 'Insufficient funds. Balance -500, overdraft 0' } } };
    api.transferByIban.mockRejectedValueOnce(err);
    renderTransfer();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    await waitForModal();
    await userEvent.click(screen.getByRole('button', { name: /^confirm transfer$/i }));
    await waitFor(() =>
      expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument(),
    );
  });

  it('TRF-6: invalid source IBAN shows validation error', async () => {
    renderTransfer();
    const srcInput = screen.getByLabelText(/source iban/i);
    await userEvent.type(srcInput, 'NOTANIBAN');
    await userEvent.tab();
    await waitFor(() =>
      expect(screen.getByText(/enter a valid iban/i)).toBeInTheDocument(),
    );
  });

  it('TRF-7: identical source and destination IBANs show error', async () => {
    renderTransfer();
    await userEvent.type(screen.getByLabelText(/source iban/i), SRC);
    await userEvent.type(screen.getByLabelText(/destination iban/i), SRC);
    await userEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    await waitFor(() =>
      expect(screen.getByText(/must differ/i)).toBeInTheDocument(),
    );
  });

  it('TRF-8: non-positive amount shows validation error', async () => {
    renderTransfer();
    await userEvent.type(screen.getByLabelText(/source iban/i), SRC);
    await userEvent.type(screen.getByLabelText(/destination iban/i), DST);
    const amtInput = screen.getByLabelText(/amount/i);
    await userEvent.type(amtInput, '-5');
    await userEvent.tab();
    await waitFor(() =>
      expect(screen.getByText(/positive amount/i)).toBeInTheDocument(),
    );
  });

  it('TRF-10: form resets after successful transfer', async () => {
    api.transferByIban.mockResolvedValueOnce({ status: 'POSTED', new_balance_eur: 5000 });
    renderTransfer();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /confirm transfer/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /^confirm transfer$/i }));
    await waitFor(() => screen.getByText(/transfer posted/i));
    // After reset the inputs should be empty
    const textboxes = screen.getAllByRole('textbox');
    textboxes.forEach((tb) => expect(tb).toHaveValue(''));
  });
});
