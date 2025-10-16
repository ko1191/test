import request from 'supertest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma, type Client } from '@prisma/client';

vi.mock('../repositories', () => ({
  listClients: vi.fn(),
  getClientById: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn()
}));

import { createApp } from '../app';
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} from '../repositories';
import type { ClientWithRelations } from '../repositories/clientRepository';

const decimal = (value: number | string) => new Prisma.Decimal(value);

const baseClient: Client = {
  id: 1,
  name: 'Acme Corporation',
  email: 'billing@acme.test',
  phone: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z')
};

const clientWithRelations: ClientWithRelations = {
  ...baseClient,
  invoices: [
    {
      id: 10,
      invoiceNumber: 'INV-2024-001',
      clientId: baseClient.id,
      invoiceStatusId: 3,
      issueDate: new Date('2024-03-01T00:00:00.000Z'),
      dueDate: new Date('2024-03-15T00:00:00.000Z'),
      notes: 'Monthly retainer',
      subtotal: decimal('1200.00'),
      tax: decimal('96.00'),
      total: decimal('1296.00'),
      createdAt: new Date('2024-03-01T00:00:00.000Z'),
      updatedAt: new Date('2024-03-05T00:00:00.000Z'),
      status: {
        id: 5,
        code: 'PAID',
        label: 'Paid',
        sortOrder: 3,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z')
      },
      lineItems: [
        {
          id: 100,
          invoiceId: 10,
          description: 'Consulting hours',
          quantity: 24,
          unitPrice: decimal('50.00'),
          lineTotal: decimal('1200.00'),
          createdAt: new Date('2024-03-01T00:00:00.000Z'),
          updatedAt: new Date('2024-03-01T00:00:00.000Z')
        }
      ]
    }
  ]
};

describe('Client routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists clients without relations by default', async () => {
    vi.mocked(listClients).mockResolvedValue([baseClient]);

    const response = await request(createApp()).get('/clients');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: baseClient.id,
          name: baseClient.name,
          email: baseClient.email,
          phone: baseClient.phone,
          addressLine1: baseClient.addressLine1,
          addressLine2: baseClient.addressLine2,
          city: baseClient.city,
          state: baseClient.state,
          postalCode: baseClient.postalCode,
          createdAt: baseClient.createdAt.toISOString(),
          updatedAt: baseClient.updatedAt.toISOString()
        }
      ]
    });

    expect(vi.mocked(listClients)).toHaveBeenCalledWith(false);
  });

  it('lists clients with relations when requested', async () => {
    vi.mocked(listClients).mockResolvedValue([clientWithRelations]);

    const response = await request(createApp()).get('/clients?withRelations=true');

    expect(response.status).toBe(200);
    expect(response.body.data[0].invoices).toEqual([
      {
        id: 10,
        invoiceNumber: 'INV-2024-001',
        clientId: clientWithRelations.id,
        invoiceStatusId: 3,
        issueDate: '2024-03-01T00:00:00.000Z',
        dueDate: '2024-03-15T00:00:00.000Z',
        notes: 'Monthly retainer',
        subtotal: '1200.00',
        tax: '96.00',
        total: '1296.00',
        createdAt: '2024-03-01T00:00:00.000Z',
        updatedAt: '2024-03-05T00:00:00.000Z',
        status: {
          id: 5,
          code: 'PAID',
          label: 'Paid',
          sortOrder: 3,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        },
        lineItems: [
          {
            id: 100,
            invoiceId: 10,
            description: 'Consulting hours',
            quantity: 24,
            unitPrice: '50.00',
            lineTotal: '1200.00',
            createdAt: '2024-03-01T00:00:00.000Z',
            updatedAt: '2024-03-01T00:00:00.000Z'
          }
        ]
      }
    ]);

    expect(vi.mocked(listClients)).toHaveBeenCalledWith(true);
  });

  it('validates client id params', async () => {
    const response = await request(createApp()).get('/clients/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('returns 404 when a client is not found', async () => {
    vi.mocked(getClientById).mockResolvedValue(null);

    const response = await request(createApp()).get('/clients/123');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Client not found');
  });

  it('creates a client with validated payload', async () => {
    const payload = {
      name: 'Globex Corporation',
      email: 'accounts@globex.test'
    };

    vi.mocked(createClient).mockResolvedValue({
      ...clientWithRelations,
      id: 99,
      name: payload.name,
      email: payload.email,
      invoices: []
    });

    const response = await request(createApp()).post('/clients').send(payload);

    expect(response.status).toBe(201);
    expect(vi.mocked(createClient)).toHaveBeenCalledWith({
      name: payload.name,
      email: payload.email
    });
    expect(response.body.data).toMatchObject({
      id: 99,
      name: payload.name,
      email: payload.email
    });
    expect(response.body.data).not.toHaveProperty('invoices');
  });

  it('rejects invalid client payloads', async () => {
    const response = await request(createApp()).post('/clients').send({
      name: 'Example Corp',
      email: 'not-an-email'
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('updates a client record', async () => {
    vi.mocked(updateClient).mockResolvedValue({
      ...clientWithRelations,
      city: 'Metropolis'
    });

    const response = await request(createApp())
      .put('/clients/1')
      .send({ city: 'Metropolis' });

    expect(response.status).toBe(200);
    expect(vi.mocked(updateClient)).toHaveBeenCalledWith(1, {
      city: 'Metropolis'
    });
    expect(response.body.data.city).toBe('Metropolis');
  });

  it('requires at least one field for update', async () => {
    const response = await request(createApp()).put('/clients/1').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('maps Prisma record not found errors to 404 on update', async () => {
    vi.mocked(updateClient).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client
      })
    );

    const response = await request(createApp())
      .put('/clients/123')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Resource not found');
  });

  it('maps Prisma unique constraint errors to 409 on create', async () => {
    vi.mocked(createClient).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: Prisma.prismaVersion.client,
        meta: { target: ['email'] }
      })
    );

    const response = await request(createApp()).post('/clients').send({
      name: 'Duplicate Corp',
      email: 'billing@acme.test'
    });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe(
      'A record with the provided unique fields already exists.'
    );
    expect(response.body.error.details).toEqual({ target: ['email'] });
  });

  it('deletes a client', async () => {
    vi.mocked(deleteClient).mockResolvedValue();

    const response = await request(createApp()).delete('/clients/1');

    expect(response.status).toBe(204);
    expect(vi.mocked(deleteClient)).toHaveBeenCalledWith(1);
    expect(response.body).toEqual({});
  });

  it('maps record not found errors to 404 on delete', async () => {
    vi.mocked(deleteClient).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client
      })
    );

    const response = await request(createApp()).delete('/clients/999');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Resource not found');
  });
});
