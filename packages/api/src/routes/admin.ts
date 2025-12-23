import type { FastifyInstance } from "fastify";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { badRequest, unauthorized } from "../lib/errors.js";

type AdminReservasQuery = {
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

const extractToken = (header?: string) => {
  if (!header) {
    return "";
  }

  const [type, ...rest] = header.split(" ");
  if (type !== "Bearer") {
    return "";
  }

  return rest.join(" ").trim();
};

export default async function adminRoutes(app: FastifyInstance) {
  app.get<{ Querystring: AdminReservasQuery }>(
    "/api/admin/reservas",
    async (request) => {
      const token = extractToken(request.headers.authorization);

      if (!env.ADMIN_ACCESS_TOKEN || token !== env.ADMIN_ACCESS_TOKEN) {
        throw unauthorized();
      }

      const parsed = parseFecha(request.query.fecha);
      if (!parsed) {
        throw badRequest("FECHA_INVALIDA", "Fecha invalida.", {
          fecha: request.query.fecha ?? null
        });
      }

      const reservas = await prisma.reserva.findMany({
        where: { slot: { fecha: parsed.date } },
        orderBy: {
          slot: {
            inicio: "asc"
          }
        },
        select: {
          id: true,
          slotId: true,
          nombre: true,
          estado: true,
          creadaEn: true
        }
      });

      return {
        ok: true,
        fecha: parsed.value,
        reservas: reservas.map((reserva) => ({
          id: reserva.id,
          slotId: reserva.slotId,
          nombre: reserva.nombre,
          estado: reserva.estado,
          creadaEn: reserva.creadaEn.toISOString()
        }))
      };
    }
  );
}
