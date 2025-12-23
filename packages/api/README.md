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

Variables:
| Variable | Descripcion | Default |
| --- | --- | --- |
| `API_BASE_URL` | Base de la API | `http://localhost:4000` |
| `CONCURRENCY` | Cantidad de requests simultaneos | `20` |
| `DATE` | Fecha `YYYY-MM-DD` (opcional) | hoy en America/Argentina/Buenos_Aires |
| `VERBOSE` | 0/1 para mas detalle | `0` |

Local:
`pnpm --filter @booking-pro/api run qa:concurrency`

Railway (obra exhibible):
`API_BASE_URL="https://TU-API" CONCURRENCY=30 pnpm --filter @booking-pro/api run qa:concurrency:railway`

DATE opcional:
`DATE="2025-12-23" pnpm --filter @booking-pro/api run qa:concurrency`

VERBOSE:
`VERBOSE=1 pnpm --filter @booking-pro/api run qa:concurrency`

Evidencia reproducible:

PASS esperado (1x201 + (N-1)x409):
```text
Objetivo: http://localhost:4000 | Fecha 2025-12-23 | Slot 8a9c2f3e-...
Peticiones concurrentes: 20
Resultados: 201:1, 409:19, otros:0
Desglose: -
Final: PASS
Salida: 0
```

FAIL (otros > 0):
```text
Objetivo: http://localhost:4000 | Fecha 2025-12-23 | Slot 8a9c2f3e-...
Peticiones concurrentes: 20
Resultados: 201:1, 409:18, otros:1
Desglose: 400:1
Final: FAIL
Salida: 1
```
Si `otros` es mayor a 0, revisa el desglose y usa `VERBOSE=1` para ver muestras.

Nota: si no hay disponibilidad hoy, el script intenta manana automaticamente. Si tampoco hay, falla con mensaje claro.
