# Netlify — Booking Pro (web)

## Build command (monorepo pnpm)
Si no hay lockfile:
```bash
pnpm install && pnpm --filter @booking-pro/web build
```

## Publish directory
`packages/web/dist`

## Variables de entorno
- `VITE_API_BASE_URL` (URL de Railway)

## SPA fallback
Configurar redirect:
`/* /index.html 200`
Esto se entrega con `packages/web/public/_redirects`.
