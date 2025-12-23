import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";

type ReservaBody = {
  slotId?: string;
  nombre?: string;
  contacto?: {
    email?: string;
    telefono?: string;
  };
  nota?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function reservasRoutes(app: FastifyInstance) {
  app.post<{ Body: ReservaBody }>("/api/reservas", async (request, reply) => {
    const body = request.body ?? {};
    const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const contacto = body.contacto ?? {};
    const email = typeof contacto.email === "string" ? contacto.email.trim() : "";
    const telefono =
      typeof contacto.telefono === "string" && contacto.telefono.trim()
        ? contacto.telefono.trim()
        : null;

    if (!slotId) {
      throw badRequest("DATOS_INVALIDOS", "Datos invalidos.", {
        campo: "slotId"
      });
    }

    if (nombre.length < 2) {
      throw badRequest("DATOS_INVALIDOS", "Datos invalidos.", {
        campo: "nombre"
      });
    }

    if (!email || !emailRegex.test(email)) {
      throw badRequest("DATOS_INVALIDOS", "Datos invalidos.", {
        campo: "contacto.email"
      });
    }

    const reserva = await prisma.reserva.create({
      data: {
        slotId,
        nombre,
        email,
        telefono,
        estado: "CONFIRMADA"
      }
    });

    return reply.status(201).send({
      ok: true,
      reserva: {
        id: reserva.id,
        slotId: reserva.slotId,
        nombre: reserva.nombre,
        email: reserva.email,
        telefono: reserva.telefono,
        estado: reserva.estado,
        creadaEn: reserva.creadaEn.toISOString()
      }
    });
  });
}
