-- CreateEnum
CREATE TYPE "OnboardingIntent" AS ENUM ('PERSONAL', 'TEAM');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OnboardingPlan" AS ENUM ('FREE', 'PRO', 'MAX');

-- AlterTable
ALTER TABLE "MagicLink" ADD COLUMN     "codeHash" TEXT,
ADD COLUMN     "isNewUser" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptedTermsAt" TIMESTAMP(3),
ADD COLUMN     "consentToImprove" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingIntent" "OnboardingIntent",
ADD COLUMN     "onboardingPlan" "OnboardingPlan",
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateIndex
CREATE INDEX "MagicLink_codeHash_idx" ON "MagicLink"("codeHash");
