import { z } from 'zod';
import { invoiceResponseSchema } from './invoiceSchemas';

const isoDateTimeString = z.string().datetime();
const trimmedString = z.string().trim();
const nonEmptyString = trimmedString.min(1, 'Value cannot be empty');
const optionalNullableString = nonEmptyString.nullable().optional();

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
