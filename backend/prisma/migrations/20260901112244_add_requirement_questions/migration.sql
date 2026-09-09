/*
  Warnings:

  - You are about to drop the column `impact` on the `RequirementQuestion` table. All the data in the column will be lost.
  - Added the required column `requirementId` to the `RequirementQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RequirementQuestion" DROP CONSTRAINT "RequirementQuestion_gapId_fkey";

-- AlterTable
ALTER TABLE "RequirementQuestion" DROP COLUMN "impact",
ADD COLUMN     "answer" TEXT,
ADD COLUMN     "requirementId" TEXT NOT NULL,
ALTER COLUMN "gapId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "RequirementQuestion_requirementId_idx" ON "RequirementQuestion"("requirementId");

-- AddForeignKey
ALTER TABLE "RequirementQuestion" ADD CONSTRAINT "RequirementQuestion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementQuestion" ADD CONSTRAINT "RequirementQuestion_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "RequirementGap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
