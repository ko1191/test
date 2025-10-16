import { Prisma, type Client } from '@prisma/client';
import type { ClientWithRelations } from '../repositories/clientRepository';
import {
  clientResponseSchema,
  type ClientResponse
} from '../schemas/clientSchemas';

type ClientInput = Client | ClientWithRelations;

const toIsoString = (value: Date) => value.toISOString();

const toDecimalString = (value: Prisma.Decimal | number | string) => {
  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }

  return String(value);
};

const hasInvoiceRelations = (
  client: ClientInput
): client is ClientWithRelations => Array.isArray((client as ClientWithRelations).invoices);

export function serializeClient(
  client: ClientInput,
  withRelations: boolean
): ClientResponse {
  const base = {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone ?? null,
    addressLine1: client.addressLine1 ?? null,
    addressLine2: client.addressLine2 ?? null,
    city: client.city ?? null,
    state: client.state ?? null,
    postalCode: client.postalCode ?? null,
    createdAt: toIsoString(client.createdAt),
    updatedAt: toIsoString(client.updatedAt)
  };

  if (!withRelations) {
    return clientResponseSchema.parse(base);
  }

  if (!hasInvoiceRelations(client)) {
    return clientResponseSchema.parse({ ...base, invoices: [] });
  }

  const invoices = client.invoices.map((invoice) => ({
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
    }))
  }));

  return clientResponseSchema.parse({ ...base, invoices });
}
