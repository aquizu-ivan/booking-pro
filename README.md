# Booking Pro

## Como ver la obra (2-3 min)

Web (GitHub Pages): https://aquizu-ivan.github.io/booking-pro/

Pasos UI (Cliente real):
1) Elegir servicio.
2) Elegir fecha.
3) Refrescar/ver disponibilidad.
4) Seleccionar un slot disponible.
5) Completar nombre/email/telefono.
6) Reservar.
7) Repetir el mismo slot para ver 409 "colision controlada".

API (Railway): https://booking-pro-booking-pro-api.up.railway.app

Pruebas rapidas (curl):
```bash
curl -s https://booking-pro-booking-pro-api.up.railway.app/health
curl -s https://booking-pro-booking-pro-api.up.railway.app/api/services
curl -s "https://booking-pro-booking-pro-api.up.railway.app/api/availability?date=YYYY-MM-DD"
curl -s -X POST https://booking-pro-booking-pro-api.up.railway.app/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"general","slotId":"SLOT_ID","name":"Cliente Demo","email":"demo@example.com","phone":"+540000000000","date":"YYYY-MM-DD"}'
curl -s -X POST https://booking-pro-booking-pro-api.up.railway.app/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"general","slotId":"SLOT_ID","name":"Cliente Demo","email":"demo@example.com","phone":"+540000000000","date":"YYYY-MM-DD"}'
```

Admin (lectura):
- Se prueba desde la Web en la seccion "Admin (lectura)".
- Token no publicado. Usar placeholder: <PEDIR_TOKEN_TEMPORAL_AL_AUTOR>.
- El token se pega en la UI y vive solo en memoria.

## Variables / Entorno

- Web: `VITE_API_BASE_URL` (debe apuntar a Railway).
- API: `CORS_ORIGIN` (lista separada por comas, incluye `http://localhost:5173` y `https://aquizu-ivan.github.io`).
- API: `ADMIN_ACCESS_TOKEN` (secreto, no se documenta el valor).

## Ficha de obra

- Se observa: health, status codes, colision controlada (409), admin read-only.
- No es: producto ni SaaS.

Mas detalle: ver `docs/QA-EXHIBICION.md`.
