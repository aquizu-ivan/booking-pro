import type { FastifyInstance } from "fastify";

const SERVICES = [
  {
    id: "general",
    nombre: "Reserva general"
  }
];

export default async function servicesRoutes(app: FastifyInstance) {
  app.get("/api/services", async () => ({
    ok: true,
    services: SERVICES
  }));
}
