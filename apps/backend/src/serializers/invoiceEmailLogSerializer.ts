import type { InvoiceEmailLogRecord } from '../repositories/invoiceEmailLogRepository';
import {
  invoiceEmailLogResponseSchema,
  type InvoiceEmailLogResponse
} from '../schemas/invoiceEmailSchemas';

export function serializeInvoiceEmailLog(
  log: InvoiceEmailLogRecord
): InvoiceEmailLogResponse {
  const payload = {
    id: log.id,
    invoiceId: log.invoiceId,
    recipientEmail: log.recipientEmail,
    templateName: log.templateName,
    subject: log.subject,
    messageId: log.messageId ?? null,
    success: log.success,
    errorMessage: log.errorMessage ?? null,
    createdAt: log.createdAt.toISOString()
  };

  return invoiceEmailLogResponseSchema.parse(payload);
}
