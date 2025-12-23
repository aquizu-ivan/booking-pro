# QA de exhibicion — Booking Pro

## Camino de demo (3 minutos) — Local
1) Instalar dependencias:
   `pnpm install`
2) Migrar base (requiere `DATABASE_URL` DIRECT):
   `pnpm --filter @booking-pro/api db:migrate`
3) Seed de slots:
   `pnpm --filter @booking-pro/api db:seed`
4) Concurrencia (evidencia):
   `pnpm --filter @booking-pro/api run qa:concurrency`

## Camino de demo — Produccion (Railway)
1) Ejecutar concurrencia contra la API desplegada:
   `API_BASE_URL="https://TU-API" CONCURRENCY=30 pnpm --filter @booking-pro/api run qa:concurrency:railway`

## Variables de entorno relevantes
- `DATABASE_URL` (Neon, DIRECT para migraciones).
- `PORT` (Railway).
- `CORS_ORIGIN` (dominio de Netlify; la web aun no vive en este repo).
- `ADMIN_ACCESS_TOKEN` (si se va a usar `/api/admin/reservas`).

## Evidencia
- Ver `packages/api/QA-CONCURRENCY.md` para formato de salida y criterios de PASS/FAIL.
