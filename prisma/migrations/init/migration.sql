-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('in', 'out', 'pending');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('12hr', '24hr', '48hr');

-- CreateEnum
CREATE TYPE "Qualifications" AS ENUM ('EMT', 'C89', 'DPO', 'DAO');

-- CreateEnum
CREATE TYPE "FirefighterRank" AS ENUM ('DOT', 'ROOKIE', 'RELEASED', 'SENIOR', 'CAPTAIN');

-- CreateTable
CREATE TABLE "firefighters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rank" "FirefighterRank" NOT NULL,
    "qualifications" "Qualifications"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firefighters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" SERIAL NOT NULL,
    "shift_date" DATE NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" TEXT NOT NULL,
    "firefighter_id" INTEGER NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'pending',
    "cover_firefighter_id" TEXT,
    "cover_rank" TEXT,
    "cover_qualifications" "Qualifications"[],
    "training_suggestion" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shifts_shift_date_shift_type_key" ON "shifts"("shift_date", "shift_type");

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_firefighter_id_fkey" FOREIGN KEY ("firefighter_id") REFERENCES "firefighters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

