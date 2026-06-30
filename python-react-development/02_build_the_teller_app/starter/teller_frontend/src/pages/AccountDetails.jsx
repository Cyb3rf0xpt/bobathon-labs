import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Grid,
  Column,
  Tile,
  SkeletonPlaceholder,
  SkeletonText,
  DataTable,
  Table,
  TableContainer,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  MultiSelect,
  InlineNotification,
  Button,
  Tag,
} from '@carbon/react';
import { getAccounts, getBalanceByIban, getTransactions } from '../services/api';
import { formatCurrency, formatDateTime, formatIban } from '../utils/formatters';

const TX_TYPES = [
  { id: 'PAYMENT',      label: 'PAYMENT'      },
  { id: 'TRANSFER_IN',  label: 'TRANSFER_IN'  },
  { id: 'TRANSFER_OUT', label: 'TRANSFER_OUT' },
  { id: 'FEE_REVERSAL', label: 'FEE_REVERSAL' },
  { id: 'MANUAL_ADJ',   label: 'MANUAL_ADJ'   },
];

const TYPE_TAG = {
  PAYMENT:      'blue',
  TRANSFER_IN:  'green',
  TRANSFER_OUT: 'red',
  FEE_REVERSAL: 'purple',
  MANUAL_ADJ:   'gray',
};

const TX_HEADERS = [
  { key: 'booking_ts',  header: 'Date / Time' },
  { key: 'type',        header: 'Type'        },
  { key: 'amount_eur',  header: 'Amount'      },
];

const AccountDetails = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useOutletContext() || {};

  const [iban, setIban] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [error, setError] = useState(null);

  // sort state
  const [sortKey, setSortKey] = useState('booking_ts');
  const [sortDir, setSortDir] = useState('DESC');

  // filter state
  const [typeFilter, setTypeFilter] = useState([]);

  // Step 1: resolve accountId → iban
  useEffect(() => {
    setError(null);
    getAccounts()
      .then((list) => {
        const match = list.find((a) => a.account_id === accountId);
        if (match) {
          setIban(match.iban);
        } else {
          setError('Account not found.');
          setLoadingBalance(false);
          setLoadingTx(false);
        }
      })
      .catch(() => {
        setError('Failed to load account information.');
        setLoadingBalance(false);
        setLoadingTx(false);
      });
  }, [accountId]);

  // Step 2: once iban is known, fetch balance + transactions in parallel
  useEffect(() => {
    if (!iban) return;

    setLoadingBalance(true);
    getBalanceByIban(iban)
      .then(setBalance)
      .catch(() => setError('Failed to load balance.'))
      .finally(() => setLoadingBalance(false));

    setLoadingTx(true);
    getTransactions(accountId)
      .then(setTransactions)
      .catch(() => setError('Failed to load transactions.'))
      .finally(() => setLoadingTx(false));
  }, [iban, accountId]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortKey(key);
      setSortDir('DESC');
    }
  };

  const displayedTx = useMemo(() => {
    const filtered =
      typeFilter.length === 0
        ? transactions
        : transactions.filter((tx) => typeFilter.includes(tx.type));
    return [...filtered].sort((a, b) => {
      const mul = sortDir === 'ASC' ? 1 : -1;
      if (sortKey === 'amount_eur') return mul * (a.amount_eur - b.amount_eur);
      return mul * (new Date(a.booking_ts) - new Date(b.booking_ts));
    });
  }, [transactions, typeFilter, sortKey, sortDir]);

  const txRows = displayedTx.map((tx) => ({
    id: tx.tx_id,
    booking_ts: formatDateTime(tx.booking_ts),
    type: tx.type,
    amount_eur: tx.amount_eur,
  }));

  const balanceColor = (v) =>
    typeof v === 'number' && v < 0 ? { color: 'var(--cds-support-error)' } : {};

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        {/* Back navigation */}
        <div style={{ marginBottom: '1rem' }}>
          <Button kind="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </Button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 400, margin: 0 }}>Account Details</h2>
          {iban && (
            <p style={{ color: 'var(--cds-text-secondary)', marginTop: '0.25rem', fontFamily: 'IBM Plex Mono, monospace' }}>
              {formatIban(iban)}
            </p>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <InlineNotification kind="error" title="Error" subtitle={error} hideCloseButton />
          </div>
        )}
      </Column>

      {/* ── Balance summary tiles ── */}
      {loadingBalance ? (
        <>
          {[0, 1, 2, 3].map((i) => (
            <Column key={i} sm={4} md={4} lg={4} style={{ marginBottom: '1rem' }}>
              <SkeletonPlaceholder style={{ width: '100%', height: '80px' }} />
            </Column>
          ))}
        </>
      ) : balance && (
        <>
          <Column sm={4} md={4} lg={4} style={{ marginBottom: '1rem' }}>
            <Tile>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                Current Balance
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, ...balanceColor(balance.current_balance_eur) }}>
                {formatCurrency(balance.current_balance_eur)}
              </p>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={4} style={{ marginBottom: '1rem' }}>
            <Tile>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                Available Balance
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, ...balanceColor(balance.available_balance_eur) }}>
                {formatCurrency(balance.available_balance_eur)}
              </p>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={4} style={{ marginBottom: '1rem' }}>
            <Tile>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                Overdraft Limit
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {formatCurrency(balance.overdraft_limit_eur)}
              </p>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={4} style={{ marginBottom: '1rem' }}>
            <Tile>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                Account IBAN
              </p>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>
                {formatIban(iban)}
              </p>
            </Tile>
          </Column>
        </>
      )}

      {/* ── Transaction history ── */}
      <Column sm={4} md={8} lg={16} style={{ marginTop: '1rem' }}>
        {loadingTx ? (
          <SkeletonText paragraph lineCount={8} />
        ) : (
          <DataTable rows={txRows} headers={TX_HEADERS}>
            {({
              rows: tableRows,
              headers: tableHeaders,
              getTableContainerProps,
              getTableProps,
              getHeaderProps,
              getRowProps,
            }) => (
              <TableContainer
                title="Transaction History"
                description={`${displayedTx.length} transaction${displayedTx.length !== 1 ? 's' : ''}`}
                {...getTableContainerProps()}
              >
                <TableToolbar>
                  <TableToolbarContent>
                    <MultiSelect
                      id="type-filter"
                      label="Filter by type"
                      titleText=""
                      items={TX_TYPES}
                      itemToString={(item) => item?.label || ''}
                      onChange={({ selectedItems }) =>
                        setTypeFilter(selectedItems.map((i) => i.id))
                      }
                      style={{ minWidth: '200px' }}
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {tableHeaders.map((h) => (
                        <TableHeader
                          key={h.key}
                          {...getHeaderProps({ header: h })}
                          isSortable={h.key === 'booking_ts' || h.key === 'amount_eur'}
                          isSortHeader={sortKey === h.key}
                          sortDirection={sortKey === h.key ? sortDir : 'NONE'}
                          onClick={
                            h.key === 'booking_ts' || h.key === 'amount_eur'
                              ? () => handleSort(h.key)
                              : undefined
                          }
                        >
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          style={{ textAlign: 'center', color: 'var(--cds-text-secondary)' }}
                        >
                          No transactions found for this account.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map((row) => (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'type') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag type={TYPE_TAG[cell.value] || 'gray'} size="sm">
                                    {cell.value}
                                  </Tag>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'amount_eur') {
                              return (
                                <TableCell
                                  key={cell.id}
                                  style={{
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    fontWeight: 600,
                                    ...(cell.value < 0 ? { color: 'var(--cds-support-error)' } : {}),
                                  }}
                                >
                                  {formatCurrency(cell.value)}
                                </TableCell>
                              );
                            }
                            return <TableCell key={cell.id}>{cell.value}</TableCell>;
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </Column>

      {/* Transfer / Overdraft quick-action buttons */}
      <Column sm={4} md={8} lg={16} style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button
          kind="primary"
          disabled={!isOnline}
          onClick={() => navigate('/transfer')}
        >
          New Transfer
        </Button>
        <Button
          kind="tertiary"
          onClick={() => navigate('/overdraft')}
        >
          Overdraft Request
        </Button>
      </Column>
    </Grid>
  );
};

export default AccountDetails;
