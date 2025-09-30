-- AlterTable
ALTER TABLE "public"."Post"
  ADD COLUMN IF NOT EXISTS "authorToken" TEXT;

-- Add unique constraint only if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Post_authorToken_key'
  ) THEN
    ALTER TABLE "public"."Post"
      ADD CONSTRAINT "Post_authorToken_key" UNIQUE ("authorToken");
  END IF;
END;
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."Comment" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "parentId" TEXT,
  "contentMd" TEXT NOT NULL,
  "authorAlias" TEXT,
  "authorToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Comment_postId_fkey'
  ) THEN
    ALTER TABLE "public"."Comment"
      ADD CONSTRAINT "Comment_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "public"."Post"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Comment_parentId_fkey'
  ) THEN
    ALTER TABLE "public"."Comment"
      ADD CONSTRAINT "Comment_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END;
$$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Comment_authorToken_key" ON "public"."Comment"("authorToken");
CREATE INDEX IF NOT EXISTS "Comment_postId_idx" ON "public"."Comment"("postId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "public"."Comment"("parentId");
