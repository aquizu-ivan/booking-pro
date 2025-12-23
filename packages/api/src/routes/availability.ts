import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

type AvailabilityQuery = {
  date?: string;
  fecha?: string;
  serviceId?: string;
};

const parseFecha = (value?: string) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { date, value: trimmed };
};

export default async function availabilityRoutes(app: FastifyInstance) {
  app.get<{ Querystring: AvailabilityQuery }>("/api/availability", async (request) => {
    const requested = request.query.date ?? request.query.fecha;
    const parsed = parseFecha(requested);

    if (!parsed) {
      throw badRequest("FECHA_INVALIDA", "Fecha invalida.", {
        fecha: requested ?? null
      });
    }

    const slots = await prisma.slot.findMany({
      where: { fecha: parsed.date },
      orderBy: { inicio: "asc" },
      include: {
        reserva: {
          select: { estado: true }
        }
      }
    });

    return {
      ok: true,
      date: parsed.value,
      timeZone: ZONA_HORARIA,
      slots: slots.map((slot: { id: string; inicio: Date; fin: Date; reserva: { estado: string } | null }) => ({
        id: slot.id,
        start: slot.inicio.toISOString(),
        end: slot.fin.toISOString(),
        status: slot.reserva?.estado === "CONFIRMADA" ? "ocupado" : "disponible"
      }))
    };
  });
}
