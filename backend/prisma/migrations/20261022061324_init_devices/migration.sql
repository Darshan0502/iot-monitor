-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "last_seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_key" ON "devices"("serial");
