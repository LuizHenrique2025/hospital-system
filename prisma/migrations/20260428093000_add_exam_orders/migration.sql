-- CreateEnum
CREATE TYPE "ExamOrderStatus" AS ENUM ('REQUESTED', 'AUTHORIZATION_PENDING', 'AUTHORIZED', 'IN_PROGRESS', 'RESULT_READY', 'CANCELED');

-- CreateTable
CREATE TABLE "exam_orders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requesterDoctorId" TEXT,
    "appointmentId" TEXT,
    "status" "ExamOrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "priority" TEXT,
    "clinicalIndication" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_order_items" (
    "id" TEXT NOT NULL,
    "examOrderId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ExamOrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_orders_patientId_idx" ON "exam_orders"("patientId");

-- CreateIndex
CREATE INDEX "exam_orders_requesterDoctorId_idx" ON "exam_orders"("requesterDoctorId");

-- CreateIndex
CREATE INDEX "exam_orders_status_idx" ON "exam_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "exam_order_items_examOrderId_procedureId_key" ON "exam_order_items"("examOrderId", "procedureId");

-- AddForeignKey
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_requesterDoctorId_fkey" FOREIGN KEY ("requesterDoctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_order_items" ADD CONSTRAINT "exam_order_items_examOrderId_fkey" FOREIGN KEY ("examOrderId") REFERENCES "exam_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_order_items" ADD CONSTRAINT "exam_order_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
