import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const decimal = (value: string | number) => new Prisma.Decimal(value);

async function main() {
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.invoiceStatus.deleteMany();

  await prisma.invoiceStatus.createMany({
    data: [
      { code: 'DRAFT', label: 'Draft', sortOrder: 1 },
      { code: 'SENT', label: 'Sent', sortOrder: 2 },
      { code: 'PAID', label: 'Paid', sortOrder: 3 },
      { code: 'OVERDUE', label: 'Overdue', sortOrder: 4 }
    ]
  });

  await prisma.client.create({
    data: {
      name: 'Acme Corporation',
      email: 'billing@acme.test',
      phone: '+1 (555) 000-1234',
      addressLine1: '100 Market Street',
      city: 'Metropolis',
      state: 'CA',
      postalCode: '91001',
      invoices: {
        create: [
          {
            invoiceNumber: 'INV-2024-001',
            issueDate: new Date('2024-01-05'),
            dueDate: new Date('2024-02-04'),
            subtotal: decimal('2500'),
            tax: decimal('187.50'),
            total: decimal('2687.50'),
            status: { connect: { code: 'SENT' } },
            notes: 'Website redesign project milestone 1',
            lineItems: {
              create: [
                {
                  description: 'UI/UX Design',
                  quantity: 40,
                  unitPrice: decimal('50'),
                  lineTotal: decimal('2000')
                },
                {
                  description: 'Project management',
                  quantity: 20,
                  unitPrice: decimal('25'),
                  lineTotal: decimal('500')
                }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.client.create({
    data: {
      name: 'Globex Labs',
      email: 'accounts@globex.test',
      phone: '+1 (555) 111-9876',
      addressLine1: '55 Innovation Drive',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62704',
      invoices: {
        create: [
          {
            invoiceNumber: 'INV-2024-002',
            issueDate: new Date('2024-02-15'),
            dueDate: new Date('2024-03-16'),
            subtotal: decimal('1200'),
            tax: decimal('96'),
            total: decimal('1296'),
            status: { connect: { code: 'PAID' } },
            notes: 'Monthly SaaS subscription and onboarding',
            lineItems: {
              create: [
                {
                  description: 'SaaS platform subscription',
                  quantity: 1,
                  unitPrice: decimal('999'),
                  lineTotal: decimal('999')
                },
                {
                  description: 'Onboarding and training',
                  quantity: 1,
                  unitPrice: decimal('201'),
                  lineTotal: decimal('201')
                }
              ]
            }
          },
          {
            invoiceNumber: 'INV-2024-003',
            issueDate: new Date('2024-03-01'),
            dueDate: new Date('2024-03-31'),
            subtotal: decimal('800'),
            tax: decimal('64'),
            total: decimal('864'),
            status: { connect: { code: 'DRAFT' } },
            notes: 'Upcoming feature development sprint',
            lineItems: {
              create: [
                {
                  description: 'Backend API development',
                  quantity: 16,
                  unitPrice: decimal('35'),
                  lineTotal: decimal('560')
                },
                {
                  description: 'Frontend integration',
                  quantity: 8,
                  unitPrice: decimal('30'),
                  lineTotal: decimal('240')
                }
              ]
            }
          }
        ]
      }
    }
  });
}

main()
  .catch((error) => {
    console.error('Seeding error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
