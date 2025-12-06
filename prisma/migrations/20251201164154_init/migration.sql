-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'pro', 'business');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('document', 'image');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'free',
    "subscription_start" TIMESTAMP(3),
    "subscription_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_materials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "material_type" "MaterialType" NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "parsed_content" JSONB,
    "is_parsed" BOOLEAN NOT NULL DEFAULT false,
    "parsed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kos_personas" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "domain_tags" JSONB NOT NULL DEFAULT '[]',
    "professional_background" JSONB,
    "expression_style" JSONB NOT NULL,
    "audience_relation" JSONB,
    "professional_preferences" JSONB,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "template_category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kos_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_packs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image_styles" JSONB NOT NULL,
    "tone" TEXT NOT NULL,
    "layout_reference" TEXT,
    "recommended_tags" JSONB NOT NULL DEFAULT '[]',
    "is_builtin" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_generations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_material_id" UUID NOT NULL,
    "kos_persona_id" UUID NOT NULL,
    "style_pack_id" UUID NOT NULL,
    "platforms" JSONB NOT NULL,
    "content_pack" JSONB NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "content_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "news_title" TEXT NOT NULL,
    "news_source" TEXT NOT NULL,
    "news_url" TEXT NOT NULL,
    "hot_keywords" JSONB NOT NULL DEFAULT '[]',
    "recommended_product_id" UUID,
    "recommended_persona_id" UUID,
    "recommended_platforms" JSONB NOT NULL DEFAULT '[]',
    "best_publish_time" TIMESTAMP(3) NOT NULL,
    "relevance_score" DECIMAL(3,2) NOT NULL,
    "content_preview" JSONB,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kos_personas" ADD CONSTRAINT "kos_personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_product_material_id_fkey" FOREIGN KEY ("product_material_id") REFERENCES "product_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_kos_persona_id_fkey" FOREIGN KEY ("kos_persona_id") REFERENCES "kos_personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_style_pack_id_fkey" FOREIGN KEY ("style_pack_id") REFERENCES "style_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recommended_product_id_fkey" FOREIGN KEY ("recommended_product_id") REFERENCES "product_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recommended_persona_id_fkey" FOREIGN KEY ("recommended_persona_id") REFERENCES "kos_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
