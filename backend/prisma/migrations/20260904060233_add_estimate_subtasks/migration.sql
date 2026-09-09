-- CreateTable
CREATE TABLE "EstimateItemSubtask" (
    "id" TEXT NOT NULL,
    "estimateItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateItemSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstimateItemSubtask_estimateItemId_idx" ON "EstimateItemSubtask"("estimateItemId");

-- AddForeignKey
ALTER TABLE "EstimateItemSubtask" ADD CONSTRAINT "EstimateItemSubtask_estimateItemId_fkey" FOREIGN KEY ("estimateItemId") REFERENCES "EstimateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
