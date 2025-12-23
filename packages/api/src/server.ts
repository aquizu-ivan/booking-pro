import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";

const app = Fastify({
  logger: env.NODE_ENV !== "test"
});

const buildError = (
  code: string,
  message: string,
  details: unknown = null
) => ({
  ok: false,
  error: {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  }
});

app.register(cors, {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204
});

app.get("/health", async () => ({
  ok: true,
  status: "ok",
  db: "postgres",
  timestamp: new Date().toISOString()
}));

app.setNotFoundHandler((request, reply) => {
  reply.status(404).send(
    buildError("NO_ENCONTRADO", "Ruta no encontrada.", {
      path: request.url,
      method: request.method
    })
  );
});

app.setErrorHandler((error, _request, reply) => {
  const statusCode = error.statusCode ?? 500;
  const code = statusCode === 404 ? "NO_ENCONTRADO" : "ERROR_INTERNO";
  const message =
    statusCode === 404 ? "Ruta no encontrada." : error.message || "Error interno.";
  const details =
    typeof (error as { details?: unknown }).details !== "undefined"
      ? (error as { details?: unknown }).details
      : null;

  reply.status(statusCode).send(buildError(code, message, details));
});

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
