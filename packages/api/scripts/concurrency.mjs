const DEFAULT_BASE_URL = "http://localhost:4000";
const DEFAULT_CONCURRENCY = 20;
const TIMEOUT_MS = 12000;
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const buildTimeout = (controller) => {
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return () => clearTimeout(timeout);
};

const fetchJson = async (url, options = {}) => {
  const controller = new AbortController();
  const clear = buildTimeout(controller);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      const parseError = new Error("Respuesta JSON invalida.");
      parseError.cause = error;
      throw parseError;
    }
    return { response, data };
  } finally {
    clear();
  }
};

const formatDateInZone = (date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
};

const parseDateString = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const addDays = (dateString, days) => {
  const base = parseDateString(dateString);
  if (!base) {
    return null;
  }
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const getSlotIdFromItem = (slot) => {
  if (!slot || typeof slot !== "object") {
    return null;
  }
  if (typeof slot.slotId === "string") {
    return slot.slotId;
  }
  if (typeof slot.id === "string") {
    return slot.id;
  }
  return null;
};

const getEstado = (slot) => {
  if (!slot || typeof slot !== "object") {
    return "";
  }
  const estado = typeof slot.estado === "string" ? slot.estado : "";
  const status = typeof slot.status === "string" ? slot.status : "";
  return (estado || status).toLowerCase();
};

const extractSlots = (payload) => {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  if (Array.isArray(payload.slots)) {
    return payload.slots;
  }
  if (payload.data && Array.isArray(payload.data.slots)) {
    return payload.data.slots;
  }
  return [];
};

const findDisponible = (slots) => {
  for (const slot of slots) {
    const estado = getEstado(slot);
    if (estado === "disponible") {
      const slotId = getSlotIdFromItem(slot);
      if (slotId) {
        return slotId;
      }
    }
  }
  return null;
};

const getEnvNumber = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const printLine = (label, value) => {
  console.log(`${label}: ${value}`);
};

const main = async () => {
  const baseUrl = (process.env.API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const concurrency = getEnvNumber(process.env.CONCURRENCY, DEFAULT_CONCURRENCY);
  const envDate = process.env.DATE?.trim();
  let targetDate = envDate || formatDateInZone(new Date());

  if (envDate && !parseDateString(envDate)) {
    console.error("DATE debe tener formato YYYY-MM-DD.");
    process.exit(1);
    return;
  }

  const tryAvailability = async (date) => {
    const url = `${baseUrl}/api/disponibilidad?fecha=${encodeURIComponent(date)}`;
    const { response, data } = await fetchJson(url);
    if (!response.ok) {
      throw new Error(`Disponibilidad fallo con status ${response.status}.`);
    }
    const slots = extractSlots(data);
    return { slots, date };
  };

  let disponibilidad;
  try {
    disponibilidad = await tryAvailability(targetDate);
  } catch (error) {
    console.error("No se pudo consultar disponibilidad:", error.message);
    process.exit(1);
    return;
  }

  let slotId = findDisponible(disponibilidad.slots);

  if (!slotId && !envDate) {
    const tomorrow = addDays(targetDate, 1);
    if (tomorrow) {
      try {
        disponibilidad = await tryAvailability(tomorrow);
        targetDate = tomorrow;
        slotId = findDisponible(disponibilidad.slots);
      } catch (error) {
        console.error("No se pudo consultar disponibilidad para manana:", error.message);
        process.exit(1);
        return;
      }
    }
  }

  if (!slotId) {
    console.error("No hay slots disponibles para la fecha solicitada.");
    process.exit(1);
    return;
  }

  const body = {
    slotId,
    nombre: "Prueba Concurrencia",
    contacto: {
      email: "qa@bookingpro.local",
      telefono: "+540000000000"
    }
  };

  const requests = Array.from({ length: concurrency }, () => {
    const controller = new AbortController();
    const clear = buildTimeout(controller);

    return fetch(`${baseUrl}/api/reservas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
      .then(async (response) => {
        clear();
        return { status: response.status, response };
      })
      .catch((error) => {
        clear();
        return { status: "error", error };
      });
  });

  const results = await Promise.allSettled(requests);
  let count201 = 0;
  let count409 = 0;
  let countOther = 0;
  const breakdown = new Map();
  const samples = [];

  const registerOther = (key, sample) => {
    breakdown.set(key, (breakdown.get(key) || 0) + 1);
    countOther += 1;
    if (sample && samples.length < 3) {
      samples.push(sample);
    }
  };

  for (const result of results) {
    if (result.status !== "fulfilled") {
      registerOther("error", `Fallo al ejecutar request: ${result.reason?.message || "error desconocido"}`);
      continue;
    }

    const value = result.value;
    if (value.status === 201) {
      count201 += 1;
      continue;
    }
    if (value.status === 409) {
      count409 += 1;
      continue;
    }

    if (value.status === "error") {
      const message = value.error?.name === "AbortError" ? "timeout" : value.error?.message;
      registerOther("error", `Error de red: ${message || "error desconocido"}`);
      continue;
    }

    const statusKey = String(value.status);
    let sample = null;
    try {
      const text = await value.response.text();
      if (text) {
        sample = `Status ${statusKey}: ${text.slice(0, 200)}`;
      } else {
        sample = `Status ${statusKey}: sin cuerpo`;
      }
    } catch (error) {
      sample = `Status ${statusKey}: error al leer cuerpo`;
    }
    registerOther(statusKey, sample);
  }

  printLine("Target", `${baseUrl} | Fecha ${targetDate} | Slot ${slotId}`);
  printLine("Concurrent requests", concurrency);
  printLine("Results", `201:${count201}, 409:${count409}, other:${countOther}`);

  if (countOther > 0) {
    const breakdownText = Array.from(breakdown.entries())
      .map(([key, value]) => `${key}:${value}`)
      .join(", ");
    printLine("Breakdown", breakdownText);
    if (samples.length > 0) {
      printLine("Muestras", samples.join(" | "));
    }
  }

  const pass = count201 === 1 && count409 === concurrency - 1 && countOther === 0;
  printLine("Final", pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 1);
};

main().catch((error) => {
  console.error("Error inesperado:", error.message);
  process.exit(1);
});
