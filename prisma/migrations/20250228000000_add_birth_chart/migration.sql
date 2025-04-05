-- Update User table to match current schema
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uname" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "time" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "questions" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rtype" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "price" TEXT;
ALTER TABLE "User" DROP COLUMN IF EXISTS "Location";
ALTER TABLE "User" DROP COLUMN IF EXISTS "Questions";
ALTER TABLE "User" ALTER COLUMN "id" TYPE INTEGER USING (CASE WHEN "id" ~ E'^\\d+$' THEN "id"::integer ELSE 0 END);
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT nextval('user_id_seq');
CREATE SEQUENCE IF NOT EXISTS user_id_seq;
ALTER TABLE "User" ALTER COLUMN "birthday" TYPE TEXT;
ALTER TABLE "User" ADD PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "BirthChart" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthTime" TEXT NOT NULL,
    "birthPlace" TEXT NOT NULL,
    "ascendant" TEXT,
    "sun" TEXT,
    "moon" TEXT,
    "mercury" TEXT,
    "venus" TEXT,
    "mars" TEXT,
    "jupiter" TEXT,
    "saturn" TEXT,
    "uranus" TEXT,
    "neptune" TEXT,
    "pluto" TEXT,
    "houses" JSONB,
    "aspects" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "BirthChart_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BirthChart" ADD CONSTRAINT "BirthChart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;