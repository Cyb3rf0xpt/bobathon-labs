import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Form,
  Stack,
  TextInput,
  Button,
  Modal,
  InlineNotification,
  Grid,
  Column,
  Tile,
} from '@carbon/react';
import { transferByIban } from '../services/api';
import { formatCurrency, isValidIban, formatIban } from '../utils/formatters';

const Transfer = () => {
  const { isOnline } = useOutletContext() || {};

  const [sourceIban, setSourceIban] = useState('');
  const [destIban, setDestIban]     = useState('');
  const [amount, setAmount]         = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);

  // touched flags for inline validation
  const [srcTouched, setSrcTouched]   = useState(false);
  const [dstTouched, setDstTouched]   = useState(false);
  const [amtTouched, setAmtTouched]   = useState(false);

  const srcNorm = sourceIban.replace(/\s/g, '').toUpperCase();
  const dstNorm = destIban.replace(/\s/g, '').toUpperCase();
  const amtNum  = parseFloat(amount);

  const srcValid = isValidIban(srcNorm);
  const dstValid = isValidIban(dstNorm);
  const amtValid = !Number.isNaN(amtNum) && amtNum > 0;
  const formValid = srcValid && dstValid && amtValid && srcNorm !== dstNorm;

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setSrcTouched(true);
    setDstTouched(true);
    setAmtTouched(true);
    if (!formValid) return;
    setResult(null);
    setError(null);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await transferByIban(srcNorm, dstNorm, amtNum);
      setResult(res);
      setConfirmOpen(false);
      // reset form
      setSourceIban('');
      setDestIban('');
      setAmount('');
      setSrcTouched(false);
      setDstTouched(false);
      setAmtTouched(false);
    } catch (err) {
      setConfirmOpen(false);
      if (err?.response?.status === 403) {
        setError(err.response.data?.detail || 'Insufficient funds.');
      } else {
        setError('Transfer failed. Please try again or contact support.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Grid>
      <Column sm={4} md={6} lg={8}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 400, margin: 0 }}>IBAN Transfer</h2>
          <p style={{ color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
            Transfer funds between two accounts by IBAN.
          </p>
        </div>

        {result && (
          <div style={{ marginBottom: '1.5rem' }}>
            <InlineNotification
              kind="success"
              title="Transfer posted"
              subtitle={`€${amtNum.toFixed(2)} transferred successfully. New source balance: ${formatCurrency(result.new_balance_eur)}.`}
              hideCloseButton={false}
              onCloseButtonClick={() => setResult(null)}
            />
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '1.5rem' }}>
            <InlineNotification
              kind="error"
              title="Transfer failed"
              subtitle={error}
              hideCloseButton={false}
              onCloseButtonClick={() => setError(null)}
            />
          </div>
        )}

        <Tile>
          <Form onSubmit={handleOpenConfirm} noValidate>
            <Stack gap={6}>
              <TextInput
                id="source-iban"
                labelText="Source IBAN"
                helperText="Account to debit"
                placeholder="e.g. DE89 5457 6947 5769 4535 36"
                value={sourceIban}
                onChange={(e) => setSourceIban(e.target.value)}
                onBlur={() => setSrcTouched(true)}
                invalid={srcTouched && !srcValid}
                invalidText={
                  srcNorm && srcNorm === dstNorm
                    ? 'Source and destination IBANs must differ.'
                    : 'Enter a valid IBAN (e.g. DE89…)'
                }
                disabled={busy}
              />
              <TextInput
                id="dest-iban"
                labelText="Destination IBAN"
                helperText="Account to credit"
                placeholder="e.g. DE89 8506 4317 1390 0532 93"
                value={destIban}
                onChange={(e) => setDestIban(e.target.value)}
                onBlur={() => setDstTouched(true)}
                invalid={dstTouched && (!dstValid || (dstNorm && dstNorm === srcNorm))}
                invalidText={
                  dstNorm && dstNorm === srcNorm
                    ? 'Source and destination IBANs must differ.'
                    : 'Enter a valid IBAN (e.g. DE89…)'
                }
                disabled={busy}
              />
              <TextInput
                id="amount"
                labelText="Amount (EUR)"
                placeholder="e.g. 250.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setAmtTouched(true)}
                invalid={amtTouched && !amtValid}
                invalidText="Enter a positive amount."
                disabled={busy}
              />
              <Button
                type="submit"
                kind="primary"
                disabled={!isOnline || busy}
              >
                Review Transfer
              </Button>
            </Stack>
          </Form>
        </Tile>
      </Column>

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        modalHeading="Confirm Transfer"
        primaryButtonText={busy ? 'Processing…' : 'Confirm Transfer'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={busy}
        onRequestSubmit={handleConfirm}
        onRequestClose={() => !busy && setConfirmOpen(false)}
        onSecondarySubmit={() => !busy && setConfirmOpen(false)}
        size="sm"
      >
        <p style={{ marginBottom: '1rem', color: 'var(--cds-text-secondary)' }}>
          Please review the transfer details before confirming. This action cannot be undone.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', margin: 0 }}>Source IBAN</p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, margin: '0.25rem 0 0' }}>
              {formatIban(srcNorm)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', margin: 0 }}>Destination IBAN</p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, margin: '0.25rem 0 0' }}>
              {formatIban(dstNorm)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', margin: 0 }}>Amount</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0 0' }}>
              {formatCurrency(amtNum || 0)}
            </p>
          </div>
        </div>
      </Modal>
    </Grid>
  );
};

export default Transfer;
