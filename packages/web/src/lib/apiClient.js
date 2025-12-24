const normalizeBaseUrl = () => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "http://localhost:4000";
  }
  return "";
};

export const API_BASE_URL = normalizeBaseUrl();

const buildUrl = (path) => {
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
};

const mapStatusKind = (status) => {
  if (status === 400) {
    return "bad_request";
  }
  if (status === 409) {
    return "conflict";
  }
  if (status >= 500) {
    return "server";
  }
  return "http";
};

const defaultMessageForStatus = (status) => {
  if (status === 400) {
    return "Solicitud invalida.";
  }
  if (status === 401) {
    return "No autorizado.";
  }
  if (status === 404) {
    return "No encontrado.";
  }
  if (status === 409) {
    return "Conflicto de reserva.";
  }
  if (status >= 500) {
    return "Error del servidor.";
  }
  return "Error de solicitud.";
};

const isCrossOrigin = () => {
  if (typeof window === "undefined") {
    return false;
  }
  if (!API_BASE_URL) {
    return false;
  }
  try {
    return !API_BASE_URL.startsWith(window.location.origin);
  } catch {
    return true;
  }
};

const inferFailureKind = (error) => {
  if (error instanceof Error) {
    const message = error.message || "";
    if (isCrossOrigin() && /cors|failed to fetch|networkerror/i.test(message)) {
      return "cors";
    }
  }
  return "network";
};

export const requestJson = async (path, options = {}) => {
  const url = buildUrl(path);
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        return {
          ok: false,
          error: {
            status: response.status,
            kind: mapStatusKind(response.status),
            message: "Respuesta no valida del servidor."
          }
        };
      }
    }

    if (response.ok) {
      return { ok: true, data };
    }

    const message =
      data?.error?.message ||
      data?.message ||
      defaultMessageForStatus(response.status);

    return {
      ok: false,
      error: {
        code: data?.error?.code ?? data?.code ?? null,
        status: response.status,
        kind: mapStatusKind(response.status),
        message,
        details: data?.error?.details ?? data?.details ?? null,
        timestamp: data?.error?.timestamp ?? data?.timestamp ?? null
      }
    };
  } catch (error) {
    const kind = inferFailureKind(error);
    const details = error instanceof Error ? error.message : null;
    return {
      ok: false,
      error: {
        status: 0,
        kind,
        message:
          kind === "cors"
            ? "CORS bloqueado: origen no permitido."
            : "No se pudo conectar con la API.",
        details
      }
    };
  }
};

export const getHealth = () => requestJson("/health");

export const getServices = () => requestJson("/api/services");

export const getAvailability = (params) => {
  const query = new URLSearchParams(params).toString();
  return requestJson(`/api/availability?${query}`);
};

export const createBooking = (payload) =>
  requestJson("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const getAdminBookings = (token, params) => {
  const query = new URLSearchParams(params).toString();
  return requestJson(`/api/admin/reservas?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};
