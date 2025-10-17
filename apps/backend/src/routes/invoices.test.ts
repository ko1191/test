import request from 'supertest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../repositories/invoiceRepository', () => ({
  listInvoices: vi.fn(),
  getInvoiceById: vi.fn()
}));

vi.mock('../services/invoiceService', () => ({
  createInvoiceWithCalculations: vi.fn(),
  updateInvoiceWithCalculations: vi.fn()
}));

import { createApp } from '../app';
import {
  listInvoices,
  getInvoiceById,
  type InvoiceWithRelations
} from '../repositories/invoiceRepository';
import {
  createInvoiceWithCalculations,
  updateInvoiceWithCalculations
} from '../services/invoiceService';

const decimal = (value: number | string) => new Prisma.Decimal(value);

const baseInvoice: InvoiceWithRelations = {
  id: 1,
  invoiceNumber: 'INV-2024-100',
  clientId: 42,
  invoiceStatusId: 2,
  issueDate: new Date('2024-04-01T00:00:00.000Z'),
  dueDate: new Date('2024-04-30T00:00:00.000Z'),
  notes: 'Consulting retainer',
  subtotal: decimal('1000.00'),
  tax: decimal('80.00'),
  total: decimal('1080.00'),
  createdAt: new Date('2024-04-01T00:00:00.000Z'),
  updatedAt: new Date('2024-04-02T00:00:00.000Z'),
  client: {
    id: 42,
    name: 'Acme Corporation',
    email: 'billing@acme.test',
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z')
  },
  status: {
    id: 2,
    code: 'SENT',
    label: 'Sent',
    sortOrder: 2,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z')
  },
  lineItems: [
    {
      id: 101,
      invoiceId: 1,
      description: 'Consulting hours',
      quantity: 10,
      unitPrice: decimal('100.00'),
      lineTotal: decimal('1000.00'),
      createdAt: new Date('2024-04-01T00:00:00.000Z'),
      updatedAt: new Date('2024-04-01T00:00:00.000Z')
    }
  ]
};

describe('Invoice routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists invoices with serialization and optional filters', async () => {
    vi.mocked(listInvoices).mockResolvedValue([baseInvoice]);

    const response = await request(createApp()).get(
      '/invoices?status=sent&clientId=42'
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: baseInvoice.id,
          invoiceNumber: baseInvoice.invoiceNumber,
          clientId: baseInvoice.clientId,
          invoiceStatusId: baseInvoice.invoiceStatusId,
          issueDate: baseInvoice.issueDate.toISOString(),
          dueDate: baseInvoice.dueDate.toISOString(),
          notes: baseInvoice.notes,
          subtotal: baseInvoice.subtotal.toString(),
          tax: baseInvoice.tax.toString(),
          total: baseInvoice.total.toString(),
          createdAt: baseInvoice.createdAt.toISOString(),
          updatedAt: baseInvoice.updatedAt.toISOString(),
          status: {
            id: baseInvoice.status.id,
            code: baseInvoice.status.code,
            label: baseInvoice.status.label,
            sortOrder: baseInvoice.status.sortOrder,
            createdAt: baseInvoice.status.createdAt.toISOString(),
            updatedAt: baseInvoice.status.updatedAt.toISOString()
          },
          lineItems: [
            {
              id: baseInvoice.lineItems[0].id,
              invoiceId: baseInvoice.lineItems[0].invoiceId,
              description: baseInvoice.lineItems[0].description,
              quantity: baseInvoice.lineItems[0].quantity,
              unitPrice: baseInvoice.lineItems[0].unitPrice.toString(),
              lineTotal: baseInvoice.lineItems[0].lineTotal.toString(),
              createdAt: baseInvoice.lineItems[0].createdAt.toISOString(),
              updatedAt: baseInvoice.lineItems[0].updatedAt.toISOString()
            }
          ],
          client: {
            id: baseInvoice.client.id,
            name: baseInvoice.client.name,
            email: baseInvoice.client.email
          }
        }
      ]
    });

    expect(vi.mocked(listInvoices)).toHaveBeenCalledWith({
      statusCode: 'SENT',
      clientId: 42
    });
  });

  it('returns invoices without filters when none are provided', async () => {
    vi.mocked(listInvoices).mockResolvedValue([baseInvoice]);

    const response = await request(createApp()).get('/invoices');

    expect(response.status).toBe(200);
    expect(vi.mocked(listInvoices)).toHaveBeenCalledWith({});
    expect(response.body.data).toHaveLength(1);
  });

  it('returns 404 when invoice is not found', async () => {
    vi.mocked(getInvoiceById).mockResolvedValue(null);

    const response = await request(createApp()).get('/invoices/999');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Invoice not found');
  });

  it('retrieves a single invoice by id', async () => {
    vi.mocked(getInvoiceById).mockResolvedValue(baseInvoice);

    const response = await request(createApp()).get('/invoices/1');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: baseInvoice.id,
      invoiceNumber: baseInvoice.invoiceNumber,
      total: baseInvoice.total.toString(),
      client: {
        id: baseInvoice.client.id,
        name: baseInvoice.client.name
      }
    });
  });

  it('validates invoice id params', async () => {
    const response = await request(createApp()).get('/invoices/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('creates an invoice with calculated totals', async () => {
    const payload = {
      invoiceNumber: 'INV-2024-101',
      clientId: 77,
      issueDate: '2024-05-01T00:00:00.000Z',
      dueDate: '2024-05-31T00:00:00.000Z',
      lineItems: [
        {
          description: 'Development',
          quantity: 25,
          unitPrice: '80.00'
        }
      ],
      taxRate: '0.08'
    };

    vi.mocked(createInvoiceWithCalculations).mockResolvedValue({
      ...baseInvoice,
      id: 2,
      invoiceNumber: payload.invoiceNumber,
      clientId: payload.clientId
    });

    const response = await request(createApp()).post('/invoices').send(payload);

    expect(response.status).toBe(201);
    expect(vi.mocked(createInvoiceWithCalculations)).toHaveBeenCalledWith(payload);
    expect(response.body.data.id).toBe(2);
    expect(response.body.data.invoiceNumber).toBe(payload.invoiceNumber);
  });

  it('rejects invoice creation without line items', async () => {
    const response = await request(createApp()).post('/invoices').send({
      invoiceNumber: 'INV-2024-200',
      clientId: 10,
      issueDate: '2024-05-01T00:00:00.000Z',
      dueDate: '2024-05-31T00:00:00.000Z'
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('updates an invoice and returns the updated payload', async () => {
    vi.mocked(updateInvoiceWithCalculations).mockResolvedValue({
      ...baseInvoice,
      status: {
        ...baseInvoice.status,
        code: 'PAID'
      }
    });

    const response = await request(createApp())
      .put('/invoices/1')
      .send({ statusCode: 'PAID' });

    expect(response.status).toBe(200);
    expect(vi.mocked(updateInvoiceWithCalculations)).toHaveBeenCalledWith(1, {
      statusCode: 'PAID'
    });
    expect(response.body.data.status.code).toBe('PAID');
  });

  it('requires at least one field when updating an invoice', async () => {
    const response = await request(createApp()).put('/invoices/1').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });
});
