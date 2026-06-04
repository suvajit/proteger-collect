-- AlterTable
ALTER TABLE "check_entries" ADD COLUMN     "is_resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolution_photo_url" TEXT,
ADD COLUMN     "resolution_remark" TEXT,
ADD COLUMN     "resolved_at" TIMESTAMP(3);
