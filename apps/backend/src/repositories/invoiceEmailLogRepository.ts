import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

export type InvoiceEmailLogRecord = Prisma.InvoiceEmailLog;

export type InvoiceEmailLogCreateInput = {
  invoiceId: number;
  recipientEmail: string;
  templateName: string;
  subject: string;
  success: boolean;
  errorMessage?: string | null;
  messageId?: string | null;
};

export async function createInvoiceEmailLog(
  input: InvoiceEmailLogCreateInput
): Promise<InvoiceEmailLogRecord> {
  return prisma.invoiceEmailLog.create({
    data: {
      invoiceId: input.invoiceId,
      recipientEmail: input.recipientEmail,
      templateName: input.templateName,
      subject: input.subject,
      success: input.success,
      errorMessage: input.errorMessage ?? null,
      messageId: input.messageId ?? null
    }
  });
}
