-- CreateEnum
CREATE TYPE "InternalMessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "internal_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "InternalMessagePriority" NOT NULL DEFAULT 'NORMAL',
    "readAt" TIMESTAMP(3),
    "archivedBySender" BOOLEAN NOT NULL DEFAULT false,
    "archivedByRecipient" BOOLEAN NOT NULL DEFAULT false,
    "deletedBySender" BOOLEAN NOT NULL DEFAULT false,
    "deletedByRecipient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internal_messages_recipientId_createdAt_idx" ON "internal_messages"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_messages_senderId_createdAt_idx" ON "internal_messages"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_messages_recipientId_readAt_idx" ON "internal_messages"("recipientId", "readAt");

-- AddForeignKey
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
