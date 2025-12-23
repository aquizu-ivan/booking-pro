import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const SLOT_HOURS = [10, 12, 14, 16, 18];
const SLOT_DURATION_MINUTES = 30;
const DAYS_TO_SEED = 7;

const formatDateInZone = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);

const parseDateString = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
};

const toDateOnlyUtc = (value) => {
  const parts = parseDateString(value);
  if (!parts) {
    return null;
  }
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
};

const addDays = (dateString, days) => {
  const parts = parseDateString(dateString);
  if (!parts) {
    return null;
  }
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const getTimeZoneOffsetMinutes = (date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = formatter
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
};

const getZonedDateTime = (dateString, hour, minute) => {
  const parts = parseDateString(dateString);
  if (!parts) {
    return null;
  }
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute)
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess);
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute) -
      offsetMinutes * 60000
  );
};

const buildSlotsForDate = (dateString) => {
  const fecha = toDateOnlyUtc(dateString);
  if (!fecha) {
    return [];
  }
  return SLOT_HOURS.map((hour) => {
    const inicio = getZonedDateTime(dateString, hour, 0);
    if (!inicio) {
      return null;
    }
    const fin = new Date(inicio.getTime() + SLOT_DURATION_MINUTES * 60000);
    return {
      fecha,
      inicio,
      fin,
      activo: true
    };
  }).filter(Boolean);
};

const main = async () => {
  const today = formatDateInZone(new Date());
  const dates = Array.from({ length: DAYS_TO_SEED }, (_, index) => addDays(today, index))
    .filter(Boolean);

  let daysCreated = 0;
  let slotsCreated = 0;
  let slotsExisting = 0;

  for (const dateString of dates) {
    const slots = buildSlotsForDate(dateString);
    if (slots.length === 0) {
      continue;
    }

    const fecha = slots[0].fecha;
    const existing = await prisma.slot.findMany({
      where: { fecha },
      select: { inicio: true }
    });

    const existingSet = new Set(existing.map((slot) => slot.inicio.getTime()));
    const missing = slots.filter(
      (slot) => !existingSet.has(slot.inicio.getTime())
    );

    slotsExisting += slots.length - missing.length;

    if (missing.length > 0) {
      const result = await prisma.slot.createMany({
        data: missing,
        skipDuplicates: true
      });
      if (result.count > 0) {
        daysCreated += 1;
      }
      slotsCreated += result.count;
    }
  }

  console.log("Seed finalizado.");
  console.log(`Dias creados: ${daysCreated}`);
  console.log(`Slots creados: ${slotsCreated}`);
  console.log(`Slots existentes: ${slotsExisting}`);
};

main()
  .catch((error) => {
    console.error("Error al ejecutar seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
