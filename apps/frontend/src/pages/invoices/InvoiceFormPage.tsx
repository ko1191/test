import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Visibility';
import SendIcon from '@mui/icons-material/Send';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useClientsList } from '../../hooks/useClients';
import {
  useInvoice,
  useInvoiceEmail,
  useInvoiceMutations,
  useInvoicePdf
} from '../../hooks/useInvoices';

type InvoiceStatusOption = {
  code: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  label: string;
};

type InvoiceLineItemForm = {
  description: string;
  quantity: string;
  unitPrice: string;
};

type InvoiceFormState = {
  invoiceNumber: string;
  clientId: string;
  statusCode: InvoiceStatusOption['code'];
  issueDate: string;
  dueDate: string;
  notes: string;
  taxRate: string;
  lineItems: InvoiceLineItemForm[];
};

type InvoiceFormErrors = Partial<{
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  lineItems: string;
}>;

type LineItemErrors = Partial<Record<keyof InvoiceLineItemForm, string>>;

type SnackbarState = {
  message: string;
  severity: 'success' | 'error';
} | null;

type EmailFormState = {
  recipientEmail: string;
  template: 'invoice-issued' | 'invoice-reminder';
  message: string;
};

const invoiceStatusOptions: InvoiceStatusOption[] = [
  { code: 'DRAFT', label: 'Draft' },
  { code: 'SENT', label: 'Sent' },
  { code: 'PAID', label: 'Paid' },
  { code: 'OVERDUE', label: 'Overdue' }
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getToday = () => new Date().toISOString().slice(0, 10);

const toDateInputValue = (value: string) => value.slice(0, 10);

const createEmptyLineItem = (): InvoiceLineItemForm => ({
  description: '',
  quantity: '1',
  unitPrice: ''
});

const createDefaultFormState = (): InvoiceFormState => ({
  invoiceNumber: '',
  clientId: '',
  statusCode: 'DRAFT',
  issueDate: getToday(),
  dueDate: getToday(),
  notes: '',
  taxRate: '',
  lineItems: [createEmptyLineItem()]
});

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(roundCurrency(value));

const calculateTotals = (lineItems: InvoiceLineItemForm[], taxRateInput: string) => {
  const subtotal = lineItems.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      return sum;
    }

    return sum + quantity * unitPrice;
  }, 0);

  const parsedTaxRate = Number(taxRateInput);
  const taxRate = Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total
  };
};

const deriveTaxRate = (subtotal: string, tax: string) => {
  const subtotalValue = Number(subtotal);
  const taxValue = Number(tax);

  if (!Number.isFinite(subtotalValue) || subtotalValue === 0) {
    return '';
  }

  const rate = taxValue / subtotalValue;

  if (!Number.isFinite(rate) || rate === 0) {
    return '';
  }

  return (Math.round(rate * 10000) / 10000).toString();
};

function InvoiceFormPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !invoiceId || invoiceId === 'new';
  const numericId = !isNew ? Number(invoiceId) : undefined;

  const { clients, loading: clientsLoading, error: clientsError } = useClientsList();
  const { invoice, loading: invoiceLoading, error, refresh } = useInvoice(numericId);
  const {
    createInvoice,
    updateInvoice,
    createStatus,
    createError,
    resetCreate,
    updateStatus,
    updateError,
    resetUpdate
  } = useInvoiceMutations();
  const { download, status: pdfStatus, error: pdfError, reset: resetPdf } = useInvoicePdf(
    numericId
  );
  const {
    sendEmail,
    status: emailStatus,
    error: emailError,
    reset: resetEmail
  } = useInvoiceEmail(numericId);

  const [formValues, setFormValues] = useState<InvoiceFormState>(() => createDefaultFormState());
  const [formErrors, setFormErrors] = useState<InvoiceFormErrors>({});
  const [lineItemErrors, setLineItemErrors] = useState<LineItemErrors[]>([{}]);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailFormState>({
    recipientEmail: '',
    template: 'invoice-issued',
    message: ''
  });
  const [emailFormErrors, setEmailFormErrors] = useState<{ recipientEmail?: string }>({});

  useEffect(() => {
    if (typeof location.state === 'object' && location.state !== null) {
      const state = location.state as { showSuccess?: boolean; successMessage?: string };

      if (state.showSuccess) {
        setSnackbar({
          message: state.successMessage ?? 'Invoice updated successfully.',
          severity: 'success'
        });
        navigate(location.pathname, {
          replace: true,
          state: { ...state, showSuccess: false }
        });
      }
    }
  }, [location, navigate]);

  useEffect(() => {
    if (isNew) {
      const defaults = createDefaultFormState();
      setFormValues(defaults);
      setFormErrors({});
      setLineItemErrors(defaults.lineItems.map(() => ({})));
      resetCreate();
      resetUpdate();
      resetPdf();
      resetEmail();
      setEmailForm((previous) => ({ ...previous, recipientEmail: '' }));
      return;
    }

    if (invoice) {
      const taxRate = deriveTaxRate(invoice.subtotal, invoice.tax);
      const lineItems = invoice.lineItems.length
        ? invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice
          }))
        : [createEmptyLineItem()];

      setFormValues({
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId.toString(),
        statusCode: invoice.status.code,
        issueDate: toDateInputValue(invoice.issueDate),
        dueDate: toDateInputValue(invoice.dueDate),
        notes: invoice.notes ?? '',
        taxRate,
        lineItems
      });
      setLineItemErrors(lineItems.map(() => ({})));
      setFormErrors({});
      setEmailForm((previous) => ({
        ...previous,
        recipientEmail: invoice.client.email
      }));
    }
  }, [isNew, invoice, resetCreate, resetUpdate, resetPdf, resetEmail]);

  const mutationError = isNew ? createError : updateError;
  const mutationStatus = isNew ? createStatus : updateStatus;
  const isSubmitting = mutationStatus === 'loading';
  const isLoading = invoiceLoading && !isNew;
  const totals = useMemo(
    () => calculateTotals(formValues.lineItems, formValues.taxRate),
    [formValues.lineItems, formValues.taxRate]
  );

  const pdfLoading = pdfStatus === 'loading';
  const emailSending = emailStatus === 'loading';

  const handleChange = (field: keyof Omit<InvoiceFormState, 'lineItems'>) =>
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

  const handleLineItemChange = (
    index: number,
    field: keyof InvoiceLineItemForm
  ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setFormValues((previous) => {
        const nextLineItems = previous.lineItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        );

        return {
          ...previous,
          lineItems: nextLineItems
        };
      });

      setLineItemErrors((previous) => {
        if (!previous[index]?.[field]) {
          return previous;
        }

        const next = previous.map((itemErrors, itemIndex) => {
          if (itemIndex !== index) {
            return itemErrors;
          }

          const updated = { ...itemErrors };
          delete updated[field];
          return updated;
        });

        return next;
      });
    };

  const handleAddLineItem = () => {
    setFormValues((previous) => ({
      ...previous,
      lineItems: [...previous.lineItems, createEmptyLineItem()]
    }));
    setLineItemErrors((previous) => [...previous, {}]);
  };

  const handleRemoveLineItem = (index: number) => () => {
    setFormValues((previous) => {
      if (previous.lineItems.length === 1) {
        return previous;
      }

      const nextLineItems = previous.lineItems.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...previous,
        lineItems: nextLineItems
      };
    });

    setLineItemErrors((previous) => {
      if (previous.length === 1) {
        return previous;
      }

      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const validate = useCallback(() => {
    const nextFormErrors: InvoiceFormErrors = {};
    const nextLineItemErrors: LineItemErrors[] = formValues.lineItems.map(() => ({}));

    if (!formValues.invoiceNumber.trim()) {
      nextFormErrors.invoiceNumber = 'Invoice number is required';
    }

    if (!formValues.clientId) {
      nextFormErrors.clientId = 'Client is required';
    }

    if (!formValues.issueDate) {
      nextFormErrors.issueDate = 'Issue date is required';
    }

    if (!formValues.dueDate) {
      nextFormErrors.dueDate = 'Due date is required';
    }

    if (formValues.issueDate && formValues.dueDate) {
      const issueDate = new Date(formValues.issueDate);
      const dueDate = new Date(formValues.dueDate);

      if (dueDate < issueDate) {
        nextFormErrors.dueDate = 'Due date must be on or after the issue date';
      }
    }

    if (formValues.taxRate.trim()) {
      const taxRate = Number(formValues.taxRate);

      if (!Number.isFinite(taxRate) || taxRate < 0) {
        nextFormErrors.taxRate = 'Tax rate must be a positive number';
      }
    }

    formValues.lineItems.forEach((item, index) => {
      const itemErrors: LineItemErrors = {};

      if (!item.description.trim()) {
        itemErrors.description = 'Description is required';
      }

      const quantity = Number(item.quantity);

      if (!item.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
        itemErrors.quantity = 'Quantity must be greater than zero';
      }

      const unitPrice = Number(item.unitPrice);

      if (!item.unitPrice.trim() || !Number.isFinite(unitPrice) || unitPrice < 0) {
        itemErrors.unitPrice = 'Unit price must be zero or more';
      }

      nextLineItemErrors[index] = itemErrors;
    });

    if (!formValues.lineItems.length) {
      nextFormErrors.lineItems = 'At least one line item is required';
    }

    const hasFormErrors = Object.keys(nextFormErrors).length > 0;
    const hasLineItemErrors = nextLineItemErrors.some((errors) => Object.keys(errors).length > 0);

    return {
      formErrors: nextFormErrors,
      lineItemErrors: nextLineItemErrors,
      hasErrors: hasFormErrors || hasLineItemErrors
    };
  }, [formValues]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validate();

    if (validation.hasErrors) {
      setFormErrors(validation.formErrors);
      setLineItemErrors(validation.lineItemErrors);
      return;
    }

    const payload = {
      invoiceNumber: formValues.invoiceNumber.trim(),
      clientId: Number(formValues.clientId),
      statusCode: formValues.statusCode,
      issueDate: new Date(formValues.issueDate).toISOString(),
      dueDate: new Date(formValues.dueDate).toISOString(),
      notes: formValues.notes.trim() ? formValues.notes.trim() : null,
      taxRate: formValues.taxRate.trim() ? formValues.taxRate.trim() : undefined,
      lineItems: formValues.lineItems.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice.trim()
      }))
    };

    try {
      if (isNew) {
        const created = await createInvoice(payload);
        if (created) {
          navigate(`/invoices/${created.id}`, {
            replace: true,
            state: {
              showSuccess: true,
              successMessage: 'Invoice created successfully.'
            }
          });
        }
      } else if (numericId) {
        await updateInvoice(numericId, payload);
        await refresh();
        setSnackbar({ message: 'Invoice updated successfully.', severity: 'success' });
      }
    } catch (error) {
      // errors handled by hooks
      console.error(error);
    }
  };

  const computeLineTotal = (item: InvoiceLineItemForm) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      return '—';
    }

    return formatCurrency(quantity * unitPrice);
  };

  const handleSnackbarClose = () => {
    setSnackbar(null);
    resetCreate();
    resetUpdate();
    resetPdf();
    resetEmail();
  };

  const handleOpenSendDialog = () => {
    setSendDialogOpen(true);
    setEmailFormErrors({});
    resetEmail();

    if (invoice?.client.email) {
      setEmailForm((previous) => ({
        ...previous,
        recipientEmail: invoice.client.email
      }));
    }
  };

  const handleCloseSendDialog = () => {
    setSendDialogOpen(false);
    setEmailFormErrors({});
    resetEmail();
  };

  const handleEmailChange = (
    field: keyof EmailFormState
  ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setEmailForm((previous) => ({ ...previous, [field]: value }));

      if (field === 'recipientEmail' && emailFormErrors.recipientEmail) {
        setEmailFormErrors({});
      }
    };

  const handleSendEmail = async () => {
    if (!numericId) {
      return;
    }

    const recipientEmail = emailForm.recipientEmail.trim();

    if (!recipientEmail || !emailPattern.test(recipientEmail)) {
      setEmailFormErrors({ recipientEmail: 'A valid recipient email is required' });
      return;
    }

    try {
      await sendEmail({
        template: emailForm.template,
        recipientEmail,
        message: emailForm.message.trim() ? emailForm.message.trim() : undefined
      });
      setSendDialogOpen(false);
      setSnackbar({ message: 'Invoice email sent successfully.', severity: 'success' });
      resetEmail();
    } catch (error) {
      console.error(error);
    }
  };

  const handlePreview = async () => {
    try {
      const blob = await download();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setSnackbar({ message: 'Invoice preview opened in a new tab.', severity: 'success' });
    } catch (error) {
      console.error(error);
      setSnackbar({
        message: error instanceof Error ? error.message : 'Could not preview invoice.',
        severity: 'error'
      });
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await download();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${formValues.invoiceNumber || numericId || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSnackbar({ message: 'Invoice PDF downloaded.', severity: 'success' });
    } catch (error) {
      console.error(error);
      setSnackbar({
        message: error instanceof Error ? error.message : 'Could not download invoice.',
        severity: 'error'
      });
    }
  };

  const pageTitle = isNew ? 'New Invoice' : invoice ? `Invoice ${invoice.invoiceNumber}` : 'Edit Invoice';
  const disableSendActions = isNew || !numericId;

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
            Create and manage invoices, preview documents, and send them to clients.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button component={RouterLink} to="/invoices" variant="outlined">
            Back to Invoices
          </Button>
          <Button
            startIcon={<PreviewIcon />}
            variant="outlined"
            onClick={handlePreview}
            disabled={disableSendActions || pdfLoading}
          >
            Preview
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={handleDownload}
            disabled={disableSendActions || pdfLoading}
          >
            Download
          </Button>
          <Button
            startIcon={<SendIcon />}
            variant="contained"
            onClick={handleOpenSendDialog}
            disabled={disableSendActions}
          >
            Send Invoice
          </Button>
        </Stack>
      </Stack>

      {pdfError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pdfError}
        </Alert>
      ) : null}

      {clientsError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {clientsError}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading invoice" />
        </Box>
      ) : (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }} noValidate>
          <Stack spacing={3}>
            {mutationError ? <Alert severity="error">{mutationError}</Alert> : null}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Invoice Number"
                  name="invoiceNumber"
                  value={formValues.invoiceNumber}
                  onChange={handleChange('invoiceNumber')}
                  required
                  fullWidth
                  error={Boolean(formErrors.invoiceNumber)}
                  helperText={formErrors.invoiceNumber}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Client"
                  name="clientId"
                  value={formValues.clientId}
                  onChange={handleChange('clientId')}
                  required
                  fullWidth
                  disabled={clientsLoading && !clients.length}
                  error={Boolean(formErrors.clientId)}
                  helperText={formErrors.clientId || (clientsLoading ? 'Loading clients…' : undefined)}
                >
                  <MenuItem value="" disabled>
                    Select a client
                  </MenuItem>
                  {clients.map((clientOption) => (
                    <MenuItem key={clientOption.id} value={clientOption.id.toString()}>
                      {clientOption.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Status"
                  name="statusCode"
                  value={formValues.statusCode}
                  onChange={handleChange('statusCode')}
                  fullWidth
                >
                  {invoiceStatusOptions.map((option) => (
                    <MenuItem key={option.code} value={option.code}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Issue Date"
                  name="issueDate"
                  type="date"
                  value={formValues.issueDate}
                  onChange={handleChange('issueDate')}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(formErrors.issueDate)}
                  helperText={formErrors.issueDate}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Due Date"
                  name="dueDate"
                  type="date"
                  value={formValues.dueDate}
                  onChange={handleChange('dueDate')}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(formErrors.dueDate)}
                  helperText={formErrors.dueDate}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Tax Rate"
                  name="taxRate"
                  value={formValues.taxRate}
                  onChange={handleChange('taxRate')}
                  fullWidth
                  placeholder="e.g. 0.07"
                  error={Boolean(formErrors.taxRate)}
                  helperText={formErrors.taxRate || 'Enter the rate as a decimal (e.g. 0.07 for 7%)'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  name="notes"
                  value={formValues.notes}
                  onChange={handleChange('notes')}
                  fullWidth
                  multiline
                  minRows={3}
                />
              </Grid>
            </Grid>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Line Items
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddLineItem}
                >
                  Add Item
                </Button>
              </Stack>

              {formErrors.lineItems ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formErrors.lineItems}
                </Alert>
              ) : null}

              <Table size="small" aria-label="Invoice line items">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell width="120">Quantity</TableCell>
                    <TableCell width="160">Unit Price</TableCell>
                    <TableCell width="160">Line Total</TableCell>
                    <TableCell align="right" width="80">
                      Remove
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formValues.lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ minWidth: 240 }}>
                        <TextField
                          value={item.description}
                          onChange={handleLineItemChange(index, 'description')}
                          fullWidth
                          placeholder="Item description"
                          error={Boolean(lineItemErrors[index]?.description)}
                          helperText={lineItemErrors[index]?.description}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.quantity}
                          onChange={handleLineItemChange(index, 'quantity')}
                          fullWidth
                          inputMode="numeric"
                          error={Boolean(lineItemErrors[index]?.quantity)}
                          helperText={lineItemErrors[index]?.quantity}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.unitPrice}
                          onChange={handleLineItemChange(index, 'unitPrice')}
                          fullWidth
                          inputMode="decimal"
                          placeholder="0.00"
                          error={Boolean(lineItemErrors[index]?.unitPrice)}
                          helperText={lineItemErrors[index]?.unitPrice}
                        />
                      </TableCell>
                      <TableCell>{computeLineTotal(item)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="Remove line item"
                          onClick={handleRemoveLineItem(index)}
                          disabled={formValues.lineItems.length === 1}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
              <Typography variant="subtitle1">Subtotal: {formatCurrency(totals.subtotal)}</Typography>
              <Typography variant="subtitle1">Tax: {formatCurrency(totals.tax)}</Typography>
              <Typography variant="subtitle1">Total: {formatCurrency(totals.total)}</Typography>
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button component={RouterLink} to="/invoices" color="inherit">
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save Invoice'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Dialog open={sendDialogOpen} onClose={handleCloseSendDialog} fullWidth maxWidth="sm">
        <DialogTitle>Send Invoice</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {emailError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {emailError}
            </Alert>
          ) : null}
          <Stack spacing={2}>
            <TextField
              label="Recipient Email"
              value={emailForm.recipientEmail}
              onChange={handleEmailChange('recipientEmail')}
              required
              error={Boolean(emailFormErrors.recipientEmail)}
              helperText={emailFormErrors.recipientEmail}
            />
            <TextField
              select
              label="Template"
              value={emailForm.template}
              onChange={handleEmailChange('template')}
            >
              <MenuItem value="invoice-issued">Invoice issued</MenuItem>
              <MenuItem value="invoice-reminder">Invoice reminder</MenuItem>
            </TextField>
            <TextField
              label="Message"
              value={emailForm.message}
              onChange={handleEmailChange('message')}
              multiline
              minRows={3}
              placeholder="Optional message to include in the email"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSendDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSendEmail} variant="contained" disabled={emailSending}>
            {emailSending ? 'Sending…' : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
}

export default InvoiceFormPage;
