import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
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
  TableToolbarSearch,
  Pagination,
  Button,
  InlineNotification,
  SkeletonText,
  Grid,
  Column,
} from '@carbon/react';
import { getAccounts } from '../services/api';
import { formatIban } from '../utils/formatters';

const headers = [
  { key: 'iban',       header: 'IBAN'       },
  { key: 'account_id', header: 'Account ID' },
  { key: 'actions',    header: ''           },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { isOnline } = useOutletContext() || {};

  const [accounts, setAccounts] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setLoading(true);
    getAccounts()
      .then(setAccounts)
      .catch(() => setError('Failed to load accounts. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = filter.replace(/\s/g, '').toUpperCase();
    return q ? accounts.filter((a) => a.iban.includes(q)) : accounts;
  }, [accounts, filter]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const rows = paginated.map((a) => ({
    id: a.account_id,
    iban: formatIban(a.iban),
    account_id: a.account_id,
    actions: a.account_id,
  }));

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 400, margin: 0 }}>Dashboard</h2>
          <p style={{ color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
            {loading ? 'Loading accounts…' : `${filtered.length.toLocaleString()} account${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <InlineNotification kind="error" title="Error" subtitle={error} hideCloseButton />
          </div>
        )}

        {loading ? (
          <SkeletonText paragraph lineCount={8} />
        ) : (
          <>
            <DataTable rows={rows} headers={headers} isSortable={false}>
              {({
                rows: tableRows,
                headers: tableHeaders,
                getTableContainerProps,
                getTableProps,
                getHeaderProps,
                getRowProps,
              }) => (
                <TableContainer
                  title="Accounts"
                  description="Search by IBAN to find a customer account."
                  {...getTableContainerProps()}
                >
                  <TableToolbar>
                    <TableToolbarContent>
                      <TableToolbarSearch
                        persistent
                        placeholder="Search IBAN…"
                        value={filter}
                        onChange={(e) => {
                          setFilter(e.target.value);
                          setPage(1);
                        }}
                      />
                    </TableToolbarContent>
                  </TableToolbar>
                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        {tableHeaders.map((h) => (
                          <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                            {h.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} style={{ textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
                            No accounts match your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                        tableRows.map((row) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map((cell) => {
                              if (cell.info.header === 'actions') {
                                return (
                                  <TableCell key={cell.id}>
                                    <Button
                                      kind="ghost"
                                      size="sm"
                                      disabled={!isOnline}
                                      onClick={() => navigate(`/accounts/${cell.value}`)}
                                    >
                                      View
                                    </Button>
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

            <Pagination
              totalItems={filtered.length}
              pageSize={pageSize}
              pageSizes={[10, 25, 50]}
              page={page}
              onChange={({ page: p, pageSize: ps }) => {
                setPage(p);
                setPageSize(ps);
              }}
            />
          </>
        )}
      </Column>
    </Grid>
  );
};

export default Dashboard;
