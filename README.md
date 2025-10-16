# Invoicing System Monorepo

This repository contains the beginnings of an invoicing system implemented as a TypeScript full-stack application. It uses npm workspaces to manage independent backend and frontend applications.

## Project Structure

```
.
├── apps
│   ├── backend      # Express API server
│   └── frontend     # React + Vite single-page application
├── package.json     # Workspace configuration
├── tsconfig.base.json
└── README.md
```

## Prerequisites

- Node.js 18.x or newer
- npm 9.x or newer (npm v7+ workspaces support)

Install dependencies for all workspaces with a single command:

```bash
npm install
```

## Available Scripts

Run scripts from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev:backend` | Start the Express API in watch mode via `tsx`. |
| `npm run dev:frontend` | Start the Vite development server for the React app. |
| `npm run build` | Build every workspace. |
| `npm run lint` | Lint source files in every workspace. |
| `npm run format` | Run Prettier checks in every workspace. |

You can also execute scripts directly within each workspace by specifying the `--workspace` flag, for example `npm run build --workspace apps/backend`.

## Environment Variables

Environment variables are managed with `.env` files and loaded via [`dotenv`](https://github.com/motdotla/dotenv) on the backend. Copy the provided examples and tailor them to your environment.

### Backend (`apps/backend`)

Create an `.env` file based on `.env.example`:

```
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
```

- `PORT`: TCP port for the API server.
- `NODE_ENV`: Runtime environment descriptor (`development`, `production`, etc.).
- `DATABASE_URL`: Connection string for the local SQLite database managed by Prisma.

### Frontend (`apps/frontend`)

Create an `.env` file based on `.env.example`:

```
VITE_API_BASE_URL=http://localhost:3000
```

- `VITE_API_BASE_URL`: Base URL the frontend will use when communicating with the API.

## Backend Overview

The Express server boots from `apps/backend/src/index.ts` and exposes a `GET /health` endpoint for readiness checks. Responses use JSON and the server is configured to parse JSON payloads by default.

### Client API

CRUD endpoints for managing clients are available under `/clients`. All requests and responses are validated with [Zod](https://zod.dev), and errors are normalized by a shared middleware layer.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/clients` | List clients (set `withRelations=true` to include invoices). |
| `GET` | `/clients/:id` | Fetch a single client by id. Optional `withRelations` query flag. |
| `POST` | `/clients` | Create a client. Accepts `name`, `email`, and optional contact details. |
| `PUT` | `/clients/:id` | Update a client. Requires at least one field in the request body. |
| `DELETE` | `/clients/:id` | Remove a client record. |

Successful responses are wrapped in a `{ "data": ... }` envelope. Validation failures return a `400` status with a structured payload similar to:

```json
{
  "error": {
    "message": "Validation failed",
    "issues": [
      { "path": ["email"], "message": "Invalid email address" }
    ]
  }
}
```

Prisma `P2002` (unique constraint) and `P2025` (record not found) errors are mapped to HTTP `409` and `404` status codes respectively.

### Invoice API

Invoice management endpoints live under `/invoices`. Line items, subtotals, tax, and totals are recalculated on every create or update request. Provide an optional `taxRate` as a decimal fraction (for example `0.08` for 8%) and an optional `statusCode` to move an invoice out of the default `DRAFT` state. All numeric amounts are returned as strings to preserve precision.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/invoices` | List invoices. Supports optional `status` and `clientId` query filters. |
| `GET` | `/invoices/:id` | Retrieve a single invoice including client, status, and line items. |
| `POST` | `/invoices` | Create an invoice. Requires at least one line item. Totals are calculated automatically. |
| `PUT` | `/invoices/:id` | Update invoice details, line items, or status. At least one field is required. |

Sample payload for creating an invoice:

```json
{
  "invoiceNumber": "INV-2024-110",
  "clientId": 7,
  "issueDate": "2024-05-01T00:00:00.000Z",
  "dueDate": "2024-05-31T00:00:00.000Z",
  "statusCode": "SENT",
  "taxRate": "0.08",
  "lineItems": [
    { "description": "Implementation sprint", "quantity": 40, "unitPrice": "95" },
    { "description": "Project management", "quantity": 10, "unitPrice": "60" }
  ],
  "notes": "Second milestone"
}
```

A successful response wraps the computed totals and nested relations:

```json
{
  "data": {
    "id": 12,
    "invoiceNumber": "INV-2024-110",
    "subtotal": "4700.00",
    "tax": "376.00",
    "total": "5076.00",
    "status": { "code": "SENT", "label": "Sent" },
    "lineItems": [
      { "description": "Implementation sprint", "quantity": 40, "unitPrice": "95.00", "lineTotal": "3800.00" },
      { "description": "Project management", "quantity": 10, "unitPrice": "60.00", "lineTotal": "600.00" }
    ],
    "client": { "id": 7, "name": "Globex Labs", "email": "accounts@globex.test" }
  }
}
```

Status transitions are validated. The following movements are supported:

- `DRAFT → SENT`
- `SENT → PAID`
- `SENT → OVERDUE`
- `OVERDUE → PAID`

Attempting to transition outside of these paths returns a `400` response with a descriptive error payload.

Build the production bundle with:

```bash
npm run build --workspace apps/backend
```

The compiled output is written to `apps/backend/dist/`.

## Database & Prisma

The backend uses [Prisma](https://www.prisma.io/) with a SQLite database stored in `apps/backend/prisma/dev.db` for local development. Ensure your backend `.env` file contains the `DATABASE_URL` value shown above before running these commands.

### Apply migrations

```bash
npm run prisma:migrate --workspace apps/backend
```

This command applies the checked-in migrations and creates the SQLite database if it does not already exist.

### Seed development data

```bash
npm run prisma:seed --workspace apps/backend
```

Seeding populates lookup data such as invoice statuses along with sample clients, invoices, and line items for local testing.

### Inspect data with Prisma Studio

```bash
npm run prisma:studio --workspace apps/backend
```

Prisma Studio provides a browser UI for viewing and editing development data.

## Frontend Overview

The React application is scaffolded with Vite and implements a placeholder router. The initial route renders a dashboard placeholder and displays the configured API base URL. Additional routes can be added within `apps/frontend/src/pages/`.

Start the frontend development server with:

```bash
npm run dev:frontend
```

The app is available at http://localhost:5173 by default.
