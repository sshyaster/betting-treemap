-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "toolType" TEXT NOT NULL,
    "points" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoSnapshot" (
    "id" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION NOT NULL,
    "change24h" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "volume24hr" DOUBLE PRECISION NOT NULL,
    "volume1wk" DOUBLE PRECISION NOT NULL,
    "volume1mo" DOUBLE PRECISION NOT NULL,
    "volumeAll" DOUBLE PRECISION NOT NULL,
    "openInterest" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Drawing_userId_coinId_interval_idx" ON "Drawing"("userId", "coinId", "interval");

-- CreateIndex
CREATE INDEX "CryptoSnapshot_coinId_snapshotAt_idx" ON "CryptoSnapshot"("coinId", "snapshotAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoSnapshot_coinId_snapshotAt_key" ON "CryptoSnapshot"("coinId", "snapshotAt");

-- CreateIndex
CREATE INDEX "MarketSnapshot_platform_snapshotAt_idx" ON "MarketSnapshot"("platform", "snapshotAt");

-- CreateIndex
CREATE INDEX "MarketSnapshot_marketId_snapshotAt_idx" ON "MarketSnapshot"("marketId", "snapshotAt");
