import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../repositories/invoiceRepository', () => ({
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  getInvoiceById: vi.fn()
}));

vi.mock('../repositories/invoiceStatusRepository', () => ({
  getInvoiceStatusByCode: vi.fn()
}));

import {
  calculateInvoiceTotals,
  createInvoiceWithCalculations,
  updateInvoiceWithCalculations,
  assertValidStatusTransition
} from './invoiceService';
import {
  createInvoice,
  updateInvoice,
  getInvoiceById,
  type InvoiceWithRelations
} from '../repositories/invoiceRepository';
import { getInvoiceStatusByCode } from '../repositories/invoiceStatusRepository';
import { AppError } from '../errors/AppError';

const decimal = (value: number | string) => new Prisma.Decimal(value);

const mockStatus = {
  id: 1,
  code: 'DRAFT',
  label: 'Draft',
  sortOrder: 1,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z')
};

const sentStatus = {
  id: 2,
  code: 'SENT',
  label: 'Sent',
  sortOrder: 2,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z')
};

const paidStatus = {
  id: 3,
  code: 'PAID',
  label: 'Paid',
  sortOrder: 3,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z')
};

const existingInvoice: InvoiceWithRelations = {
  id: 10,
  invoiceNumber: 'INV-2024-500',
  clientId: 7,
  invoiceStatusId: sentStatus.id,
  issueDate: new Date('2024-03-01T00:00:00.000Z'),
  dueDate: new Date('2024-03-31T00:00:00.000Z'),
  notes: 'Scheduled maintenance sprint',
  subtotal: decimal('1500.00'),
  tax: decimal('120.00'),
  total: decimal('1620.00'),
  createdAt: new Date('2024-03-01T00:00:00.000Z'),
  updatedAt: new Date('2024-03-02T00:00:00.000Z'),
  status: sentStatus,
  client: {
    id: 7,
    name: 'Globex Labs',
    email: 'accounts@globex.test',
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z')
  },
  lineItems: [
    {
      id: 301,
      invoiceId: 10,
      description: 'Backend development',
      quantity: 30,
      unitPrice: decimal('40.00'),
      lineTotal: decimal('1200.00'),
      createdAt: new Date('2024-03-01T00:00:00.000Z'),
      updatedAt: new Date('2024-03-01T00:00:00.000Z')
    },
    {
      id: 302,
      invoiceId: 10,
      description: 'QA support',
      quantity: 10,
      unitPrice: decimal('30.00'),
      lineTotal: decimal('300.00'),
      createdAt: new Date('2024-03-01T00:00:00.000Z'),
      updatedAt: new Date('2024-03-01T00:00:00.000Z')
    }
  ]
};

describe('invoiceService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calculates invoice totals with a tax rate', () => {
    const result = calculateInvoiceTotals(
      [
        { description: 'Design', quantity: 5, unitPrice: '120.50' },
        { description: 'Development', quantity: 3, unitPrice: 200 }
      ],
      '0.05'
    );

    expect(result.subtotal.toString()).toBe('1202.50');
    expect(result.tax.toString()).toBe('60.13');
    expect(result.total.toString()).toBe('1262.63');
    expect(result.lineItems[0].lineTotal.toString()).toBe('602.50');
  });

  it('prevents invalid status transitions', () => {
    expect(() => assertValidStatusTransition('SENT', 'DRAFT')).toThrow(AppError);
  });

  it('creates an invoice with calculated totals and default status', async () => {
    const payload = {
      invoiceNumber: 'INV-2024-600',
      clientId: 15,
      issueDate: '2024-04-01T00:00:00.000Z',
      dueDate: '2024-04-30T00:00:00.000Z',
      lineItems: [
        { description: 'Implementation', quantity: 8, unitPrice: '150.00' }
      ],
      taxRate: '0.10'
    };

    vi.mocked(getInvoiceStatusByCode).mockResolvedValue(mockStatus);
    vi.mocked(createInvoice).mockResolvedValue(existingInvoice);

    await createInvoiceWithCalculations(payload);

    expect(vi.mocked(getInvoiceStatusByCode)).toHaveBeenCalledWith('DRAFT');

    const args = vi.mocked(createInvoice).mock.calls[0][0];
    expect(args.subtotal.toString()).toBe('1200.00');
    expect(args.tax.toString()).toBe('120.00');
    expect(args.total.toString()).toBe('1320.00');

    const createdLineItems = (args.lineItems as { create: Array<Record<string, unknown>> })
      .create;

    expect(Array.isArray(createdLineItems)).toBe(true);
    expect(createdLineItems[0]).toMatchObject({
      description: 'Implementation',
      quantity: 8,
      unitPrice: expect.any(Prisma.Decimal)
    });
    expect(args.notes).toBeNull();
  });

  it('updates an invoice with recalculated totals and status changes', async () => {
    vi.mocked(getInvoiceById).mockResolvedValue(existingInvoice);
    vi.mocked(getInvoiceStatusByCode).mockImplementation(async (code) => {
      if (code === 'PAID') {
        return paidStatus;
      }
      if (code === 'SENT') {
        return sentStatus;
      }
      return null;
    });

    vi.mocked(updateInvoice).mockResolvedValue({
      ...existingInvoice,
      status: paidStatus,
      subtotal: decimal('2000.00'),
      tax: decimal('160.00'),
      total: decimal('2160.00'),
      lineItems: [
        {
          id: 999,
          invoiceId: existingInvoice.id,
          description: 'Refined scope',
          quantity: 10,
          unitPrice: decimal('200.00'),
          lineTotal: decimal('2000.00'),
          createdAt: new Date('2024-04-01T00:00:00.000Z'),
          updatedAt: new Date('2024-04-01T00:00:00.000Z')
        }
      ]
    });

    await updateInvoiceWithCalculations(existingInvoice.id, {
      lineItems: [{ description: 'Refined scope', quantity: 10, unitPrice: '200' }],
      statusCode: 'PAID',
      taxRate: '0.08'
    });

    expect(vi.mocked(getInvoiceStatusByCode)).toHaveBeenCalledWith('PAID');

    const args = vi.mocked(updateInvoice).mock.calls[0][1];
    expect(args?.subtotal?.toString()).toBe('2000.00');
    expect(args?.tax?.toString()).toBe('160.00');
    expect(args?.total?.toString()).toBe('2160.00');

    const updatedLineItems = (
      args?.lineItems as { create: Array<Record<string, unknown>> } | undefined
    )?.create;

    expect(Array.isArray(updatedLineItems)).toBe(true);
    expect(updatedLineItems).toHaveLength(1);
    expect(args?.status).toEqual({ connect: { code: 'PAID' } });
  });

  it('throws when attempting an invalid update transition', async () => {
    vi.mocked(getInvoiceById).mockResolvedValue(existingInvoice);

    await expect(
      updateInvoiceWithCalculations(existingInvoice.id, {
        statusCode: 'DRAFT'
      })
    ).rejects.toThrow(AppError);
  });
});
