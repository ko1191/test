import { Router } from 'express';
import {
  clientCreateSchema,
  clientIdParamSchema,
  clientListQuerySchema,
  clientListResponseSchema,
  clientResponseSchema,
  clientUpdateSchema
} from '../schemas/clientSchemas';
import {
  createClient,
  deleteClient,
  getClientById,
  listClients,
  updateClient
} from '../repositories';
import { AppError } from '../errors/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeClient } from '../serializers/clientSerializer';

export const clientRouter = Router();

clientRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { withRelations } = clientListQuerySchema.parse(req.query);
    const includeRelations = withRelations ?? false;

    const clients = await listClients(includeRelations);
    const payload = clients.map((client) =>
      serializeClient(client, includeRelations)
    );

    res.json({ data: clientListResponseSchema.parse(payload) });
  })
);

clientRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = clientIdParamSchema.parse(req.params);
    const { withRelations } = clientListQuerySchema.parse(req.query);
    const includeRelations = withRelations ?? false;

    const client = await getClientById(id, includeRelations);

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    const payload = serializeClient(client, includeRelations);

    res.json({ data: clientResponseSchema.parse(payload) });
  })
);

clientRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = clientCreateSchema.parse(req.body);
    const { withRelations } = clientListQuerySchema.parse(req.query);
    const includeRelations = withRelations ?? false;

    const client = await createClient(data);
    const payload = serializeClient(client, includeRelations);

    res.status(201).json({ data: clientResponseSchema.parse(payload) });
  })
);

clientRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = clientIdParamSchema.parse(req.params);
    const data = clientUpdateSchema.parse(req.body);
    const { withRelations } = clientListQuerySchema.parse(req.query);
    const includeRelations = withRelations ?? false;

    const client = await updateClient(id, data);
    const payload = serializeClient(client, includeRelations);

    res.json({ data: clientResponseSchema.parse(payload) });
  })
);

clientRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = clientIdParamSchema.parse(req.params);

    await deleteClient(id);

    res.status(204).send();
  })
);
