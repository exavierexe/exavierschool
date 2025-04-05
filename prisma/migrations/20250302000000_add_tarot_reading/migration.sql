-- CreateTable
CREATE TABLE "TarotReading" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "spreadType" TEXT NOT NULL,
    "cards" JSONB NOT NULL,
    "question" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "TarotReading_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TarotReading" ADD CONSTRAINT "TarotReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;