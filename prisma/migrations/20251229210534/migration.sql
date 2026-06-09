/*
  Warnings:

  - The values [pending] on the enum `AvailabilityStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AvailabilityStatus_new" AS ENUM ('in', 'out', '');
ALTER TABLE "public"."availability" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "availability" ALTER COLUMN "status" TYPE "AvailabilityStatus_new" USING ("status"::text::"AvailabilityStatus_new");
ALTER TYPE "AvailabilityStatus" RENAME TO "AvailabilityStatus_old";
ALTER TYPE "AvailabilityStatus_new" RENAME TO "AvailabilityStatus";
DROP TYPE "public"."AvailabilityStatus_old";
ALTER TABLE "availability" ALTER COLUMN "status" SET DEFAULT '';
COMMIT;

-- AlterEnum
ALTER TYPE "Qualifications" ADD VALUE 'B85';

-- AlterTable
ALTER TABLE "availability" ALTER COLUMN "status" SET DEFAULT '';

-- AlterTable
ALTER TABLE "firefighters" ALTER COLUMN "qualifications" SET DEFAULT ARRAY[]::"Qualifications"[];
