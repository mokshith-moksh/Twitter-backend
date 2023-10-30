/*
  Warnings:

  - The primary key for the `Likes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `Likes` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Likes` table. All the data in the column will be lost.
  - Made the column `tweetId` on table `Likes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Likes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Likes" DROP CONSTRAINT "Likes_tweetId_fkey";

-- DropForeignKey
ALTER TABLE "Likes" DROP CONSTRAINT "Likes_userId_fkey";

-- AlterTable
ALTER TABLE "Likes" DROP CONSTRAINT "Likes_pkey",
DROP COLUMN "created_at",
DROP COLUMN "id",
ALTER COLUMN "tweetId" SET NOT NULL,
ALTER COLUMN "userId" SET NOT NULL,
ADD CONSTRAINT "Likes_pkey" PRIMARY KEY ("tweetId", "userId");

-- AddForeignKey
ALTER TABLE "Likes" ADD CONSTRAINT "Likes_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Likes" ADD CONSTRAINT "Likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
