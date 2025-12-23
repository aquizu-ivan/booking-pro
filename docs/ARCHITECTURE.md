# Arquitectura — Booking Pro

## Mapa del monorepo
- `packages/api`: API en Fastify + Prisma (obra viva).
- `packages/web`: aun no integrado en este repo (directorio vacio).

## API (packages/api)
- Entry point: `packages/api/src/server.ts`.
- Rutas: `packages/api/src/routes/` (`disponibilidad`, `reservas`, `admin`).
- Errores: `packages/api/src/lib/errors.ts` (shape global).
- Prisma: `packages/api/prisma/schema.prisma` y `prisma/migrations/`.
- QA de concurrencia: `packages/api/scripts/concurrency.mjs` y `packages/api/QA-CONCURRENCY.md`.

## Infra (base creada)
- Neon Postgres: base `booking_pro` con `DATABASE_URL` (usar DIRECT para migraciones).
- Railway: despliegue de API (escucha en `PORT` y `0.0.0.0`).
- Netlify: base creada para web, pero sin integracion en este repo aun.

## Estado actual
El repo es una obra exhibible enfocada en la API; la web todavia no se versiona aqui.
