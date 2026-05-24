-- AlterTable
ALTER TABLE "public"."Subject"
ADD COLUMN "price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill legacy records so existing subject cards keep their previous visible price.
UPDATE "public"."Subject" s
SET "price" = COALESCE((
	SELECT MAX(l."price")
	FROM "public"."Lecture" l
	WHERE l."subjectId" = s."id"
), 0);
