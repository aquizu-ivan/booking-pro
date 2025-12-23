# Contrato de API — Booking Pro

## Proposito
Este documento describe el contrato observable de la API tal como esta implementada en `packages/api`.

## Endpoints

### GET /health
- 200: `{ ok, status, db, timestamp }`

### GET /api/disponibilidad?fecha=YYYY-MM-DD
- 200: `{ ok, fecha, zonaHoraria, slots:[{ slotId, inicio, fin, estado }] }`
- 400: `FECHA_INVALIDA` si falta o el formato es invalido.

### POST /api/reservas
- Body minimo:
  ```json
  {
    "slotId": "UUID",
    "nombre": "string",
    "contacto": { "email": "string", "telefono": "string?" },
    "nota": "string?"
  }
  ```
- 201: `{ ok:true, reserva:{ id, slotId, nombre, email, telefono, estado, creadaEn } }`
- 400: `DATOS_INVALIDOS` si falta `slotId`, `nombre` o `contacto.email`.
- 404: `NO_ENCONTRADO` si el slot no existe.
- 409: `HORARIO_NO_DISPONIBLE` si el slot ya tiene reserva.

### GET /api/admin/reservas?fecha=YYYY-MM-DD
- Requiere header `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`.
- 200: `{ ok:true, fecha, reservas:[{ id, slotId, nombre, estado, creadaEn }] }`
- 401: `NO_AUTORIZADO` si falta o es invalido.
- 400: `FECHA_INVALIDA` si falta o el formato es invalido.

## Errores (shape global)
El formato se define en `packages/api/src/lib/errors.ts` y se aplica en `packages/api/src/server.ts`.
```json
{
  "ok": false,
  "error": {
    "code": "CODIGO",
    "message": "Mensaje en espanol",
    "details": {},
    "timestamp": "ISO-UTC"
  }
}
```

## Codigos de estado esperables
- 200: OK
- 201: Creado
- 400: Error de validacion
- 401: No autorizado
- 404: No encontrado
- 409: Conflicto por concurrencia o datos existentes
- 500: Error interno
