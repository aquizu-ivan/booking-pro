# Netlify ↔ Railway (Booking Pro)

## Que se esta cableando
La web en Netlify lee la URL base de la API en Railway mediante `VITE_API_BASE_URL`.
Con esa variable se habilita el link “Ver salud” hacia `/health`.

## Variable requerida
- `VITE_API_BASE_URL` = `https://<railway-app>`

## Pasos exactos
1) Abrir Netlify.
2) Ir a: Site settings → Environment variables.
3) Crear `VITE_API_BASE_URL` con la URL de Railway.
4) Guardar cambios y redeployar el sitio.

## Como verificar (observable)
- Abrir la URL de Netlify y ver el estado “API configurada”.
- Click en “Ver salud” y esperar respuesta OK del endpoint `/health`.

## Nota CORS
Si la web luego consume la API desde el navegador, alinear `CORS_ORIGIN` con el dominio Netlify.
