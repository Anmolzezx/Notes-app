-- CreateTable
CREATE TABLE "note_versions" (
    "id" UUID NOT NULL,
    "note_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_versions_note_id_version_no_idx" ON "note_versions"("note_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "note_versions_note_id_version_no_key" ON "note_versions"("note_id", "version_no");

-- AddForeignKey
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
