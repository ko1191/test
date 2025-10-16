import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

const clientInclude = {
  invoices: {
    orderBy: { issueDate: 'desc' },
    include: {
      status: true,
      lineItems: {
        orderBy: { createdAt: 'asc' }
      }
    }
  }
} satisfies Prisma.ClientInclude;

export type ClientWithRelations = Prisma.ClientGetPayload<{
  include: typeof clientInclude;
}>;

export async function listClients(withRelations = false) {
  return prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: withRelations ? clientInclude : undefined
  });
}

export async function getClientById(id: number, withRelations = false) {
  return prisma.client.findUnique({
    where: { id },
    include: withRelations ? clientInclude : undefined
  });
}

export async function createClient(data: Prisma.ClientCreateInput) {
  return prisma.client.create({
    data,
    include: clientInclude
  });
}

export async function updateClient(id: number, data: Prisma.ClientUpdateInput) {
  return prisma.client.update({
    where: { id },
    data,
    include: clientInclude
  });
}

export async function deleteClient(id: number) {
  return prisma.client.delete({ where: { id } });
}
