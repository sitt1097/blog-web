/*
  Warnings:

  - You are about to drop the column `content` on the `Post` table. All the data in the column will be lost.
  - Added the required column `contentMd` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Post" DROP COLUMN "content",
ADD COLUMN     "contentMd" TEXT NOT NULL,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);
