import React, { useState } from 'react';
import {
  Form,
  Stack,
  TextInput,
  TextArea,
  Button,
  InlineNotification,
  Grid,
  Column,
  Tile,
} from '@carbon/react';
import { buildOverdraftRequest } from '../services/api';
import { isValidIban } from '../utils/formatters';

const MIN_AMOUNT = 0;
const MAX_AMOUNT = 10000;

const OverdraftRequest = () => {
  const [iban, setIban]     = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError]   = useState(null);

  const [ibanTouched, setIbanTouched]     = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  const ibanNorm = iban.replace(/\s/g, '').toUpperCase();
  const amtNum   = parseFloat(amount);

  const ibanValid   = isValidIban(ibanNorm);
  const amountValid = !Number.isNaN(amtNum) && amtNum >= MIN_AMOUNT && amtNum <= MAX_AMOUNT;
  const formValid   = ibanValid && amountValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIbanTouched(true);
    setAmountTouched(true);
    if (!formValid) return;

    setError(null);
    setMessage(null);
    try {
      const msg = buildOverdraftRequest(ibanNorm, amtNum);
      setMessage(msg);
    } catch (err) {
      setError(err.message || 'Could not generate the overdraft request.');
    }
  };

  const handleReset = () => {
    setIban('');
    setAmount('');
    setMessage(null);
    setError(null);
    setIbanTouched(false);
    setAmountTouched(false);
  };

  return (
    <Grid>
      <Column sm={4} md={6} lg={8}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 400, margin: 0 }}>Overdraft Request</h2>
          <p style={{ color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
            Generate a back-office overdraft request message. No API call is made — copy
            the result and forward it to the back-office team.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '1.5rem' }}>
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              hideCloseButton={false}
              onCloseButtonClick={() => setError(null)}
            />
          </div>
        )}

        <Tile>
          <Form onSubmit={handleSubmit} noValidate>
            <Stack gap={6}>
              <TextInput
                id="od-iban"
                labelText="Account IBAN"
                helperText="The account to receive the overdraft limit."
                placeholder="e.g. DE89 5457 6947 5769 4535 36"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                onBlur={() => setIbanTouched(true)}
                invalid={ibanTouched && !ibanValid}
                invalidText="Enter a valid IBAN (e.g. DE89…)"
              />
              <TextInput
                id="od-amount"
                labelText="Requested Overdraft (EUR)"
                helperText={`Between €${MIN_AMOUNT.toLocaleString()} and €${MAX_AMOUNT.toLocaleString()}`}
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setAmountTouched(true)}
                invalid={amountTouched && !amountValid}
                invalidText={`Amount must be between €0 and €${MAX_AMOUNT.toLocaleString()}.`}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button type="submit" kind="primary" disabled={!formValid && (ibanTouched || amountTouched)}>
                  Generate Request
                </Button>
                {message && (
                  <Button type="button" kind="ghost" onClick={handleReset}>
                    Reset
                  </Button>
                )}
              </div>
            </Stack>
          </Form>
        </Tile>

        {/* Generated message */}
        {message && (
          <div style={{ marginTop: '1.5rem' }}>
            <TextArea
              id="od-message"
              labelText="Back-Office Request Message"
              helperText="Copy this message and forward it to the back-office team."
              value={message}
              readOnly
              rows={6}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}
            />
          </div>
        )}
      </Column>
    </Grid>
  );
};

export default OverdraftRequest;
