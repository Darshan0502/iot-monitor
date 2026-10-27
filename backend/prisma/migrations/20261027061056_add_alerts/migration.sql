-- CreateEnum
CREATE TYPE "alert_type" AS ENUM ('TEMPERATURE_HIGH', 'TEMPERATURE_LOW', 'HUMIDITY_HIGH', 'HUMIDITY_LOW', 'OFFLINE');

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "type" "alert_type" NOT NULL,
    "value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_device_id_resolved_at_idx" ON "alerts"("device_id", "resolved_at");

-- CreateIndex
CREATE INDEX "alerts_started_at_idx" ON "alerts"("started_at" DESC);

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
