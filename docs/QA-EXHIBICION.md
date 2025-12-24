# QA de exhibicion - Booking Pro

## QA de Web (GitHub Pages)
- Carga OK, sin pantalla blanca.
- 0 errores en consola y 0 404 de assets bajo `/booking-pro/`.
- Boton "Ver salud" abre `/health` y responde `ok:true`.
- Flujo Cliente real completo con 201 (reserva confirmada).
- Repetir el mismo slot devuelve 409 con mensaje curatorial.
- CORS OK (sin bloqueos en navegador).
- Admin (lectura): token en UI, sesion en memoria, carga reservas.

## QA de API (Railway)
Base: https://booking-pro-booking-pro-api.up.railway.app

```bash
curl -s https://booking-pro-booking-pro-api.up.railway.app/health
curl -s https://booking-pro-booking-pro-api.up.railway.app/api/services
curl -s "https://booking-pro-booking-pro-api.up.railway.app/api/availability?date=YYYY-MM-DD"

# Reserva (201)
curl -s -X POST https://booking-pro-booking-pro-api.up.railway.app/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"general","slotId":"SLOT_ID","name":"Cliente Demo","email":"demo@example.com","phone":"+540000000000","date":"YYYY-MM-DD"}'

# Repetir el mismo slot (409)
curl -s -X POST https://booking-pro-booking-pro-api.up.railway.app/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"general","slotId":"SLOT_ID","name":"Cliente Demo","email":"demo@example.com","phone":"+540000000000","date":"YYYY-MM-DD"}'
```

## QA de concurrencia
- Ver `packages/api/QA-CONCURRENCY.md`.
- Comando recomendado:
  `API_BASE_URL="https://booking-pro-booking-pro-api.up.railway.app" CONCURRENCY=30 pnpm --filter @booking-pro/api run qa:concurrency:railway`
- Output esperado: `1x201 + (N-1)x409`.

## Variables / Entorno
- Web: `VITE_API_BASE_URL` (Railway).
- API: `CORS_ORIGIN` (lista separada por comas).
- API: `ADMIN_ACCESS_TOKEN` (secreto, no publicar).
