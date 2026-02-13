-- AlterTable
-- Add encrypted column for Telegram bot tokens
ALTER TABLE "Instance" ADD COLUMN IF NOT EXISTS "encryptedTelegramBotToken" TEXT;

-- Note: Data migration will be handled by a separate script
-- Old telegramBotToken column will be dropped in a future migration after data is migrated
