-- CreateTable
CREATE TABLE "readings" (
    "id" BIGSERIAL NOT NULL,
    "device_id" UUID NOT NULL,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "readings_device_id_recorded_at_idx" ON "readings"("device_id", "recorded_at" DESC);

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
