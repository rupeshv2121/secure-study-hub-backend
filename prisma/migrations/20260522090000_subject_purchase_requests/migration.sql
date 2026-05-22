ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "screenshotPath" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "adminNote" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

ALTER TABLE "Purchase" ALTER COLUMN "lectureId" DROP NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Purchase" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Purchase_subjectId_fkey'
  ) THEN
    ALTER TABLE "Purchase"
      ADD CONSTRAINT "Purchase_subjectId_fkey"
      FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Purchase_reviewedById_fkey'
  ) THEN
    ALTER TABLE "Purchase"
      ADD CONSTRAINT "Purchase_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;