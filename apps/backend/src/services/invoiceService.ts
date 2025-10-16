import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  type InvoiceCreateInput,
  type InvoiceUpdateInput
} from '../schemas/invoiceSchemas';
import {
  createInvoice,
  getInvoiceById,
  type InvoiceWithRelations,
  updateInvoice
} from '../repositories/invoiceRepository';
import { getInvoiceStatusByCode } from '../repositories/invoiceStatusRepository';

const DEFAULT_STATUS_CODE = 'DRAFT';

const allowedStatusTransitions: Record<string, string[]> = {
  DRAFT: ['DRAFT', 'SENT'],
  SENT: ['SENT', 'PAID', 'OVERDUE'],
  OVERDUE: ['OVERDUE', 'PAID'],
  PAID: ['PAID']
};

type DecimalValue = string | number | Prisma.Decimal;

export type InvoiceLineItemCalculationInput = {
  description: string;
  quantity: number;
  unitPrice: DecimalValue;
};

type CalculatedLineItem = {
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type CalculationResult = {
  lineItems: CalculatedLineItem[];
  subtotal: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
};

const normalizeStatusCode = (code: string) => code.trim().toUpperCase();

const toDecimal = (value: DecimalValue) => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number') {
    return new Prisma.Decimal(value);
  }

  return new Prisma.Decimal(value.trim());
};

const roundCurrency = (value: Prisma.Decimal) =>
  new Prisma.Decimal(value.toFixed(2));

const normalizeLineItems = (
  lineItems: InvoiceLineItemCalculationInput[]
): CalculatedLineItem[] => {
  if (!lineItems.length) {
    throw new AppError('At least one line item is required', 400);
  }

  return lineItems.map((item) => {
    const unitPrice = roundCurrency(toDecimal(item.unitPrice));

    if (unitPrice.isNegative()) {
      throw new AppError('Unit price cannot be negative', 400, {
        description: item.description
      });
    }

    if (item.quantity <= 0) {
      throw new AppError('Quantity must be greater than zero', 400, {
        description: item.description
      });
    }

    const lineTotal = roundCurrency(unitPrice.times(item.quantity));

    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice,
      lineTotal
    };
  });
};

const resolveStatusOrThrow = async (statusCode: string) => {
  const status = await getInvoiceStatusByCode(statusCode);

  if (!status) {
    throw new AppError('Invoice status not found', 400, {
      statusCode
    });
  }

  return status;
};

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItemCalculationInput[],
  taxRateInput?: DecimalValue
): CalculationResult {
  const normalizedLineItems = normalizeLineItems(lineItems);
  const subtotal = normalizedLineItems.reduce(
    (sum, item) => sum.plus(item.lineTotal),
    new Prisma.Decimal(0)
  );
  const roundedSubtotal = roundCurrency(subtotal);

  const taxRate =
    taxRateInput !== undefined ? toDecimal(taxRateInput) : new Prisma.Decimal(0);

  if (taxRate.isNegative()) {
    throw new AppError('Tax rate cannot be negative', 400);
  }

  const tax = roundCurrency(roundedSubtotal.times(taxRate));
  const total = roundCurrency(roundedSubtotal.plus(tax));

  return {
    lineItems: normalizedLineItems,
    subtotal: roundedSubtotal,
    tax,
    total
  };
}

export function assertValidStatusTransition(
  currentStatusCode: string | null,
  nextStatusCode: string
) {
  if (!currentStatusCode) {
    return;
  }

  if (currentStatusCode === nextStatusCode) {
    return;
  }

  const transitions = allowedStatusTransitions[currentStatusCode] ?? [];

  if (!transitions.includes(nextStatusCode)) {
    throw new AppError('Invalid invoice status transition', 400, {
      from: currentStatusCode,
      to: nextStatusCode
    });
  }
}

export async function createInvoiceWithCalculations(
  input: InvoiceCreateInput
): Promise<InvoiceWithRelations> {
  const statusCode = normalizeStatusCode(input.statusCode ?? DEFAULT_STATUS_CODE);
  const status = await resolveStatusOrThrow(statusCode);

  const calculation = calculateInvoiceTotals(input.lineItems, input.taxRate);

  return createInvoice({
    invoiceNumber: input.invoiceNumber,
    issueDate: new Date(input.issueDate),
    dueDate: new Date(input.dueDate),
    notes: input.notes ?? null,
    subtotal: calculation.subtotal,
    tax: calculation.tax,
    total: calculation.total,
    client: { connect: { id: input.clientId } },
    status: { connect: { code: status.code } },
    lineItems: {
      create: calculation.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      }))
    }
  });
}

export async function updateInvoiceWithCalculations(
  id: number,
  input: InvoiceUpdateInput
): Promise<InvoiceWithRelations> {
  const existing = await getInvoiceById(id);

  if (!existing) {
    throw new AppError('Invoice not found', 404);
  }

  const currentStatusCode = normalizeStatusCode(existing.status.code);
  const requestedStatusCode = normalizeStatusCode(
    input.statusCode ?? existing.status.code
  );

  assertValidStatusTransition(currentStatusCode, requestedStatusCode);

  let statusConnect:
    | {
        connect: {
          code: string;
        };
      }
    | undefined;

  if (requestedStatusCode !== currentStatusCode) {
    const nextStatus = await resolveStatusOrThrow(requestedStatusCode);
    statusConnect = { connect: { code: nextStatus.code } };
  }

  const shouldRecalculate =
    input.lineItems !== undefined || input.taxRate !== undefined;

  let calculation: CalculationResult | undefined;

  if (shouldRecalculate) {
    const lineItems =
      input.lineItems ??
      existing.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

    const subtotalDecimal = new Prisma.Decimal(existing.subtotal.toString());
    const taxDecimal = new Prisma.Decimal(existing.tax.toString());

    const existingTaxRate =
      subtotalDecimal.eq(0) ? new Prisma.Decimal(0) : taxDecimal.dividedBy(subtotalDecimal);

    const taxRateForCalculation =
      input.taxRate !== undefined ? input.taxRate : existingTaxRate;

    calculation = calculateInvoiceTotals(lineItems, taxRateForCalculation);
  }

  const data: Prisma.InvoiceUpdateInput = {};

  if (input.invoiceNumber !== undefined) {
    data.invoiceNumber = input.invoiceNumber;
  }

  if (input.issueDate !== undefined) {
    data.issueDate = new Date(input.issueDate);
  }

  if (input.dueDate !== undefined) {
    data.dueDate = new Date(input.dueDate);
  }

  if (input.notes !== undefined) {
    data.notes = input.notes ?? null;
  }

  if (typeof input.clientId === 'number') {
    data.client = { connect: { id: input.clientId } };
  }

  if (statusConnect) {
    data.status = statusConnect;
  } else if (input.statusCode !== undefined && requestedStatusCode === currentStatusCode) {
    // status explicitly provided but unchanged — ensure it exists
    await resolveStatusOrThrow(requestedStatusCode);
  }

  if (calculation) {
    data.subtotal = calculation.subtotal;
    data.tax = calculation.tax;
    data.total = calculation.total;

    if (input.lineItems !== undefined) {
      data.lineItems = {
        deleteMany: {},
        create: calculation.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        }))
      };
    }
  }

  return updateInvoice(id, data);
}
