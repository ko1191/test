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
```

- `PORT`: TCP port for the API server.
- `NODE_ENV`: Runtime environment descriptor (`development`, `production`, etc.).

### Frontend (`apps/frontend`)

Create an `.env` file based on `.env.example`:

```
VITE_API_BASE_URL=http://localhost:3000
```

- `VITE_API_BASE_URL`: Base URL the frontend will use when communicating with the API.

## Backend Overview

The Express server boots from `apps/backend/src/index.ts` and exposes a `GET /health` endpoint for readiness checks. Responses use JSON and the server is configured to parse JSON payloads by default.

Build the production bundle with:

```bash
npm run build --workspace apps/backend
```

The compiled output is written to `apps/backend/dist/`.

## Frontend Overview

The React application is scaffolded with Vite and implements a placeholder router. The initial route renders a dashboard placeholder and displays the configured API base URL. Additional routes can be added within `apps/frontend/src/pages/`.

Start the frontend development server with:

```bash
npm run dev:frontend
```

The app is available at http://localhost:5173 by default.
