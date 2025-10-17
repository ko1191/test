import { z } from 'zod';
import {
  defaultInvoiceEmailTemplate,
  invoiceEmailTemplateNames
} from '../constants/invoiceEmailTemplates';

const trimmedString = z.string().trim();
const isoDateTimeString = z.string().datetime();

export const invoiceEmailSendSchema = z
  .object({
    template: z.enum(invoiceEmailTemplateNames).default(defaultInvoiceEmailTemplate),
    recipientEmail: trimmedString.email('Invalid email address').optional(),
    message: trimmedString.max(2000).optional()
  })
  .strict();

export const invoiceEmailLogResponseSchema = z
  .object({
    id: z.number().int().positive(),
    invoiceId: z.number().int().positive(),
    recipientEmail: trimmedString.email('Invalid email address'),
    templateName: z.enum(invoiceEmailTemplateNames),
    subject: trimmedString.min(1),
    messageId: trimmedString.min(1).nullable(),
    success: z.boolean(),
    errorMessage: trimmedString.min(1).nullable(),
    createdAt: isoDateTimeString
  })
  .strict();

export type InvoiceEmailSendInput = z.infer<typeof invoiceEmailSendSchema>;
export type InvoiceEmailLogResponse = z.infer<
  typeof invoiceEmailLogResponseSchema
>;
