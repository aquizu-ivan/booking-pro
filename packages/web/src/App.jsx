import { useCallback, useEffect, useMemo, useState } from "react";
import {
  API_BASE_URL,
  createBooking,
  getAdminBookings,
  getAvailability,
  getHealth,
  getServices
} from "./lib/apiClient.js";

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const STORAGE_KEYS = {
  service: "booking-pro:service",
  date: "booking-pro:date",
  name: "booking-pro:name"
};

const readStorage = (key, fallback = "") => {
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
};

const formatDateInZone = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);

const formatTime = (value) => {
  if (!value) {
    return "--:--";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
};

const formatDateTime = (value) => {
  if (!value) {
    return "--";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short"
  }).format(parsed);
};

const normalizeServices = (data) => {
  const list =
    data?.services ??
    data?.data?.services ??
    data?.items ??
    (Array.isArray(data) ? data : []);

  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((item, index) => ({
    id: String(item.id ?? item.serviceId ?? item.code ?? item.slug ?? index),
    label: item.nombre ?? item.name ?? item.title ?? `Servicio ${index + 1}`
  }));
};

const normalizeSlots = (data) => {
  const list =
    data?.slots ??
    data?.availability ??
    data?.data?.slots ??
    data?.data?.availability ??
    [];

  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((slot, index) => {
    const status = String(
      slot.status ?? slot.estado ?? slot.state ?? slot.availability ?? ""
    ).toLowerCase();
    const available =
      typeof slot.available === "boolean"
        ? slot.available
        : typeof slot.isAvailable === "boolean"
          ? slot.isAvailable
          : status === "available" || status === "disponible";

    return {
      id: String(slot.id ?? slot.slotId ?? slot.uuid ?? slot.code ?? index),
      inicio: slot.start ?? slot.inicio ?? slot.from ?? slot.startAt ?? "",
      fin: slot.end ?? slot.fin ?? slot.to ?? slot.endAt ?? "",
      available,
      status
    };
  });
};

const extractBooking = (data) => {
  const booking = data?.booking ?? data?.reserva ?? data?.data ?? data;
  if (!booking || typeof booking !== "object") {
    return null;
  }
  return {
    id: booking.id ?? booking.bookingId ?? "",
    slotId: booking.slotId ?? "",
    status: booking.status ?? booking.estado ?? ""
  };
};

const formatErrorDetails = (details) => {
  if (details === null || typeof details === "undefined") {
    return "";
  }
  if (typeof details === "string") {
    return details;
  }
  try {
    return JSON.stringify(details);
  } catch {
    return "Detalles no disponibles.";
  }
};

const buildErrorMeta = (error) => {
  if (!error) {
    return [];
  }
  const meta = [];
  if (error.code) {
    meta.push(`Codigo: ${error.code}`);
  }
  if (error.timestamp) {
    meta.push(`Timestamp: ${error.timestamp}`);
  }
  const details = formatErrorDetails(error.details);
  if (details) {
    meta.push(`Detalles: ${details}`);
  }
  return meta;
};

const StatusMessage = ({ variant, title, meta, role = "status" }) => (
  <div
    className={`message message-${variant}`}
    role={role}
    aria-live={role === "alert" ? "assertive" : "polite"}
  >
    <p className="message-title">{title}</p>
    {meta && meta.length > 0 && (
      <div className="message-meta">
        {meta.map((item, index) => (
          <p key={`${variant}-${index}`}>{item}</p>
        ))}
      </div>
    )}
  </div>
);
const getErrorPresentation = (error, fallback) => {
  if (!error) {
    return { title: fallback || "Error inesperado.", variant: "error" };
  }

  if (error.kind === "cors") {
    return {
      title: "CORS bloqueado: origen no permitido.",
      variant: "error"
    };
  }

  if (error.kind === "network") {
    return {
      title: "Red no disponible. No se pudo conectar con la API.",
      variant: "error"
    };
  }

  if (error.kind === "server" || (error.status && error.status >= 500)) {
    return {
      title: "Error del servidor. Intenta nuevamente.",
      variant: "error"
    };
  }

  if (error.code === "DATOS_INVALIDOS" || error.kind === "bad_request") {
    return {
      title: "Datos invalidos. Revisa los campos requeridos.",
      variant: "warning"
    };
  }

  if (error.code === "HORARIO_NO_DISPONIBLE" || error.status === 409) {
    return {
      title: "Colision controlada: el horario ya fue tomado.",
      variant: "warning"
    };
  }

  if (error.status && error.status >= 400 && error.status < 500) {
    return {
      title: "Solicitud invalida. Verifica los datos enviados.",
      variant: "warning"
    };
  }

  return { title: error.message || fallback || "Error inesperado.", variant: "error" };
};

export default function App() {
  const apiBaseUrl = API_BASE_URL;
  const isProd = import.meta.env.PROD;
  const healthUrl = apiBaseUrl ? `${apiBaseUrl}/health` : "";
  const apiLabel =
    apiBaseUrl.length > 48 ? `${apiBaseUrl.slice(0, 45)}...` : apiBaseUrl;
  const missingApiTitle = isProd
    ? "API no configurada en produccion."
    : "API no configurada.";
  const missingApiMeta = isProd
    ? ["Configura VITE_API_BASE_URL en GitHub Pages."]
    : [];
  const missingApiVariant = isProd ? "error" : "warning";

  const [healthState, setHealthState] = useState({
    status: "idle",
    message: ""
  });
  const [servicesState, setServicesState] = useState({
    status: "idle",
    items: [],
    message: "",
    error: null
  });
  const [serviceId, setServiceId] = useState(() =>
    readStorage(STORAGE_KEYS.service)
  );
  const [date, setDate] = useState(
    () => readStorage(STORAGE_KEYS.date) || formatDateInZone(new Date())
  );
  const [availabilityState, setAvailabilityState] = useState({
    status: "idle",
    items: [],
    message: "",
    error: null
  });
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [name, setName] = useState(() => readStorage(STORAGE_KEYS.name));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingState, setBookingState] = useState({
    status: "idle",
    message: "",
    booking: null,
    error: null
  });
  const [lastBookingPayload, setLastBookingPayload] = useState(null);
  const [adminInput, setAdminInput] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [adminState, setAdminState] = useState({
    status: "idle",
    items: [],
    message: "",
    error: null
  });

  useEffect(() => {
    writeStorage(STORAGE_KEYS.service, serviceId);
  }, [serviceId]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.date, date);
  }, [date]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.name, name);
  }, [name]);

  useEffect(() => {
    if (!apiBaseUrl) {
      setHealthState({ status: "missing", message: "API no configurada." });
      return;
    }

    let active = true;
    setHealthState({ status: "loading", message: "Chequeando API..." });
    getHealth().then((result) => {
      if (!active) {
        return;
      }
      if (result.ok) {
        setHealthState({ status: "ok", message: "API viva." });
      } else {
        setHealthState({
          status: "error",
          message: result.error.message || "API no disponible."
        });
      }
    });
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  const loadServices = useCallback(async () => {
    if (!apiBaseUrl) {
      return;
    }

    setServicesState({ status: "loading", items: [], message: "", error: null });
    const result = await getServices();
    if (result.ok) {
      const services = normalizeServices(result.data);
      if (services.length === 0) {
        setServicesState({
          status: "empty",
          items: [],
          message: "Sin servicios disponibles.",
          error: null
        });
      } else {
        setServicesState({
          status: "success",
          items: services,
          message: "",
          error: null
        });
      }
    } else {
      setServicesState({
        status: "error",
        items: [],
        message: result.error.message,
        error: result.error
      });
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    let active = true;
    loadServices().then(() => {
      if (!active) {
        return;
      }
    });

    return () => {
      active = false;
    };
  }, [apiBaseUrl, loadServices]);

  useEffect(() => {
    if (servicesState.status !== "success") {
      return;
    }
    if (servicesState.items.length === 0) {
      return;
    }
    const exists = servicesState.items.some((service) => service.id === serviceId);
    if (!exists) {
      setServiceId(servicesState.items[0].id);
    }
  }, [servicesState, serviceId]);

  const loadAvailability = useCallback(async () => {
    if (!apiBaseUrl) {
      return;
    }
    if (!date) {
      setAvailabilityState({
        status: "error",
        items: [],
        message: "Selecciona una fecha valida.",
        error: {
          message: "Selecciona una fecha valida."
        }
      });
      return;
    }

    setAvailabilityState({
      status: "loading",
      items: [],
      message: "",
      error: null
    });
    const params = { date };
    if (serviceId) {
      params.serviceId = serviceId;
    }
    const result = await getAvailability(params);
    if (result.ok) {
      const slots = normalizeSlots(result.data);
      if (slots.length === 0) {
        setAvailabilityState({
          status: "empty",
          items: [],
          message: "Sin horarios disponibles.",
          error: null
        });
      } else {
        setAvailabilityState({
          status: "success",
          items: slots,
          message: "",
          error: null
        });
      }

      const firstAvailable = slots.find((slot) => slot.available);
      setSelectedSlotId((current) => {
        const stillValid = slots.some(
          (slot) => slot.id === current && slot.available
        );
        if (stillValid) {
          return current;
        }
        return firstAvailable?.id ?? "";
      });
    } else {
      setAvailabilityState({
        status: "error",
        items: [],
        message: result.error.message,
        error: result.error
      });
    }
  }, [apiBaseUrl, date, serviceId]);

  useEffect(() => {
    if (!apiBaseUrl || servicesState.status === "error") {
      return;
    }
    if (servicesState.status === "loading") {
      return;
    }
    loadAvailability();
  }, [apiBaseUrl, servicesState.status, serviceId, date, loadAvailability]);

  useEffect(() => {
    setSelectedSlotId("");
  }, [serviceId, date]);

  const healthBadge = useMemo(() => {
    if (!apiBaseUrl) {
      return { label: "API no configurada", kind: isProd ? "error" : "warn" };
    }
    if (healthState.status === "ok") {
      return { label: "API viva", kind: "ok" };
    }
    if (healthState.status === "error") {
      return { label: "API no disponible", kind: "error" };
    }
    return { label: "Chequeando API", kind: "idle" };
  }, [apiBaseUrl, healthState.status, isProd]);

  const submitBooking = useCallback(
    async (payload) => {
      setBookingState({
        status: "loading",
        message: "",
        booking: null,
        error: null
      });

      const result = await createBooking(payload);

      if (result.ok) {
        const booking = extractBooking(result.data);
        setBookingState({
          status: "success",
          message: "Reserva confirmada.",
          booking,
          error: null
        });
        return;
      }

      if (result.error.kind === "conflict" || result.error.status === 409) {
        setBookingState({
          status: "conflict",
          message: "Colision controlada: el horario ya fue tomado.",
          booking: null,
          error: result.error
        });
        await loadAvailability();
        return;
      }

      setBookingState({
        status: "error",
        message: result.error.message,
        booking: null,
        error: result.error
      });
    },
    [loadAvailability]
  );

  const handleBooking = async (event) => {
    event.preventDefault();
    if (!selectedSlotId) {
      setBookingState({
        status: "error",
        message: "Selecciona un horario disponible.",
        booking: null,
        error: {
          message: "Selecciona un horario disponible."
        }
      });
      return;
    }
    if (!name.trim()) {
      setBookingState({
        status: "error",
        message: "Ingresa tu nombre.",
        booking: null,
        error: {
          message: "Ingresa tu nombre."
        }
      });
      return;
    }
    if (!email.trim()) {
      setBookingState({
        status: "error",
        message: "Ingresa tu email.",
        booking: null,
        error: {
          message: "Ingresa tu email."
        }
      });
      return;
    }

    const payload = {
      serviceId,
      slotId: selectedSlotId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      date
    };

    setLastBookingPayload(payload);
    await submitBooking(payload);
  };

  const bookingSummary = bookingState.booking;
  const bookingMeta = bookingSummary?.id ? [`ID: ${bookingSummary.id}`] : [];
  const bookingErrorMeta = buildErrorMeta(bookingState.error);
  const availabilityErrorMeta = buildErrorMeta(availabilityState.error);
  const servicesErrorMeta = buildErrorMeta(servicesState.error);

  const servicesErrorPresentation = getErrorPresentation(
    servicesState.error,
    servicesState.message
  );
  const availabilityErrorPresentation = getErrorPresentation(
    availabilityState.error,
    availabilityState.message
  );
  const bookingErrorPresentation = getErrorPresentation(
    bookingState.error,
    bookingState.message
  );
  const handleAdminLogin = (event) => {
    event.preventDefault();
    const trimmed = adminInput.trim();
    if (!trimmed) {
      setAdminState({
        status: "error",
        items: [],
        message: "Ingresa un token de admin.",
        error: {
          message: "Ingresa un token de admin."
        }
      });
      return;
    }
    setAdminToken(trimmed);
    setAdminInput("");
    setAdminState({
      status: "idle",
      items: [],
      message: "",
      error: null
    });
  };

  const handleAdminLogout = () => {
    setAdminToken("");
    setAdminState({
      status: "idle",
      items: [],
      message: "",
      error: null
    });
  };

  const loadAdminBookings = useCallback(async () => {
    if (!adminToken) {
      return;
    }
    if (!date) {
      setAdminState({
        status: "error",
        items: [],
        message: "Selecciona una fecha valida.",
        error: {
          message: "Selecciona una fecha valida."
        }
      });
      return;
    }
    setAdminState({
      status: "loading",
      items: [],
      message: "",
      error: null
    });
    const result = await getAdminBookings(adminToken, { fecha: date });
    if (result.ok) {
      const reservas = Array.isArray(result.data?.reservas)
        ? result.data.reservas
        : [];
      if (reservas.length === 0) {
        setAdminState({
          status: "empty",
          items: [],
          message: "Sin reservas para la fecha seleccionada.",
          error: null
        });
      } else {
        setAdminState({
          status: "success",
          items: reservas,
          message: "",
          error: null
        });
      }
      return;
    }

    if (result.error.status === 401 || result.error.status === 403) {
      setAdminState({
        status: "error",
        items: [],
        message: "Acceso no autorizado. Token invalido o faltante.",
        error: result.error
      });
      return;
    }

    setAdminState({
      status: "error",
      items: [],
      message: result.error.message,
      error: result.error
    });
  }, [adminToken, date]);

  const adminErrorMeta = buildErrorMeta(adminState.error);
  const adminErrorPresentation = getErrorPresentation(
    adminState.error,
    adminState.message
  );
  const adminDate = date;

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">Obra exhibible</p>
        <h1>Booking Pro</h1>
        <p className="subtitle">
          Obra backend observable + habitat web (en integracion)
        </p>
      </header>

      <main className="grid">
        <section className="card" aria-labelledby="obra-api">
          <h2 id="obra-api">Obra API</h2>
          <p className="body">
            Salud, servicios, disponibilidad y reservas con control de
            concurrencia.
          </p>
          {apiBaseUrl ? (
            <div className="stack">
              <p className="meta">API configurada: {apiLabel}</p>
              <a
                className="button"
                href={healthUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ver salud
              </a>
            </div>
          ) : (
            <StatusMessage
              variant={missingApiVariant}
              title={missingApiTitle}
              meta={missingApiMeta}
              role="alert"
            />
          )}
        </section>

        <section className="card" aria-labelledby="qa-exhibible">
          <h2 id="qa-exhibible">QA exhibible</h2>
          <p className="body">
            Documento interno:{" "}
            <span className="mono">packages/api/QA-CONCURRENCY.md</span>
          </p>
          <div className="code">
            <pre>
              <code>qa:concurrency:railway</code>
            </pre>
          </div>
          <p className="muted">
            La evidencia valida 1x201 + (N-1)x409 sobre el mismo slot.
          </p>
        </section>

        <section className="card full" aria-labelledby="cliente-real">
          <div className="card-header">
            <div>
              <h2 id="cliente-real">Cliente real</h2>
              <p className="body">
                Flujo observable: servicio - fecha - disponibilidad - reserva.
              </p>
            </div>
            <span className={`badge badge-${healthBadge.kind}`}>
              {healthBadge.label}
            </span>
          </div>

          {!apiBaseUrl ? (
            <StatusMessage
              variant={missingApiVariant}
              title={missingApiTitle}
              meta={missingApiMeta}
              role="alert"
            />
          ) : (
            <form className="flow" onSubmit={handleBooking}>
              <div className="field">
                <label htmlFor="service">Servicio</label>
                {servicesState.status === "loading" && (
                  <p className="muted">Cargando servicios...</p>
                )}
                {servicesState.status === "error" && (
                  <div className="stack">
                    <StatusMessage
                      variant={servicesErrorPresentation.variant}
                      title={servicesErrorPresentation.title}
                      meta={servicesErrorMeta}
                      role="alert"
                    />
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={loadServices}
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {servicesState.status === "empty" && (
                  <p className="muted">Sin servicios disponibles.</p>
                )}
                {servicesState.status === "success" && (
                  <select
                    id="service"
                    className="input"
                    value={serviceId}
                    onChange={(event) => setServiceId(event.target.value)}
                  >
                    {servicesState.items.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="field">
                <label htmlFor="date">Fecha</label>
                <input
                  id="date"
                  type="date"
                  className="input"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
                <p className="helper">Horarios en Argentina (AR).</p>
              </div>

              <div className="field">
                <label>Disponibilidad</label>
                {availabilityState.status === "loading" && (
                  <p className="muted">Cargando horarios...</p>
                )}
                {availabilityState.status === "error" && (
                  <div className="stack">
                    <StatusMessage
                      variant={availabilityErrorPresentation.variant}
                      title={availabilityErrorPresentation.title}
                      meta={availabilityErrorMeta}
                      role="alert"
                    />
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={loadAvailability}
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {availabilityState.status === "empty" && (
                  <p className="muted">Sin horarios para esta fecha.</p>
                )}
                {availabilityState.status === "success" && (
                  <ul className="slots" role="list">
                    {availabilityState.items.map((slot) => (
                      <li
                        key={slot.id}
                        className={`slot ${slot.available ? "" : "slot--off"}`}
                      >
                        <label className="slot-label">
                          <input
                            type="radio"
                            name="slot"
                            value={slot.id}
                            checked={selectedSlotId === slot.id}
                            onChange={() => setSelectedSlotId(slot.id)}
                            disabled={!slot.available}
                          />
                          <span className="slot-time">
                            {formatTime(slot.inicio)} - {formatTime(slot.fin)}
                          </span>
                          <span className="slot-status">
                            {slot.available ? "Disponible" : "Ocupado"}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="inline-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={loadAvailability}
                  >
                    Refrescar disponibilidad
                  </button>
                  <span className="meta">Seleccion: {selectedSlotId || "-"}</span>
                </div>
              </div>

              <div className="field">
                <label htmlFor="name">Nombre</label>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@email.com"
                />
              </div>

              <div className="field">
                <label htmlFor="phone">Telefono (opcional)</label>
                <input
                  id="phone"
                  className="input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+54 11 0000 0000"
                />
              </div>

              <div className="field">
                <button
                  type="submit"
                  className="button"
                  disabled={bookingState.status === "loading"}
                >
                  {bookingState.status === "loading"
                    ? "Reservando..."
                    : "Reservar"}
                </button>
                {bookingState.status === "success" && (
                  <StatusMessage
                    variant="success"
                    title={bookingState.message}
                    meta={bookingMeta}
                  />
                )}
                {bookingState.status === "conflict" && (
                  <StatusMessage
                    variant="warning"
                    title={`${bookingState.message} Disponibilidad actualizada.`}
                    meta={bookingErrorMeta}
                  />
                )}
                {bookingState.status === "error" && (
                  <div className="stack">
                    <StatusMessage
                      variant={bookingErrorPresentation.variant}
                      title={bookingErrorPresentation.title}
                      meta={bookingErrorMeta}
                      role="alert"
                    />
                    {lastBookingPayload && (
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => submitBooking(lastBookingPayload)}
                      >
                        Reintentar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </form>
          )}
        </section>
        <section className="card full" aria-labelledby="admin-lectura">
          <div className="card-header">
            <div>
              <h2 id="admin-lectura">Admin (lectura)</h2>
              <p className="body">
                Consulta de reservas para la fecha seleccionada.
              </p>
            </div>
            <span
              className={`badge badge-${adminToken ? "ok" : "warn"}`}
              aria-live="polite"
            >
              {adminToken ? "Sesion admin activa" : "Sesion admin inactiva"}
            </span>
          </div>

          {!apiBaseUrl ? (
            <StatusMessage
              variant={missingApiVariant}
              title={missingApiTitle}
              meta={missingApiMeta}
              role="alert"
            />
          ) : (
            <div className="admin">
              {!adminToken ? (
                <form className="admin-login" onSubmit={handleAdminLogin}>
                  <div className="field">
                    <label htmlFor="admin-token">Token admin</label>
                    <input
                      id="admin-token"
                      type="password"
                      className="input"
                      value={adminInput}
                      onChange={(event) => setAdminInput(event.target.value)}
                      placeholder="Bearer token"
                    />
                  </div>
                  <button type="submit" className="button">
                    Entrar
                  </button>
                </form>
              ) : (
                <div className="admin-active">
                  <p className="meta">Fecha actual: {adminDate}</p>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="button"
                      onClick={loadAdminBookings}
                      disabled={adminState.status === "loading"}
                    >
                      {adminState.status === "loading"
                        ? "Cargando..."
                        : "Cargar reservas"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={handleAdminLogout}
                    >
                      Salir
                    </button>
                  </div>
                </div>
              )}

              {adminState.status === "loading" && (
                <p className="muted">Cargando reservas...</p>
              )}
              {adminState.status === "error" && (
                <div className="stack">
                  <StatusMessage
                    variant={adminErrorPresentation.variant}
                    title={adminErrorPresentation.title}
                    meta={adminErrorMeta}
                    role="alert"
                  />
                  {adminToken && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={loadAdminBookings}
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}
              {adminState.status === "empty" && (
                <p className="muted">Sin reservas para la fecha.</p>
              )}
              {adminState.status === "success" && (
                <div className="table" role="table" aria-live="polite">
                  <div className="table-head" role="row">
                    <span role="columnheader">Creada</span>
                    <span role="columnheader">Fecha</span>
                    <span role="columnheader">Slot</span>
                    <span role="columnheader">Nombre</span>
                    <span role="columnheader">Email</span>
                    <span role="columnheader">Estado</span>
                    <span role="columnheader">ID</span>
                  </div>
                  {adminState.items.map((reserva) => (
                    <div key={reserva.id} className="table-row" role="row">
                      <span role="cell">{formatDateTime(reserva.creadaEn)}</span>
                      <span role="cell">{adminDate}</span>
                      <span role="cell">{reserva.slotId || "-"}</span>
                      <span role="cell">{reserva.nombre || "-"}</span>
                      <span role="cell">{reserva.email || "-"}</span>
                      <span role="cell">{reserva.estado || "-"}</span>
                      <span role="cell" className="mono">
                        {reserva.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
