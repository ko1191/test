import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../errors/AppError';
import {
  invoiceCreateSchema,
  invoiceDetailResponseSchema,
  invoiceIdParamSchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceUpdateSchema
} from '../schemas/invoiceSchemas';
import { invoiceEmailSendSchema } from '../schemas/invoiceEmailSchemas';
import {
  listInvoices,
  getInvoiceById,
  type InvoiceListFilters
} from '../repositories/invoiceRepository';
import {
  createInvoiceWithCalculations,
  updateInvoiceWithCalculations
} from '../services/invoiceService';
import {
  ensureInvoicePdf,
  getInvoicePdfDownloadName
} from '../services/invoiceDocumentService';
import { sendInvoiceEmail } from '../services/invoiceEmailService';
import { serializeInvoice } from '../serializers/invoiceSerializer';
import { serializeInvoiceEmailLog } from '../serializers/invoiceEmailLogSerializer';

export const invoiceRouter = Router();

invoiceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = invoiceListQuerySchema.parse(req.query);

    const filters: InvoiceListFilters = {};

    if (query.status) {
      filters.statusCode = query.status.toUpperCase();
    }

    if (typeof query.clientId === 'number') {
      filters.clientId = query.clientId;
    }

    const invoices = await listInvoices(filters);
    const payload = invoices.map((invoice) => serializeInvoice(invoice));

    res.json({ data: invoiceListResponseSchema.parse(payload) });
  })
);

invoiceRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const payload = serializeInvoice(invoice);

    res.json({ data: invoiceDetailResponseSchema.parse(payload) });
  })
);

invoiceRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const filePath = await ensureInvoicePdf(invoice);
    const downloadName = getInvoicePdfDownloadName(invoice);

    res.type('application/pdf');

    await new Promise<void>((resolve, reject) => {
      res.download(filePath, downloadName, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  })
);

invoiceRouter.post(
  '/:id/email',
  asyncHandler(async (req, res) => {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const body = invoiceEmailSendSchema.parse(req.body ?? {});
    const { log } = await sendInvoiceEmail(invoice, body);
    const payload = serializeInvoiceEmailLog(log);

    res.status(202).json({ data: payload });
  })
);

invoiceRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = invoiceCreateSchema.parse(req.body);
    const invoice = await createInvoiceWithCalculations(body);
    const payload = serializeInvoice(invoice);

    res.status(201).json({ data: invoiceDetailResponseSchema.parse(payload) });
  })
);

invoiceRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const body = invoiceUpdateSchema.parse(req.body);
    const invoice = await updateInvoiceWithCalculations(id, body);
    const payload = serializeInvoice(invoice);

    res.json({ data: invoiceDetailResponseSchema.parse(payload) });
  })
);
