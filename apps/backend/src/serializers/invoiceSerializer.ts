import { Prisma } from '@prisma/client';
import type { InvoiceWithRelations } from '../repositories/invoiceRepository';
import {
  invoiceDetailResponseSchema,
  type InvoiceDetailResponse
} from '../schemas/invoiceSchemas';

const toIsoString = (value: Date) => value.toISOString();

const toDecimalString = (value: Prisma.Decimal | number | string) => {
  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }

  return String(value);
};

export function serializeInvoice(invoice: InvoiceWithRelations): InvoiceDetailResponse {
  const payload = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    invoiceStatusId: invoice.invoiceStatusId,
    issueDate: toIsoString(invoice.issueDate),
    dueDate: toIsoString(invoice.dueDate),
    notes: invoice.notes ?? null,
    subtotal: toDecimalString(invoice.subtotal),
    tax: toDecimalString(invoice.tax),
    total: toDecimalString(invoice.total),
    createdAt: toIsoString(invoice.createdAt),
    updatedAt: toIsoString(invoice.updatedAt),
    status: {
      id: invoice.status.id,
      code: invoice.status.code,
      label: invoice.status.label,
      sortOrder: invoice.status.sortOrder,
      createdAt: toIsoString(invoice.status.createdAt),
      updatedAt: toIsoString(invoice.status.updatedAt)
    },
    lineItems: invoice.lineItems.map((lineItem) => ({
      id: lineItem.id,
      invoiceId: lineItem.invoiceId,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unitPrice: toDecimalString(lineItem.unitPrice),
      lineTotal: toDecimalString(lineItem.lineTotal),
      createdAt: toIsoString(lineItem.createdAt),
      updatedAt: toIsoString(lineItem.updatedAt)
    })),
    client: {
      id: invoice.client.id,
      name: invoice.client.name,
      email: invoice.client.email
    }
  };

  return invoiceDetailResponseSchema.parse(payload);
}
