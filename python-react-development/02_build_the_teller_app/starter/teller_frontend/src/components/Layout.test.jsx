import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Layout from './Layout';

vi.mock('../services/api', () => ({
  login:              vi.fn(),
  logout:             vi.fn(),
  getAuthToken:       vi.fn(() => 'teller'),
  setAuthToken:       vi.fn(),
  checkBackendStatus: vi.fn(),
}));

import * as api from '../services/api';

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<div>Dashboard content</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe('Layout — server status indicator (FR-7)', () => {
  it('LAY-1: shows "Online" when checkBackendStatus returns true', async () => {
    api.checkBackendStatus.mockResolvedValue(true);
    renderLayout();
    await waitFor(() =>
      expect(screen.getByText('Online')).toBeInTheDocument(),
    );
  });

  it('LAY-2: shows "Offline" and banner when checkBackendStatus returns false', async () => {
    api.checkBackendStatus.mockResolvedValue(false);
    renderLayout();
    await waitFor(() =>
      expect(screen.getByText('Offline')).toBeInTheDocument(),
    );
    expect(screen.getByText(/backend offline/i)).toBeInTheDocument();
  });

  it('LAY-3: logout button calls logout and navigates to /login', async () => {
    api.checkBackendStatus.mockResolvedValue(true);
    renderLayout();
    await waitFor(() => screen.getByText('Online'));
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    await waitFor(() =>
      expect(screen.getByText('Login page')).toBeInTheDocument(),
    );
  });
});
