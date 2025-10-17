import { Prisma } from '@prisma/client';
import type { InvoiceWithRelations } from '../repositories/invoiceRepository';

const decimal = (value: number | string) => new Prisma.Decimal(value);

export function createInvoiceFixture(): InvoiceWithRelations {
  return {
    id: 1,
    invoiceNumber: 'INV-2024-100',
    clientId: 42,
    invoiceStatusId: 2,
    issueDate: new Date('2024-04-01T00:00:00.000Z'),
    dueDate: new Date('2024-04-30T00:00:00.000Z'),
    notes: 'Consulting retainer and support',
    subtotal: decimal('1000.00'),
    tax: decimal('80.00'),
    total: decimal('1080.00'),
    createdAt: new Date('2024-04-01T00:00:00.000Z'),
    updatedAt: new Date('2024-04-02T00:00:00.000Z'),
    client: {
      id: 42,
      name: 'Acme Corporation',
      email: 'billing@acme.test',
      phone: null,
      addressLine1: '123 Market Street',
      addressLine2: null,
      city: 'Metropolis',
      state: 'CA',
      postalCode: '90001',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z')
    },
    status: {
      id: 2,
      code: 'SENT',
      label: 'Sent',
      sortOrder: 2,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z')
    },
    lineItems: [
      {
        id: 101,
        invoiceId: 1,
        description: 'Consulting hours',
        quantity: 10,
        unitPrice: decimal('100.00'),
        lineTotal: decimal('1000.00'),
        createdAt: new Date('2024-04-01T00:00:00.000Z'),
        updatedAt: new Date('2024-04-01T00:00:00.000Z')
      }
    ]
  };
}
