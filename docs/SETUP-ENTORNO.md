# Setup de entorno — Booking Pro

## Requisitos
- Node.js 18+
- pnpm

## Variables de entorno
- `DATABASE_URL`: conexion DIRECT a Neon Postgres.
- `PORT`: puerto de escucha (Railway).
- `CORS_ORIGIN`: dominio de Netlify. La web aun no esta integrada en este repo, pero el CORS aplica igual.

## Pasos basicos (API local)
1) Instalar dependencias:
   `pnpm install`
2) Migrar base:
   `pnpm --filter @booking-pro/api db:migrate`
3) Seed de slots:
   `pnpm --filter @booking-pro/api db:seed`
4) Levantar API:
   `pnpm --filter @booking-pro/api dev`

## Nota de estado
La base (Neon/Railway/Netlify) ya esta creada, pero este repo aun esta en etapa inicial de integracion.
