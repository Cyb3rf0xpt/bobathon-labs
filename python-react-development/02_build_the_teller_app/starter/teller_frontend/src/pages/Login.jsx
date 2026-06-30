import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  InlineNotification,
  Tile,
} from '@carbon/react';
import { useAuth } from '../auth/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState(import.meta.env.VITE_TELLER_USERNAME || '');
  const [password, setPassword] = useState(import.meta.env.VITE_TELLER_PASSWORD || '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      if (err?.response?.status === 401) {
        setError('Invalid username or password.');
      } else {
        setError('Could not reach the backend — it may be waking up (~15 s). Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--cds-background)',
      }}
    >
      <Tile
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2.5rem 2rem',
        }}
      >
        {/* Branding */}
        <div style={{ marginBottom: '2rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--cds-text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}
          >
            GFM Bank
          </p>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 300,
              color: 'var(--cds-text-primary)',
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            Teller Portal
          </h1>
          <p style={{ marginTop: '0.5rem', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
            Sign in to access the teller workstation.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '1.5rem' }}>
            <InlineNotification
              kind="error"
              title="Sign-in failed"
              subtitle={error}
              hideCloseButton
              lowContrast
            />
          </div>
        )}

        <Form onSubmit={onSubmit}>
          <Stack gap={6}>
            <TextInput
              id="username"
              labelText="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={busy}
              required
            />
            <PasswordInput
              id="password"
              labelText="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              required
            />
            <Button
              type="submit"
              kind="primary"
              disabled={busy || !username || !password}
              style={{ width: '100%', maxWidth: '100%' }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
};

export default Login;
