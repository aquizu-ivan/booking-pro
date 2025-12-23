import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const buildSlots = (baseDate: Date) => {
  const slots = [];
  const startHour = 9;
  const endHour = 12;
  const intervalMinutes = 30;
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const day = baseDate.getUTCDate();

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += intervalMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const inicio = new Date(Date.UTC(year, month, day, hour, minute));
    const fin = new Date(inicio.getTime() + intervalMinutes * 60 * 1000);

    slots.push({
      fecha: baseDate,
      inicio,
      fin,
      activo: true
    });
  }

  return slots;
};

const main = async () => {
  const now = new Date();
  const baseDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  const slots = buildSlots(baseDate);

  await prisma.slot.createMany({
    data: slots,
    skipDuplicates: true
  });
};

main()
  .catch(async (error) => {
    console.error("Error al ejecutar el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
