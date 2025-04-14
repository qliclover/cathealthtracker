/*
  Warnings:

  - You are about to drop the column `arrival_date` on the `Cat` table. All the data in the column will be lost.
  - You are about to drop the column `birthday` on the `Cat` table. All the data in the column will be lost.
  - You are about to drop the column `is_dewormed` on the `Cat` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Cat` table. All the data in the column will be lost.
  - You are about to drop the column `usual_food` on the `Cat` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_notes` on the `HealthRecord` table. All the data in the column will be lost.
  - You are about to drop the column `hospital_name` on the `HealthRecord` table. All the data in the column will be lost.
  - You are about to drop the column `symptom_description` on the `HealthRecord` table. All the data in the column will be lost.
  - You are about to drop the column `symptom_duration` on the `HealthRecord` table. All the data in the column will be lost.
  - You are about to drop the column `vet_name` on the `HealthRecord` table. All the data in the column will be lost.
  - You are about to drop the column `visit_date` on the `HealthRecord` table. All the data in the column will be lost.
  - You are about to drop the column `visit_reason` on the `HealthRecord` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - Added the required column `breed` to the `Cat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Cat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Cat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `HealthRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `HealthRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `HealthRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `HealthRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "Cat" DROP COLUMN "arrival_date",
DROP COLUMN "birthday",
DROP COLUMN "is_dewormed",
DROP COLUMN "userId",
DROP COLUMN "usual_food",
ADD COLUMN     "breed" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ownerId" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "HealthRecord" DROP COLUMN "doctor_notes",
DROP COLUMN "hospital_name",
DROP COLUMN "symptom_description",
DROP COLUMN "symptom_duration",
DROP COLUMN "vet_name",
DROP COLUMN "visit_date",
DROP COLUMN "visit_reason",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "username",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
