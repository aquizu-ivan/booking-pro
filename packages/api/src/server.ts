import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { buildError, isAppError, mapPrismaError } from "./lib/errors.js";
import servicesRoutes from "./routes/services.js";
import availabilityRoutes from "./routes/availability.js";
import bookingsRoutes from "./routes/bookings.js";
import disponibilidadRoutes from "./routes/disponibilidad.js";
import reservasRoutes from "./routes/reservas.js";
import adminRoutes from "./routes/admin.js";

const app = Fastify({
  logger: env.NODE_ENV !== "test"
});

const startedAt = new Date().toISOString();
const gitSha =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "unknown";
const buildInfo = {
  gitSha,
  package: "@booking-pro/api",
  startedAt,
  routes: [
    "GET /health",
    "GET /api/services",
    "GET /api/availability",
    "POST /api/bookings",
    "GET /api/disponibilidad",
    "POST /api/reservas",
    "GET /api/admin/reservas"
  ]
};

app.register(cors, {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204
});

app.get("/health", async () => ({
  ok: true,
  status: "ok",
  db: "postgres",
  timestamp: new Date().toISOString(),
  build: buildInfo
}));

app.register(servicesRoutes);
app.register(availabilityRoutes);
app.register(bookingsRoutes);
app.register(disponibilidadRoutes);
app.register(reservasRoutes);
app.register(adminRoutes);

app.setNotFoundHandler((request, reply) => {
  reply.status(404).send(
    buildError("NO_ENCONTRADO", "Ruta no encontrada.", {
      path: request.url,
      method: request.method
    })
  );
});

app.setErrorHandler((error, _request, reply) => {
  if (isAppError(error)) {
    reply.status(error.statusCode).send(buildError(error.code, error.message, error.details));
    return;
  }

  const prismaError = mapPrismaError(error);
  if (prismaError) {
    reply
      .status(prismaError.statusCode)
      .send(buildError(prismaError.code, prismaError.message, prismaError.details));
    return;
  }

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
    app.log.info(
      `BOOT booking-pro/api gitSha=${buildInfo.gitSha} port=${env.PORT} routes=${buildInfo.routes.length}`
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
