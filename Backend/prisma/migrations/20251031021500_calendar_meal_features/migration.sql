-- AlterTable
-- CreateTable
CREATE TABLE "CalendarAccount" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"provider" TEXT NOT NULL,
	"externalId" TEXT NOT NULL,
	"email" TEXT,
	"label" TEXT,
	"accessTokenEnc" TEXT NOT NULL,
	"refreshTokenEnc" TEXT,
	"expiresAt" TIMESTAMP(3),
	"lastSyncedAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "CalendarAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
	"id" TEXT NOT NULL,
	"countryCode" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"date" TIMESTAMP(3) NOT NULL,
	"type" TEXT,
	"rawPayload" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
	"id" TEXT NOT NULL,
	"accountId" TEXT,
	"userId" TEXT NOT NULL,
	"externalId" TEXT,
	"summary" TEXT,
	"description" TEXT,
	"startsAt" TIMESTAMP(3) NOT NULL,
	"endsAt" TIMESTAMP(3) NOT NULL,
	"location" TEXT,
	"source" TEXT,
	"isHoliday" BOOLEAN NOT NULL DEFAULT false,
	"isMeal" BOOLEAN NOT NULL DEFAULT false,
	"metadata" JSONB,
	"holidayId" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanTemplate" (
	"id" TEXT NOT NULL,
	"dateKey" TEXT NOT NULL,
	"type" TEXT NOT NULL DEFAULT 'standard',
	"calories" INTEGER,
	"macros" JSONB,
	"courses" JSONB NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "MealPlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMealOverride" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"dateKey" TEXT NOT NULL,
	"holidayId" TEXT,
	"courses" JSONB NOT NULL,
	"calories" INTEGER,
	"macros" JSONB,
	"notes" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "UserMealOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"timezone" TEXT NOT NULL DEFAULT 'UTC',
	"locale" TEXT NOT NULL DEFAULT 'en-US',
	"dietaryRestrictions" JSONB,
	"caloricGoal" INTEGER,
	"macros" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarAccount_provider_externalId_key" ON "CalendarAccount"("provider", "externalId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startsAt_idx" ON "CalendarEvent"("userId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_accountId_externalId_key" ON "CalendarEvent"("accountId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_countryCode_date_name_key" ON "Holiday"("countryCode", "date", "name");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanTemplate_dateKey_type_key" ON "MealPlanTemplate"("dateKey", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserMealOverride_userId_dateKey_holidayId_key" ON "UserMealOverride"("userId", "dateKey", "holidayId");

-- CreateIndex
CREATE INDEX "UserMealOverride_userId_dateKey_idx" ON "UserMealOverride"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- AddForeignKey
ALTER TABLE "CalendarAccount" ADD CONSTRAINT "CalendarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CalendarAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_holidayId_fkey" FOREIGN KEY ("holidayId") REFERENCES "Holiday"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMealOverride" ADD CONSTRAINT "UserMealOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMealOverride" ADD CONSTRAINT "UserMealOverride_holidayId_fkey" FOREIGN KEY ("holidayId") REFERENCES "Holiday"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
