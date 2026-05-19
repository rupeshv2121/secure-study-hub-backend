-- AlterTable
ALTER TABLE "public"."Subject" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "Subject_categoryId_idx" ON "public"."Subject"("categoryId");

-- AddForeignKey
ALTER TABLE "public"."Subject" ADD CONSTRAINT "Subject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;