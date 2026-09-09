-- AlterTable
ALTER TABLE "RequirementQuestion" ADD COLUMN     "allowCustomAnswer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "options" JSONB;
