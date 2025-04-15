-- CreateTable
CREATE TABLE "TimeZone" (
    "id" SERIAL NOT NULL,
    "zoneName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "zoneType" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "utcOffset" INTEGER NOT NULL,
    "isDst" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeZone_zoneName_key" ON "TimeZone"("zoneName");

-- CreateIndex
CREATE INDEX "TimeZone_countryCode_idx" ON "TimeZone"("countryCode");

-- CreateIndex
CREATE INDEX "TimeZone_zoneName_idx" ON "TimeZone"("zoneName");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_code_idx" ON "Country"("code");
