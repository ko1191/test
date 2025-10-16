import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

export type InvoiceStatusWithRelations = Prisma.InvoiceStatusGetPayload<{
  include: { invoices: true };
}>;

export async function listInvoiceStatuses(includeInvoices = false) {
  return prisma.invoiceStatus.findMany({
    orderBy: { sortOrder: 'asc' },
    include: includeInvoices ? { invoices: true } : undefined
  });
}

export async function getInvoiceStatusByCode(code: string) {
  return prisma.invoiceStatus.findUnique({ where: { code } });
}

export async function createInvoiceStatus(data: Prisma.InvoiceStatusCreateInput) {
  return prisma.invoiceStatus.create({ data });
}

export async function updateInvoiceStatus(code: string, data: Prisma.InvoiceStatusUpdateInput) {
  return prisma.invoiceStatus.update({
    where: { code },
    data
  });
}

export async function deleteInvoiceStatus(code: string) {
  return prisma.invoiceStatus.delete({ where: { code } });
}
