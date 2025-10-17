import type { InvoiceEmailLogRecord } from '../repositories/invoiceEmailLogRepository';

export function createInvoiceEmailLogFixture(
  overrides: Partial<InvoiceEmailLogRecord> = {}
): InvoiceEmailLogRecord {
  const base: InvoiceEmailLogRecord = {
    id: 1,
    invoiceId: 1,
    recipientEmail: 'billing@acme.test',
    templateName: 'invoice-issued',
    subject: 'Invoice INV-2024-100 from Invoicing System',
    messageId: '<message-id@example.com>',
    success: true,
    errorMessage: null,
    createdAt: new Date('2024-04-02T10:00:00.000Z')
  };

  return {
    ...base,
    ...overrides
  };
}
