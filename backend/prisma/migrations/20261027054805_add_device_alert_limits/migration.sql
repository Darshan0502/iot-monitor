-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "humidity_max" DOUBLE PRECISION,
ADD COLUMN     "humidity_min" DOUBLE PRECISION,
ADD COLUMN     "temperature_max" DOUBLE PRECISION,
ADD COLUMN     "temperature_min" DOUBLE PRECISION;
