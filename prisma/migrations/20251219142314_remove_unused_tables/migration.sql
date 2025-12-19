-- DropForeignKey
ALTER TABLE "content_generations" DROP CONSTRAINT "content_generations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "content_generations" DROP CONSTRAINT "content_generations_product_material_id_fkey";

-- DropForeignKey
ALTER TABLE "content_generations" DROP CONSTRAINT "content_generations_kos_persona_id_fkey";

-- DropForeignKey
ALTER TABLE "content_generations" DROP CONSTRAINT "content_generations_style_pack_id_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_recommended_product_id_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_recommended_persona_id_fkey";

-- DropForeignKey
ALTER TABLE "product_materials" DROP CONSTRAINT "product_materials_user_id_fkey";

-- DropTable
DROP TABLE "content_generations";

-- DropTable
DROP TABLE "recommendations";

-- DropTable
DROP TABLE "style_packs";

-- DropTable
DROP TABLE "product_materials";

-- DropTable
DROP TABLE "persona_posts";

-- DropEnum
DROP TYPE "MaterialType";

-- DropEnum
DROP TYPE "GenerationStatus";
