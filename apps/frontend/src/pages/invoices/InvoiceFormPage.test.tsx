import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceFormPage from './InvoiceFormPage';

const createClientsResponse = () => [
  {
    id: 1,
    name: 'Acme Corp',
    email: 'hello@acme.com',
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    invoices: []
  }
];

describe('InvoiceFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = (initialPath = '/invoices/new') =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/invoices/new" element={<InvoiceFormPage />} />
          <Route path="/invoices/:invoiceId" element={<InvoiceFormPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('validates form inputs before submission', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: createClientsResponse() })
    } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithRouter();

    await userEvent.click(screen.getByRole('button', { name: /save invoice/i }));

    expect(await screen.findByText('Invoice number is required')).toBeInTheDocument();
    expect(screen.getByText('Client is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Unit price must be zero or more')).toBeInTheDocument();
  });

  it('creates a new invoice and navigates to the detail view', async () => {
    const now = new Date().toISOString();
    const clientsResponse = createClientsResponse();

    const createdInvoice = {
      id: 10,
      invoiceNumber: 'INV-001',
      clientId: 1,
      invoiceStatusId: 1,
      issueDate: new Date('2024-01-01').toISOString(),
      dueDate: new Date('2024-01-15').toISOString(),
      notes: null,
      subtotal: '100.00',
      tax: '7.00',
      total: '107.00',
      createdAt: now,
      updatedAt: now,
      status: {
        id: 1,
        code: 'DRAFT',
        label: 'Draft',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now
      },
      lineItems: [
        {
          id: 1,
          invoiceId: 10,
          description: 'Consulting services',
          quantity: 1,
          unitPrice: '100.00',
          lineTotal: '100.00',
          createdAt: now,
          updatedAt: now
        }
      ],
      client: {
        id: 1,
        name: 'Acme Corp',
        email: 'hello@acme.com'
      }
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: clientsResponse })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: createdInvoice })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: createdInvoice })
      } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithRouter();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const invoiceNumberInput = screen.getByLabelText(/invoice number/i);
    await userEvent.type(invoiceNumberInput, 'INV-001');

    const clientSelect = await screen.findByLabelText(/client/i);
    await userEvent.click(clientSelect);
    await userEvent.click(screen.getByRole('option', { name: 'Acme Corp' }));

    const descriptionInput = screen.getByPlaceholderText('Item description');
    await userEvent.type(descriptionInput, 'Consulting services');

    const unitPriceInput = screen.getByPlaceholderText('0.00');
    await userEvent.type(unitPriceInput, '100.00');

    const taxRateInput = screen.getByLabelText(/tax rate/i);
    await userEvent.clear(taxRateInput);
    await userEvent.type(taxRateInput, '0.07');

    await userEvent.click(screen.getByRole('button', { name: /save invoice/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toContain('/invoices');
    expect(postCall[1]?.method).toBe('POST');
    const requestBody = JSON.parse(postCall[1]?.body as string);
    expect(requestBody).toMatchObject({
      invoiceNumber: 'INV-001',
      clientId: 1,
      statusCode: 'DRAFT',
      taxRate: '0.07'
    });
    expect(requestBody.lineItems).toEqual([
      {
        description: 'Consulting services',
        quantity: 1,
        unitPrice: '100.00'
      }
    ]);

    await waitFor(() => {
      expect(screen.getByText('Invoice created successfully.')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('INV-001')).toBeInTheDocument();
    });
  });
});
