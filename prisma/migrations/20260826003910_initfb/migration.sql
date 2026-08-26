/*
  Warnings:

  - Added the required column `emailVerified` to the `admin_user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admin_user" DROP COLUMN "emailVerified",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL;
