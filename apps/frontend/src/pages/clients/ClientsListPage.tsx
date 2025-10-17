import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useClientsList } from '../../hooks/useClients';

function ClientsListPage() {
  const { clients, loading, error, refresh } = useClientsList(true);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Typography variant="h4" component="h1">
          Clients
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            to="/clients/new"
            color="primary"
          >
            New Client
          </Button>
        </Stack>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress aria-label="Loading clients" />
        </Box>
      ) : (
        <Paper sx={{ width: '100%', overflowX: 'auto' }}>
          <Table aria-label="Clients table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell align="right">Invoices</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.length ? (
                clients.map((client) => (
                  <TableRow key={client.id} hover>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone ?? '—'}</TableCell>
                    <TableCell align="right">{client.invoices?.length ?? 0}</TableCell>
                    <TableCell align="right">
                      <Button
                        component={RouterLink}
                        to={`/clients/${client.id}`}
                        variant="outlined"
                        size="small"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No clients to display yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

export default ClientsListPage;
