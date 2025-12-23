# @booking-pro/api

## Desarrollo

`pnpm --filter @booking-pro/api dev`

## Variables de entorno

- `NODE_ENV` (por defecto: `development`)
- `PORT` (prioridad), `API_PORT` (fallback)
- `TZ` (por defecto: `UTC`)
- `CORS_ORIGIN` (por defecto: `http://localhost:5173`)
- `DATABASE_URL` (conexion a Postgres)
- `ADMIN_ACCESS_TOKEN` (token para endpoints admin)

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

## QA (curl)

Salud:
`curl -s http://localhost:4000/health`

Disponibilidad:
`curl -s "http://localhost:4000/api/disponibilidad?fecha=2025-01-15"`

Crear reserva (201):
`curl -s -X POST http://localhost:4000/api/reservas -H "Content-Type: application/json" -d "{\"slotId\":\"SLOT_ID\",\"nombre\":\"Juan Perez\",\"contacto\":{\"email\":\"juan@example.com\",\"telefono\":\"+5491112345678\"}}"`

Crear reserva (409, mismo slot):
`curl -s -X POST http://localhost:4000/api/reservas -H "Content-Type: application/json" -d "{\"slotId\":\"SLOT_ID\",\"nombre\":\"Juan Perez\",\"contacto\":{\"email\":\"juan@example.com\"}}"`

Admin reservas (401):
`curl -s "http://localhost:4000/api/admin/reservas?fecha=2025-01-15"`

Admin reservas (200):
`curl -s -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" "http://localhost:4000/api/admin/reservas?fecha=2025-01-15"`

## QA de concurrencia (exhibicion)

Local:
`pnpm --filter @booking-pro/api run qa:concurrency`

Railway:
`API_BASE_URL="https://TU-API" CONCURRENCY=30 pnpm --filter @booking-pro/api run qa:concurrency`

DATE opcional:
`DATE="2025-12-23" pnpm --filter @booking-pro/api run qa:concurrency`

Expectativa: `1x201 + (N-1)x409`.

Nota: si no hay disponibilidad hoy, el script intenta manana automaticamente.
