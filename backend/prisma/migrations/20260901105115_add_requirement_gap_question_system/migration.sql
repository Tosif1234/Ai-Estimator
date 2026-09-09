-- CreateEnum
CREATE TYPE "GapPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "GapStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "QuestionPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'ANSWERED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "completenessScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RequirementGap" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "GapPriority" NOT NULL,
    "status" "GapStatus" NOT NULL DEFAULT 'OPEN',
    "moduleName" TEXT,
    "impact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementQuestion" (
    "id" TEXT NOT NULL,
    "gapId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "priority" "QuestionPriority" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "moduleName" TEXT,
    "impact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequirementGap_requirementId_idx" ON "RequirementGap"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementGap_status_idx" ON "RequirementGap"("status");

-- CreateIndex
CREATE INDEX "RequirementGap_priority_idx" ON "RequirementGap"("priority");

-- CreateIndex
CREATE INDEX "RequirementQuestion_gapId_idx" ON "RequirementQuestion"("gapId");

-- CreateIndex
CREATE INDEX "RequirementQuestion_status_idx" ON "RequirementQuestion"("status");

-- CreateIndex
CREATE INDEX "RequirementQuestion_priority_idx" ON "RequirementQuestion"("priority");

-- CreateIndex
CREATE INDEX "RequirementAnswer_questionId_idx" ON "RequirementAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "RequirementGap" ADD CONSTRAINT "RequirementGap_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementQuestion" ADD CONSTRAINT "RequirementQuestion_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "RequirementGap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementAnswer" ADD CONSTRAINT "RequirementAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RequirementQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
