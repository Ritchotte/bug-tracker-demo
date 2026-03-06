# Bug Tracker Demo API

[![CI](https://github.com/Ritchotte/bug-tracker-demo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Ritchotte/bug-tracker-demo/actions/workflows/ci.yml)

Feature-rich bug tracker backend for portfolio/demo use, built with Express and TypeScript.
Includes a lightweight frontend dashboard served by the same app.

Live Demo: add your deployed URL here after first deploy.

## Highlights

- CRUD-style bug management with status transitions
- Advanced list endpoint: filtering, search, sorting, pagination
- Assignment, labels, due dates, and comments
- Timeline/events per bug
- Analytics endpoints (status/severity summary, assignee leaderboard)
- Demo seeding endpoint for instant showcase data
- Automated API tests with Vitest + Supertest

## Quick Start

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`.
Dashboard at `http://localhost:3000/dashboard`.
Interactive API docs at `http://localhost:3000/docs`.

## Scripts

- `npm run dev` - start with hot reload
- `npm run typecheck` - run TypeScript checks
- `npm run build` - compile to `dist/`
- `npm run start` - run compiled build
- `npm test` - run API test suite
- `npm run test:watch` - watch mode for tests

## API Snapshot

- `GET /` - service info and endpoint index
- `GET /dashboard` - visual dashboard UI
- `GET /docs` - interactive Swagger UI docs
- `GET /openapi.json` - OpenAPI specification
- `GET /health` - health, uptime, and bug count
- `POST /seed?size=10&reset=true` - generate demo data
- `GET /bugs` - list bugs with query options:
  - `status`, `severity`, `assignee`, `label`, `search`
  - `sortBy=id|createdAt|updatedAt|severity`
  - `order=asc|desc`, `limit`, `offset`
- `POST /bugs` - create bug
- `GET /bugs/:id` - single bug details
- `PATCH /bugs/:id` - update bug fields
- `DELETE /bugs/:id` - delete bug
- `POST /bugs/:id/comments` - add comment
- `GET /bugs/:id/timeline` - event timeline
- `GET /analytics/summary` - aggregate metrics
- `GET /analytics/leaderboard` - assignee stats

## Example: Create Bug

```bash
curl -X POST http://localhost:3000/bugs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Checkout button does nothing",
    "description": "No network request is fired when clicking checkout.",
    "severity": "critical",
    "assignee": "ruth",
    "labels": ["frontend", "checkout"],
    "dueDate": "2026-03-10T18:00:00.000Z"
  }'
```

## Example: Seed Demo Data

```bash
curl -X POST "http://localhost:3000/seed?size=15&reset=true"
```

Then open `http://localhost:3000/dashboard` to view live metrics, filters, and leaderboard.

## Deployment

### Render

This repo includes a `render.yaml` blueprint.

1. Push this repository to GitHub.
2. In Render, choose New + Blueprint.
3. Select this repository and deploy.
4. Render will run `npm ci && npm run build` and start with `npm run start`.

### Docker

Build and run locally:

```bash
docker build -t bug-tracker-demo .
docker run --rm -p 3000:3000 bug-tracker-demo
```
