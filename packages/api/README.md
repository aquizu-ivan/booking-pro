# @booking-pro/api

## Desarrollo

`pnpm --filter @booking-pro/api dev`

## Variables de entorno

- `NODE_ENV` (por defecto: `development`)
- `PORT` (prioridad), `API_PORT` (fallback)
- `TZ` (por defecto: `UTC`)
- `CORS_ORIGIN` (por defecto: `http://localhost:5173`)

## Endpoints

- `GET /health`

## Nota Railway

La API escucha en `0.0.0.0` y usa el puerto de `PORT`.
