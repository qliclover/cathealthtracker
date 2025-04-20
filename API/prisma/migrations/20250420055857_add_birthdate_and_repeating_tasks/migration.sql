-- AlterTable
ALTER TABLE "CareTask" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "repeatInterval" INTEGER,
ADD COLUMN     "repeatType" TEXT;

-- AlterTable
ALTER TABLE "Cat" ADD COLUMN     "birthdate" TIMESTAMP(3);
