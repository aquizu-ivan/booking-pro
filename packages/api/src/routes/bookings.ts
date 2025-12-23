import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";

type BookingBody = {
  serviceId?: string;
  slotId?: string;
  name?: string;
  email?: string;
  phone?: string;
  date?: string;
  nombre?: string;
  telefono?: string;
  contacto?: {
    email?: string;
    telefono?: string;
  };
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function bookingsRoutes(app: FastifyInstance) {
  app.post<{ Body: BookingBody }>("/api/bookings", async (request, reply) => {
    const body = request.body ?? {};
    const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
    const nombre =
      typeof body.name === "string"
        ? body.name.trim()
        : typeof body.nombre === "string"
          ? body.nombre.trim()
          : "";
    const contacto = body.contacto ?? {};
    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : typeof contacto.email === "string"
          ? contacto.email.trim()
          : "";
    const telefono =
      typeof body.phone === "string" && body.phone.trim()
        ? body.phone.trim()
        : typeof body.telefono === "string" && body.telefono.trim()
          ? body.telefono.trim()
          : typeof contacto.telefono === "string" && contacto.telefono.trim()
            ? contacto.telefono.trim()
            : null;

    if (!slotId) {
      throw badRequest("DATOS_INVALIDOS", "Datos invalidos.", {
        campo: "slotId"
      });
    }

    if (nombre.length < 2) {
      throw badRequest("DATOS_INVALIDOS", "Datos invalidos.", {
        campo: "name"
      });
    }

    if (!email || !emailRegex.test(email)) {
      throw badRequest("DATOS_INVALIDOS", "Datos invalidos.", {
        campo: "email"
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
      booking: {
        id: reserva.id,
        slotId: reserva.slotId,
        status: reserva.estado,
        createdAt: reserva.creadaEn.toISOString()
      }
    });
  });
}
