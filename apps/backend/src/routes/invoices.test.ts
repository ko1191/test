import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/invoiceRepository', () => ({
  listInvoices: vi.fn(),
  getInvoiceById: vi.fn()
}));

vi.mock('../services/invoiceService', () => ({
  createInvoiceWithCalculations: vi.fn(),
  updateInvoiceWithCalculations: vi.fn()
}));

vi.mock('../services/invoiceDocumentService', () => ({
  ensureInvoicePdf: vi.fn(),
  getInvoicePdfDownloadName: vi.fn()
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
import {
  ensureInvoicePdf,
  getInvoicePdfDownloadName
} from '../services/invoiceDocumentService';
import { createInvoiceFixture } from '../__fixtures__/invoiceFixture';

const binaryParser = (
  res: NodeJS.ReadableStream,
  callback: (error: Error | null, data: Buffer) => void
) => {
  const chunks: Buffer[] = [];

  res.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'binary'));
  });

  res.on('end', () => {
    callback(null, Buffer.concat(chunks));
  });

  res.on('error', (error) => {
    callback(error, Buffer.alloc(0));
  });
};

let baseInvoice: InvoiceWithRelations;

describe('Invoice routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseInvoice = createInvoiceFixture();
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

    const createdInvoice = {
      ...createInvoiceFixture(),
      id: 2,
      invoiceNumber: payload.invoiceNumber,
      clientId: payload.clientId
    };

    vi.mocked(createInvoiceWithCalculations).mockResolvedValue(createdInvoice);

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
    const updatedInvoice = {
      ...createInvoiceFixture(),
      status: {
        ...baseInvoice.status,
        code: 'PAID'
      }
    };

    vi.mocked(updateInvoiceWithCalculations).mockResolvedValue(updatedInvoice);

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

  it('downloads a stored invoice pdf', async () => {
    const invoice = createInvoiceFixture();
    const downloadName = 'inv-2024-100.pdf';
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'invoice-pdf-'));

    try {
      const filePath = path.join(tempDir, 'invoice.pdf');
      const pdfBuffer = Buffer.from('%PDF-1.4\nSample Invoice');
      await fs.writeFile(filePath, pdfBuffer);

      vi.mocked(getInvoiceById).mockResolvedValue(invoice);
      vi.mocked(ensureInvoicePdf).mockResolvedValue(filePath);
      vi.mocked(getInvoicePdfDownloadName).mockReturnValue(downloadName);

      const response = await request(createApp())
        .get('/invoices/1/pdf')
        .buffer(true)
        .parse(binaryParser);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain(downloadName);
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect((response.body as Buffer).equals(pdfBuffer)).toBe(true);
      expect(vi.mocked(ensureInvoicePdf)).toHaveBeenCalledWith(invoice);
      expect(vi.mocked(getInvoicePdfDownloadName)).toHaveBeenCalledWith(invoice);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns 404 when requesting a pdf for a missing invoice', async () => {
    vi.mocked(getInvoiceById).mockResolvedValue(null);

    const response = await request(createApp()).get('/invoices/999/pdf');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Invoice not found');
  });
});
