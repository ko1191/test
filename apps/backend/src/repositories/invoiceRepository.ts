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

export async function listInvoices() {
  return prisma.invoice.findMany({
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
