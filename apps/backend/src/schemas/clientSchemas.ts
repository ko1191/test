import { z } from 'zod';

const isoDateTimeString = z.string().datetime();
const trimmedString = z.string().trim();
const nonEmptyString = trimmedString.min(1, 'Value cannot be empty');
const optionalNullableString = nonEmptyString.nullable().optional();

const invoiceStatusResponseSchema = z
  .object({
    id: z.number().int().positive(),
    code: z.string(),
    label: z.string(),
    sortOrder: z.number().int(),
    createdAt: isoDateTimeString,
    updatedAt: isoDateTimeString
  })
  .strict();

const invoiceLineItemResponseSchema = z
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

const invoiceResponseSchema = z
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

const clientBaseSchema = z
  .object({
    name: nonEmptyString,
    email: trimmedString.email('Invalid email address'),
    phone: optionalNullableString,
    addressLine1: optionalNullableString,
    addressLine2: optionalNullableString,
    city: optionalNullableString,
    state: optionalNullableString,
    postalCode: optionalNullableString
  })
  .strict();

export const clientCreateSchema = clientBaseSchema;

export const clientUpdateSchema = clientBaseSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: 'At least one field must be provided for update'
    }
  );

export const clientIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive()
  })
  .strict();

export const clientListQuerySchema = z.object({
  withRelations: z.coerce.boolean().optional()
});

export const clientResponseSchema = z
  .object({
    id: z.number().int().positive(),
    name: nonEmptyString,
    email: trimmedString.email('Invalid email address'),
    phone: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
    createdAt: isoDateTimeString,
    updatedAt: isoDateTimeString,
    invoices: z.array(invoiceResponseSchema).optional()
  })
  .strict();

export const clientListResponseSchema = z.array(clientResponseSchema);

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type ClientResponse = z.infer<typeof clientResponseSchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
