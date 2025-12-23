import { useCallback, useEffect, useMemo, useState } from "react";
import {
  API_BASE_URL,
  createBooking,
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

export default function App() {
  const apiBaseUrl = API_BASE_URL;
  const healthUrl = apiBaseUrl ? `${apiBaseUrl}/health` : "";
  const apiLabel =
    apiBaseUrl.length > 48 ? `${apiBaseUrl.slice(0, 45)}...` : apiBaseUrl;

  const [healthState, setHealthState] = useState({
    status: "idle",
    message: ""
  });
  const [servicesState, setServicesState] = useState({
    status: "idle",
    items: [],
    message: ""
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
    message: ""
  });
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [name, setName] = useState(() => readStorage(STORAGE_KEYS.name));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingState, setBookingState] = useState({
    status: "idle",
    message: "",
    booking: null
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

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    let active = true;
    setServicesState({ status: "loading", items: [], message: "" });
    getServices().then((result) => {
      if (!active) {
        return;
      }
      if (result.ok) {
        const services = normalizeServices(result.data);
        if (services.length === 0) {
          setServicesState({
            status: "empty",
            items: [],
            message: "Sin servicios disponibles."
          });
        } else {
          setServicesState({ status: "success", items: services, message: "" });
        }
      } else {
        setServicesState({
          status: "error",
          items: [],
          message: result.error.message
        });
      }
    });

    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

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
        message: "Selecciona una fecha valida."
      });
      return;
    }

    setAvailabilityState({ status: "loading", items: [], message: "" });
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
          message: "Sin horarios disponibles."
        });
      } else {
        setAvailabilityState({ status: "success", items: slots, message: "" });
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
        message: result.error.message
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
      return { label: "API no configurada", kind: "warn" };
    }
    if (healthState.status === "ok") {
      return { label: "API viva", kind: "ok" };
    }
    if (healthState.status === "error") {
      return { label: "API no disponible", kind: "error" };
    }
    return { label: "Chequeando API", kind: "idle" };
  }, [apiBaseUrl, healthState.status]);

  const handleBooking = async (event) => {
    event.preventDefault();
    if (!selectedSlotId) {
      setBookingState({
        status: "error",
        message: "Selecciona un horario disponible.",
        booking: null
      });
      return;
    }
    if (!name.trim()) {
      setBookingState({
        status: "error",
        message: "Ingresa tu nombre.",
        booking: null
      });
      return;
    }
    if (!email.trim()) {
      setBookingState({
        status: "error",
        message: "Ingresa tu email.",
        booking: null
      });
      return;
    }

    setBookingState({ status: "loading", message: "", booking: null });
    const result = await createBooking({
      serviceId,
      slotId: selectedSlotId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      date
    });

    if (result.ok) {
      const booking = extractBooking(result.data);
      setBookingState({
        status: "success",
        message: "Reserva confirmada.",
        booking
      });
      return;
    }

    if (result.error.kind === "conflict" || result.error.status === 409) {
      setBookingState({
        status: "conflict",
        message: result.error.message || "El horario ya no esta disponible.",
        booking: null
      });
      await loadAvailability();
      return;
    }

    setBookingState({
      status: "error",
      message: result.error.message,
      booking: null
    });
  };

  const bookingSummary = bookingState.booking;

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
            <div className="stack">
              <h3 className="status-title">API no configurada</h3>
              <p className="muted">
                Configurar VITE_API_BASE_URL en el entorno de build de GitHub
                Pages.
              </p>
            </div>
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
                Flujo observable: servicio → fecha → disponibilidad → reserva.
              </p>
            </div>
            <span className={`badge badge-${healthBadge.kind}`}>
              {healthBadge.label}
            </span>
          </div>

          {!apiBaseUrl ? (
            <p className="muted">
              Configura VITE_API_BASE_URL para habilitar el flujo.
            </p>
          ) : (
            <form className="flow" onSubmit={handleBooking}>
              <div className="field">
                <label htmlFor="service">Servicio</label>
                {servicesState.status === "loading" && (
                  <p className="muted">Cargando servicios...</p>
                )}
                {servicesState.status === "error" && (
                  <p className="error">{servicesState.message}</p>
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
              </div>

              <div className="field">
                <label>Disponibilidad</label>
                {availabilityState.status === "loading" && (
                  <p className="muted">Cargando horarios...</p>
                )}
                {availabilityState.status === "error" && (
                  <p className="error">{availabilityState.message}</p>
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
                            {formatTime(slot.inicio)}–{formatTime(slot.fin)}
                          </span>
                          <span className="slot-status">
                            {slot.available ? "Disponible" : "Ocupado"}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={loadAvailability}
                >
                  Refrescar disponibilidad
                </button>
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
                  <p className="success">
                    {bookingState.message}
                    {bookingSummary?.id && (
                      <span> ID: {bookingSummary.id}</span>
                    )}
                  </p>
                )}
                {bookingState.status === "conflict" && (
                  <p className="warning">
                    {bookingState.message} Se actualizo la disponibilidad.
                  </p>
                )}
                {bookingState.status === "error" && (
                  <p className="error">{bookingState.message}</p>
                )}
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
