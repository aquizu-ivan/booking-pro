# @booking-pro/api

## Desarrollo

`pnpm --filter @booking-pro/api dev`

## Variables de entorno

- `NODE_ENV` (por defecto: `development`)
- `PORT` (prioridad), `API_PORT` (fallback)
- `TZ` (por defecto: `UTC`)
- `CORS_ORIGIN` (por defecto: `http://localhost:5173`)
- `DATABASE_URL` (conexion a Postgres)

## Endpoints

- `GET /health`

## Base de datos (Prisma + Neon)

Para aplicar migraciones:
`pnpm --filter @booking-pro/api db:migrate`

Para ejecutar el seed:
`pnpm --filter @booking-pro/api db:seed`

Para migraciones, usa la conexion DIRECT de Neon en `DATABASE_URL`.

## Nota Railway

La API escucha en `0.0.0.0` y usa el puerto de `PORT`.
