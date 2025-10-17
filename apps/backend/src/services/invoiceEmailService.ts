import nodemailer from 'nodemailer';
import { AppError } from '../errors/AppError';
import { getSmtpConfig } from '../config/smtpConfig';
import type { InvoiceWithRelations } from '../repositories/invoiceRepository';
import {
  createInvoiceEmailLog,
  type InvoiceEmailLogRecord
} from '../repositories/invoiceEmailLogRepository';
import {
  generateInvoicePdf,
  getInvoicePdfDownloadName
} from './invoiceDocumentService';
import {
  renderInvoiceEmailTemplate,
  type InvoiceEmailTemplateContext
} from './invoiceEmailTemplates';
import type { InvoiceEmailTemplateName } from '../constants/invoiceEmailTemplates';

export type SendInvoiceEmailOptions = {
  template: InvoiceEmailTemplateName;
  recipientEmail?: string;
  message?: string;
};

export type SendInvoiceEmailResult = {
  log: InvoiceEmailLogRecord;
};

const extractMessageId = (info: unknown): string | null => {
  if (info && typeof info === 'object' && 'messageId' in info) {
    const value = (info as { messageId?: string }).messageId;

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

const normalizeRecipient = (
  invoice: InvoiceWithRelations,
  explicitRecipient?: string
) => {
  if (explicitRecipient && explicitRecipient.trim().length > 0) {
    return explicitRecipient.trim();
  }

  if (invoice.client.email && invoice.client.email.trim().length > 0) {
    return invoice.client.email.trim();
  }

  throw new AppError('Invoice client is missing an email address', 400, {
    invoiceId: invoice.id
  });
};

export async function sendInvoiceEmail(
  invoice: InvoiceWithRelations,
  options: SendInvoiceEmailOptions
): Promise<SendInvoiceEmailResult> {
  const smtpConfig = getSmtpConfig();
  const recipientEmail = normalizeRecipient(invoice, options.recipientEmail);

  const templateContext: InvoiceEmailTemplateContext = {
    invoice,
    message: options.message
  };

  const rendered = renderInvoiceEmailTemplate(options.template, templateContext);

  const pdfBuffer = await generateInvoicePdf(invoice);
  const attachmentName = getInvoicePdfDownloadName(invoice);

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth
  });

  try {
    const result = await transporter.sendMail({
      from: smtpConfig.from,
      to: recipientEmail,
      subject: rendered.subject,
      text: rendered.text,
      attachments: [
        {
          filename: attachmentName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    const log = await createInvoiceEmailLog({
      invoiceId: invoice.id,
      recipientEmail,
      templateName: options.template,
      subject: rendered.subject,
      success: true,
      messageId: extractMessageId(result)
    });

    return { log };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await createInvoiceEmailLog({
      invoiceId: invoice.id,
      recipientEmail,
      templateName: options.template,
      subject: rendered.subject,
      success: false,
      errorMessage: message
    });

    throw new AppError('Failed to send invoice email', 502, {
      reason: message
    });
  }
}
