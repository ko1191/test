import type { Transporter } from 'nodemailer';
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';

vi.mock('nodemailer', () => ({
  createTransport: vi.fn()
}));

vi.mock('./invoiceDocumentService', () => ({
  generateInvoicePdf: vi.fn(),
  getInvoicePdfDownloadName: vi.fn()
}));

vi.mock('../repositories/invoiceEmailLogRepository', () => ({
  createInvoiceEmailLog: vi.fn()
}));

import nodemailer from 'nodemailer';
import { sendInvoiceEmail } from './invoiceEmailService';
import {
  generateInvoicePdf,
  getInvoicePdfDownloadName
} from './invoiceDocumentService';
import { createInvoiceFixture } from '../__fixtures__/invoiceFixture';
import { createInvoiceEmailLogFixture } from '../__fixtures__/invoiceEmailLogFixture';
import { createInvoiceEmailLog } from '../repositories/invoiceEmailLogRepository';

const envKeys = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'SMTP_SECURE'
] as const;

type EnvKey = (typeof envKeys)[number];

const originalEnv: Partial<Record<EnvKey, string | undefined>> = {};

const restoreEnv = () => {
  envKeys.forEach((key) => {
    const value = originalEnv[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
};

beforeAll(() => {
  envKeys.forEach((key) => {
    originalEnv[key] = process.env[key];
  });
});

beforeEach(() => {
  vi.clearAllMocks();

  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'smtp-user';
  process.env.SMTP_PASSWORD = 'smtp-password';
  process.env.SMTP_FROM = 'billing@example.com';
  delete process.env.SMTP_SECURE;
});

afterEach(() => {
  restoreEnv();
});

describe('sendInvoiceEmail', () => {
  it('sends an invoice email with a pdf attachment and logs the attempt', async () => {
    const invoice = createInvoiceFixture();
    const pdfBuffer = Buffer.from('%PDF-1.4');
    const attachmentName = 'invoice.pdf';
    const log = createInvoiceEmailLogFixture({
      invoiceId: invoice.id,
      recipientEmail: 'custom@example.com',
      templateName: 'invoice-issued'
    });

    vi.mocked(generateInvoicePdf).mockResolvedValue(pdfBuffer);
    vi.mocked(getInvoicePdfDownloadName).mockReturnValue(attachmentName);

    const sendMailMock = vi.fn().mockResolvedValue({ messageId: '<sent@example.com>' });

    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: sendMailMock
    } as unknown as Transporter);

    vi.mocked(createInvoiceEmailLog).mockResolvedValue(log);

    const result = await sendInvoiceEmail(invoice, {
      template: 'invoice-issued',
      recipientEmail: 'custom@example.com',
      message: 'Thank you for your business.'
    });

    expect(result).toEqual({ log });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-password'
      }
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'billing@example.com',
      to: 'custom@example.com',
      subject: expect.stringContaining(`Invoice ${invoice.invoiceNumber}`),
      text: expect.stringContaining('Thank you for your business.'),
      attachments: [
        {
          filename: attachmentName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
    expect(createInvoiceEmailLog).toHaveBeenCalledWith({
      invoiceId: invoice.id,
      recipientEmail: 'custom@example.com',
      templateName: 'invoice-issued',
      subject: expect.stringContaining(`Invoice ${invoice.invoiceNumber}`),
      success: true,
      messageId: '<sent@example.com>'
    });
  });

  it('records failures and throws an AppError when the email cannot be sent', async () => {
    const invoice = createInvoiceFixture();
    const pdfBuffer = Buffer.from('%PDF-FAIL');

    vi.mocked(generateInvoicePdf).mockResolvedValue(pdfBuffer);
    vi.mocked(getInvoicePdfDownloadName).mockReturnValue('invoice.pdf');

    const sendMailMock = vi.fn().mockRejectedValue(new Error('SMTP connection failed'));

    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: sendMailMock
    } as unknown as Transporter);

    vi.mocked(createInvoiceEmailLog).mockResolvedValue(
      createInvoiceEmailLogFixture({ success: false, errorMessage: 'SMTP connection failed' })
    );

    await expect(
      sendInvoiceEmail(invoice, { template: 'invoice-issued' })
    ).rejects.toMatchObject({
      statusCode: 502,
      message: 'Failed to send invoice email',
      details: { reason: 'SMTP connection failed' }
    });

    expect(sendMailMock).toHaveBeenCalled();
    expect(createInvoiceEmailLog).toHaveBeenCalledWith({
      invoiceId: invoice.id,
      recipientEmail: invoice.client.email,
      templateName: 'invoice-issued',
      subject: expect.stringContaining(`Invoice ${invoice.invoiceNumber}`),
      success: false,
      errorMessage: 'SMTP connection failed'
    });
  });

  it('throws when an invoice client is missing an email address', async () => {
    const invoice = createInvoiceFixture();
    invoice.client = { ...invoice.client, email: '   ' };

    await expect(
      sendInvoiceEmail(invoice, { template: 'invoice-issued' })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(generateInvoicePdf).not.toHaveBeenCalled();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(createInvoiceEmailLog).not.toHaveBeenCalled();
  });
});
