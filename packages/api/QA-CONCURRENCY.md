# QA de Concurrencia — Booking Pro (API)

## Que demuestra esta prueba
- Ante N requests simultaneas sobre el mismo slot, solo 1 reserva se confirma (201).
- El resto de las requests deben fallar con conflicto (409) por colision de slot.
- El estado de los datos no se corrompe ni quedan reservas duplicadas.
- El resultado debe ser determinista: 1x201 + (N-1)x409, sin otros codigos.
- La prueba valida el comportamiento bajo carga concurrente real.

## Como ejecutar la prueba
### Local
```bash
pnpm --filter @booking-pro/api run qa:concurrency
```

### Railway (obra exhibible)
```bash
API_BASE_URL="https://TU-API" CONCURRENCY=30 pnpm --filter @booking-pro/api run qa:concurrency:railway
```

### Variables disponibles
- `API_BASE_URL` (default: http://localhost:4000)
- `CONCURRENCY` (default: 20)
- `DATE` (YYYY-MM-DD, opcional)
- `VERBOSE` (0/1)

## Output esperado (PASS)
```text
Objetivo: http://localhost:4000 | Fecha 2025-12-23 | Slot 8a9c2f3e-...
Peticiones concurrentes: 20
Resultados: 201:1, 409:19, otros:0
Desglose: -
Final: PASS
Salida: 0
```

## Output de error (FAIL)
```text
Objetivo: http://localhost:4000 | Fecha 2025-12-23 | Slot 8a9c2f3e-...
Peticiones concurrentes: 20
Resultados: 201:1, 409:18, otros:1
Desglose: 400:1
Final: FAIL
Salida: 1
```

## Como interpretar el resultado
- PASS: el backend colisiona sin romperse; solo una reserva es confirmada.
- FAIL: hubo errores inesperados (validaciones, red o 5xx) y se debe revisar el desglose.

## Notas operativas
- Si no hay slots disponibles hoy, el script intenta manana automaticamente.
- Si no hay disponibilidad, la prueba falla de forma explicita.
- No se usan dependencias externas ni tooling adicional.
