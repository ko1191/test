import { z } from 'zod';

const isoDateTimeString = z.string().datetime();
const trimmedString = z.string().trim();
const nonEmptyString = trimmedString.min(1, 'Value cannot be empty');

const decimalValueSchema = z.union([
  z.number(),
  trimmedString.regex(/^-?\d+(\.\d+)?$/, 'Invalid decimal value')
]);

const quantitySchema = z.coerce
  .number()
  .int()
  .positive('Quantity must be greater than zero');

export const invoiceLineItemInputSchema = z
  .object({
    description: nonEmptyString,
    quantity: quantitySchema,
    unitPrice: decimalValueSchema
  })
  .strict();

export const invoiceCreateSchema = z
  .object({
    invoiceNumber: nonEmptyString,
    clientId: z.coerce.number().int().positive(),
    statusCode: trimmedString.min(1).optional(),
    issueDate: isoDateTimeString,
    dueDate: isoDateTimeString,
    notes: trimmedString.max(2000).nullable().optional(),
    lineItems: z
      .array(invoiceLineItemInputSchema)
      .min(1, 'At least one line item is required'),
    taxRate: decimalValueSchema.optional()
  })
  .strict();

export const invoiceUpdateSchema = z
  .object({
    invoiceNumber: nonEmptyString.optional(),
    clientId: z.coerce.number().int().positive().optional(),
    statusCode: trimmedString.min(1).optional(),
    issueDate: isoDateTimeString.optional(),
    dueDate: isoDateTimeString.optional(),
    notes: trimmedString.max(2000).nullable().optional(),
    lineItems: z
      .array(invoiceLineItemInputSchema)
      .min(1, 'At least one line item is required')
      .optional(),
    taxRate: decimalValueSchema.optional()
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'At least one field must be provided for update' }
  );

export const invoiceIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive()
  })
  .strict();

export const invoiceListQuerySchema = z
  .object({
    status: trimmedString.optional(),
    clientId: z.coerce.number().int().positive().optional()
  })
  .strict();

export const invoiceStatusResponseSchema = z
  .object({
    id: z.number().int().positive(),
    code: z.string(),
    label: z.string(),
    sortOrder: z.number().int(),
    createdAt: isoDateTimeString,
    updatedAt: isoDateTimeString
  })
  .strict();

export const invoiceLineItemResponseSchema = z
  .object({
    id: z.number().int().positive(),
    invoiceId: z.number().int().positive(),
    description: z.string(),
    quantity: z.number().int().nonnegative(),
    unitPrice: z.string(),
    lineTotal: z.string(),
    createdAt: isoDateTimeString,
    updatedAt: isoDateTimeString
  })
  .strict();

export const invoiceResponseSchema = z
  .object({
    id: z.number().int().positive(),
    invoiceNumber: z.string(),
    clientId: z.number().int().positive(),
    invoiceStatusId: z.number().int().positive(),
    issueDate: isoDateTimeString,
    dueDate: isoDateTimeString,
    notes: z.string().nullable(),
    subtotal: z.string(),
    tax: z.string(),
    total: z.string(),
    createdAt: isoDateTimeString,
    updatedAt: isoDateTimeString,
    status: invoiceStatusResponseSchema,
    lineItems: z.array(invoiceLineItemResponseSchema)
  })
  .strict();

const invoiceClientSummarySchema = z
  .object({
    id: z.number().int().positive(),
    name: nonEmptyString,
    email: trimmedString.email('Invalid email address')
  })
  .strict();

export const invoiceDetailResponseSchema = invoiceResponseSchema.extend({
  client: invoiceClientSummarySchema
});

export const invoiceListResponseSchema = z.array(invoiceDetailResponseSchema);

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
export type InvoiceDetailResponse = z.infer<typeof invoiceDetailResponseSchema>;
