import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useClient, useClientMutations } from '../../hooks/useClients';
import type { Client } from '../../types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};

type ClientFormErrors = Partial<Record<keyof ClientFormState, string>>;

const emptyState: ClientFormState = {
  name: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: ''
};

const toFormState = (client: Client | null): ClientFormState => ({
  name: client?.name ?? '',
  email: client?.email ?? '',
  phone: client?.phone ?? '',
  addressLine1: client?.addressLine1 ?? '',
  addressLine2: client?.addressLine2 ?? '',
  city: client?.city ?? '',
  state: client?.state ?? '',
  postalCode: client?.postalCode ?? ''
});

const normalizeValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const formatCurrency = (value: string) => {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return value;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

function ClientFormPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !clientId || clientId === 'new';
  const numericId = !isNew ? Number(clientId) : undefined;

  const { client, loading, error, refresh } = useClient(numericId, {
    withRelations: true
  });
  const {
    createClient,
    updateClient,
    createStatus,
    createError,
    resetCreate,
    updateStatus,
    updateError,
    resetUpdate
  } = useClientMutations();

  const [formValues, setFormValues] = useState<ClientFormState>(emptyState);
  const [formErrors, setFormErrors] = useState<ClientFormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [customSuccessMessage, setCustomSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (location.state && typeof location.state === 'object' && 'showSuccess' in location.state) {
      const state = location.state as { showSuccess?: boolean; successMessage?: string };

      if (state.showSuccess) {
        if (typeof state.successMessage === 'string') {
          setCustomSuccessMessage(state.successMessage);
        }

        setShowSuccess(true);

        const { successMessage: _successMessage, ...rest } = state;

        navigate(location.pathname, {
          replace: true,
          state: { ...rest, showSuccess: false }
        });
      }
    }
  }, [location, navigate]);

  useEffect(() => {
    if (isNew) {
      setFormValues(emptyState);
      setFormErrors({});
      setCustomSuccessMessage(null);
      resetCreate();
      resetUpdate();
      return;
    }

    if (client) {
      setFormValues(toFormState(client));
      setFormErrors({});
    }
  }, [isNew, client, resetCreate, resetUpdate]);

  const mutationError = isNew ? createError : updateError;
  const mutationStatus = isNew ? createStatus : updateStatus;
  const isSubmitting = mutationStatus === 'loading';

  const validate = useCallback((): ClientFormErrors => {
    const errors: ClientFormErrors = {};

    if (!formValues.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formValues.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailPattern.test(formValues.email.trim())) {
      errors.email = 'Email must be valid';
    }

    return errors;
  }, [formValues]);

  const handleChange = (field: keyof ClientFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFormValues((previous) => ({ ...previous, [field]: value }));

      if (formErrors[field]) {
        setFormErrors((previous) => {
          const next = { ...previous };
          delete next[field];
          return next;
        });
      }
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validate();

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      phone: normalizeValue(formValues.phone),
      addressLine1: normalizeValue(formValues.addressLine1),
      addressLine2: normalizeValue(formValues.addressLine2),
      city: normalizeValue(formValues.city),
      state: normalizeValue(formValues.state),
      postalCode: normalizeValue(formValues.postalCode)
    };

    try {
      if (isNew) {
        const created = await createClient(payload);
        setCustomSuccessMessage('Client created successfully.');
        setShowSuccess(true);

        if (created) {
          navigate(`/clients/${created.id}`, {
            replace: true,
            state: {
              showSuccess: true,
              successMessage: 'Client created successfully.'
            }
          });
        }
      } else if (numericId) {
        await updateClient(numericId, payload);
        await refresh();
        setCustomSuccessMessage(null);
        setShowSuccess(true);
      }
    } catch (error) {
      // Error state handled by mutation hook
      console.error(error);
    }
  };

  const handleSnackbarClose = () => {
    setShowSuccess(false);
    setCustomSuccessMessage(null);
    resetCreate();
    resetUpdate();
  };

  const pageTitle = isNew ? 'New Client' : client ? client.name : 'Edit Client';
  const successMessage = customSuccessMessage ?? (isNew ? 'Client created successfully.' : 'Client updated successfully.');

  return (
    <Box component="section">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {pageTitle}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage client details and their associated invoices.
          </Typography>
        </Box>
        <Button component={RouterLink} to="/clients" variant="outlined">
          Back to Clients
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      {loading && !isNew ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading client" />
        </Box>
      ) : (
        <Grid container spacing={3} component="form" onSubmit={handleSubmit} noValidate>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                {mutationError ? <Alert severity="error">{mutationError}</Alert> : null}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Name"
                      name="name"
                      value={formValues.name}
                      onChange={handleChange('name')}
                      fullWidth
                      required
                      error={Boolean(formErrors.name)}
                      helperText={formErrors.name}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      value={formValues.email}
                      onChange={handleChange('email')}
                      fullWidth
                      required
                      error={Boolean(formErrors.email)}
                      helperText={formErrors.email}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Phone"
                      name="phone"
                      value={formValues.phone}
                      onChange={handleChange('phone')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="City"
                      name="city"
                      value={formValues.city}
                      onChange={handleChange('city')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="State"
                      name="state"
                      value={formValues.state}
                      onChange={handleChange('state')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Postal Code"
                      name="postalCode"
                      value={formValues.postalCode}
                      onChange={handleChange('postalCode')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Address Line 1"
                      name="addressLine1"
                      value={formValues.addressLine1}
                      onChange={handleChange('addressLine1')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Address Line 2"
                      name="addressLine2"
                      value={formValues.addressLine2}
                      onChange={handleChange('addressLine2')}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button component={RouterLink} to="/clients" color="inherit">
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving…' : 'Save Client'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                Recent Invoices
              </Typography>
              {client?.invoices && client.invoices.length ? (
                <Table size="small" aria-label="Client invoices table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {client.invoices.slice(0, 5).map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.status.label}</TableCell>
                        <TableCell align="right">{formatCurrency(invoice.total)}</TableCell>
                        <TableCell align="right">
                          <Button
                            component={RouterLink}
                            to={`/invoices/${invoice.id}`}
                            size="small"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No invoices for this client yet.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ClientFormPage;
