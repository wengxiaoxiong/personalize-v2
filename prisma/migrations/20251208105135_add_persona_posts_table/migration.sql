-- CreateTable
CREATE TABLE "persona_posts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "raw_data" JSONB NOT NULL,
    "nickname" TEXT,
    "red_id" TEXT,
    "avatar" TEXT,
    "description" TEXT,
    "feed_count" INTEGER,
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "persona_posts_user_id_idx" ON "persona_posts"("user_id");

-- CreateIndex
CREATE INDEX "persona_posts_red_id_idx" ON "persona_posts"("red_id");

-- AddForeignKey
ALTER TABLE "persona_posts" ADD CONSTRAINT "persona_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
