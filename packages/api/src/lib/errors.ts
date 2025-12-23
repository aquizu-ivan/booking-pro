import { Prisma } from "@prisma/client";

type ErrorPayload = {
  ok: false;
  error: {
    code: string;
    message: string;
    details: unknown;
    timestamp: string;
  };
};

export class AppError extends Error {
  statusCode: number;
  code: string;
  details: unknown;

  constructor(statusCode: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const buildError = (
  code: string,
  message: string,
  details: unknown = null
): ErrorPayload => ({
  ok: false,
  error: {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  }
});

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

export const badRequest = (
  code: string,
  message: string,
  details: unknown = null
) => new AppError(400, code, message, details);

export const unauthorized = (message = "No autorizado.", details: unknown = null) =>
  new AppError(401, "NO_AUTORIZADO", message, details);

export const notFound = (message: string, details: unknown = null) =>
  new AppError(404, "NO_ENCONTRADO", message, details);

export const conflict = (
  code: string,
  message: string,
  details: unknown = null
) => new AppError(409, code, message, details);

export const mapPrismaError = (error: unknown): AppError | null => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code === "P2002") {
    const target = error.meta?.target;
    const targetList = Array.isArray(target)
      ? target.map((item) => String(item))
      : typeof target === "string"
        ? [target]
        : [];

    if (targetList.some((item) => item.includes("slotId"))) {
      return conflict("HORARIO_NO_DISPONIBLE", "Horario no disponible.", {
        campo: "slotId"
      });
    }
  }

  if (error.code === "P2003") {
    return notFound("Horario no encontrado.", {
      campo:
        typeof error.meta?.field_name === "string" ? error.meta.field_name : null
    });
  }

  if (error.code === "P2025") {
    return notFound("Recurso no encontrado.");
  }

  return null;
};
