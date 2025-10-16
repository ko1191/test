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
import {
  listInvoices,
  getInvoiceById,
  type InvoiceListFilters
} from '../repositories/invoiceRepository';
import {
  createInvoiceWithCalculations,
  updateInvoiceWithCalculations
} from '../services/invoiceService';
import { serializeInvoice } from '../serializers/invoiceSerializer';

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
