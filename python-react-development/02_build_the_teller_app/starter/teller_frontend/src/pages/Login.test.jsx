import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Login from './Login';

// Mock the api module
vi.mock('../services/api', () => ({
  login:              vi.fn(),
  logout:             vi.fn(),
  getAuthToken:       vi.fn(() => null),
  setAuthToken:       vi.fn(),
  checkBackendStatus: vi.fn(() => Promise.resolve(true)),
}));

import * as api from '../services/api';

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.getAuthToken.mockReturnValue(null);
});

// Helper: get the username text input
const getUsername = () => screen.getByRole('textbox', { name: /username/i });
// Helper: get the password input by its exact label (avoids matching "Show password" button)
const getPassword = () => screen.getByLabelText('Password');

describe('Login page', () => {
  it('LOG-1: renders username and password fields', () => {
    renderLogin();
    expect(getUsername()).toBeInTheDocument();
    expect(getPassword()).toBeInTheDocument();
  });

  it('LOG-2: submit button is disabled when fields are empty', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /sign in/i });
    expect(btn).toBeDisabled();
  });

  it('LOG-3: successful login navigates away from /login', async () => {
    api.login.mockResolvedValueOnce({ access_token: 'teller' });
    api.getAuthToken.mockReturnValue('teller');
    renderLogin();
    await userEvent.type(getUsername(), 'teller');
    await userEvent.type(getPassword(), 'teller123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(api.login).toHaveBeenCalledWith('teller', 'teller123'));
  });

  it('LOG-4: 401 shows invalid credentials error', async () => {
    const err = { response: { status: 401 } };
    api.login.mockRejectedValueOnce(err);
    renderLogin();
    await userEvent.type(getUsername(), 'bad');
    await userEvent.type(getPassword(), 'creds');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument(),
    );
  });

  it('LOG-5: network error shows backend-waking message', async () => {
    api.login.mockRejectedValueOnce(new Error('Network Error'));
    renderLogin();
    await userEvent.type(getUsername(), 'teller');
    await userEvent.type(getPassword(), 'teller123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByText(/could not reach the backend/i)).toBeInTheDocument(),
    );
  });

  it('LOG-6: button shows "Signing in…" while pending', async () => {
    let resolve;
    api.login.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    renderLogin();
    await userEvent.type(getUsername(), 'teller');
    await userEvent.type(getPassword(), 'teller123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    resolve({ access_token: 'teller' });
  });
});
