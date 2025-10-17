export const invoiceEmailTemplateNames = [
  'invoice-issued',
  'invoice-reminder'
] as const;

export type InvoiceEmailTemplateName =
  (typeof invoiceEmailTemplateNames)[number];

export const defaultInvoiceEmailTemplate: InvoiceEmailTemplateName =
  'invoice-issued';
