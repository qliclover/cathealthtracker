-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "weight" DOUBLE PRECISION,
    "birthday" TIMESTAMP(3),
    "arrival_date" TIMESTAMP(3),
    "usual_food" TEXT,
    "is_dewormed" BOOLEAN,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Cat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" SERIAL NOT NULL,
    "visit_date" TIMESTAMP(3),
    "hospital_name" TEXT,
    "vet_name" TEXT,
    "visit_reason" TEXT,
    "symptom_description" TEXT,
    "symptom_duration" TEXT,
    "doctor_notes" TEXT,
    "catId" INTEGER NOT NULL,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
