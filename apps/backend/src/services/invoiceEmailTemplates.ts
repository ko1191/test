import { AppError } from '../errors/AppError';
import {
  defaultInvoiceEmailTemplate,
  invoiceEmailTemplateNames,
  type InvoiceEmailTemplateName
} from '../constants/invoiceEmailTemplates';
import type { InvoiceWithRelations } from '../repositories/invoiceRepository';

export type InvoiceEmailTemplateContext = {
  invoice: InvoiceWithRelations;
  message?: string;
};

export type RenderedInvoiceEmailTemplate = {
  subject: string;
  text: string;
};

type InvoiceEmailTemplateRenderer = (
  context: InvoiceEmailTemplateContext
) => RenderedInvoiceEmailTemplate;

const toNumeric = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return Number.parseFloat((value as { toString: () => string }).toString());
  }

  return NaN;
};

const formatCurrency = (value: unknown) => {
  const numeric = toNumeric(value);
  const safeNumber = Number.isFinite(numeric) ? numeric : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(safeNumber);
};

const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long'
  }).format(date);
};

const applyCommonFooter = (lines: string[], message?: string) => {
  const trimmedMessage = message?.trim();

  if (trimmedMessage) {
    lines.push(trimmedMessage, '');
  }

  lines.push('Best regards,', 'Invoicing System');

  return lines.join('\n');
};

const invoiceIssuedTemplate: InvoiceEmailTemplateRenderer = ({
  invoice,
  message
}) => {
  const dueDate = formatDate(invoice.dueDate);
  const total = formatCurrency(invoice.total);
  const lines = [
    `Hello ${invoice.client.name},`,
    '',
    `Please find invoice ${invoice.invoiceNumber} attached. The total amount due is ${total}.`,
    `The payment is due on ${dueDate}.`,
    ''
  ];

  return {
    subject: `Invoice ${invoice.invoiceNumber} from Invoicing System`,
    text: applyCommonFooter(lines, message)
  };
};

const invoiceReminderTemplate: InvoiceEmailTemplateRenderer = ({
  invoice,
  message
}) => {
  const dueDate = formatDate(invoice.dueDate);
  const total = formatCurrency(invoice.total);
  const lines = [
    `Hello ${invoice.client.name},`,
    '',
    `This is a friendly reminder that invoice ${invoice.invoiceNumber} totaling ${total} was due on ${dueDate}.`,
    'Please review the attached invoice and let us know if you have any questions.',
    ''
  ];

  return {
    subject: `Reminder: Invoice ${invoice.invoiceNumber} is overdue`,
    text: applyCommonFooter(lines, message)
  };
};

const templateRegistry: Record<InvoiceEmailTemplateName, InvoiceEmailTemplateRenderer> = {
  'invoice-issued': invoiceIssuedTemplate,
  'invoice-reminder': invoiceReminderTemplate
};

export function renderInvoiceEmailTemplate(
  templateName: InvoiceEmailTemplateName | undefined,
  context: InvoiceEmailTemplateContext
): RenderedInvoiceEmailTemplate {
  const normalizedTemplate =
    templateName ?? (defaultInvoiceEmailTemplate as InvoiceEmailTemplateName);

  const renderer = templateRegistry[normalizedTemplate];

  if (!renderer) {
    throw new AppError('Unsupported invoice email template', 400, {
      templateName
    });
  }

  return renderer(context);
}

export function getInvoiceEmailTemplateNames() {
  return [...invoiceEmailTemplateNames];
}
