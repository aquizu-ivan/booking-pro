import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

type DisponibilidadQuery = {
  fecha?: string;
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

export default async function disponibilidadRoutes(app: FastifyInstance) {
  app.get<{ Querystring: DisponibilidadQuery }>("/api/disponibilidad", async (request) => {
    const parsed = parseFecha(request.query.fecha);

    if (!parsed) {
      throw badRequest("FECHA_INVALIDA", "Fecha invalida.", {
        fecha: request.query.fecha ?? null
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
      fecha: parsed.value,
      zonaHoraria: ZONA_HORARIA,
      slots: slots.map((slot) => ({
        slotId: slot.id,
        inicio: slot.inicio.toISOString(),
        fin: slot.fin.toISOString(),
        estado: slot.reserva?.estado === "CONFIRMADA" ? "ocupado" : "disponible"
      }))
    };
  });
}
