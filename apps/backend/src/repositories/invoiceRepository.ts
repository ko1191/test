import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

const invoiceInclude = {
  client: true,
  status: true,
  lineItems: {
    orderBy: { createdAt: 'asc' }
  }
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

export type InvoiceListFilters = {
  statusCode?: string;
  clientId?: number;
};

export async function listInvoices(filters: InvoiceListFilters = {}) {
  const where: Prisma.InvoiceWhereInput = {};

  if (typeof filters.clientId === 'number') {
    where.clientId = filters.clientId;
  }

  if (filters.statusCode) {
    where.status = { is: { code: filters.statusCode } };
  }

  return prisma.invoice.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { issueDate: 'desc' },
    include: invoiceInclude
  });
}

export async function getInvoiceById(id: number) {
  return prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude
  });
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  return prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: invoiceInclude
  });
}

export async function createInvoice(data: Prisma.InvoiceCreateInput) {
  return prisma.invoice.create({
    data,
    include: invoiceInclude
  });
}

export async function updateInvoice(id: number, data: Prisma.InvoiceUpdateInput) {
  return prisma.invoice.update({
    where: { id },
    data,
    include: invoiceInclude
  });
}

export async function deleteInvoice(id: number) {
  return prisma.invoice.delete({ where: { id } });
}
