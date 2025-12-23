-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Slot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fecha" DATE NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL,
    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slotId" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "estado" "EstadoReserva" NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Slot_fecha_inicio_key" ON "Slot"("fecha", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_slotId_key" ON "Reserva"("slotId");

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
