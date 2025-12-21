/**
 * Server Actions 测试用例
 *
 * 运行方式：npx tsx tests/project-actions.test.ts
 *
 * 注意：此测试需要：
 * 1. 数据库连接正常
 * 2. 已登录用户
 * 3. TOS 配置正确
 */

// Import test setup first to mock Next.js dependencies
import "./setup";

import {
  createProjectAction,
  getProjects,
  getProjectById,
  updateProjectAction,
  deleteProjectAction,
  createProjectAssetAction,
  getProjectAssets,
  updateProjectAssetAction,
  deleteProjectAssetAction,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateKnowledgeBaseAction,
  getCurrentUser,
} from "../app/actions";

// 测试辅助函数
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 测试主函数
async function runTests() {
  console.log("========================================");
  console.log("开始测试 Server Actions");
  console.log("========================================\n");

  let testProjectId: string | null = null;
  let testAssetId: string | null = null;

  try {
    // 测试 1: 检查用户登录状态
    console.log("测试 1: 检查用户登录状态");
    const user = await getCurrentUser();
    assert(user !== null, "用户应该已登录");
    console.log(`   当前用户: ${user?.email}\n`);

    // 测试 2: 创建项目
    console.log("测试 2: 创建项目");
    const createFormData = new FormData();
    createFormData.append("name", "测试项目 - " + new Date().toISOString());

    const createResult = await createProjectAction({ ok: true, message: "" }, createFormData);
    assert(createResult.ok, "项目创建应该成功");
    console.log(`   ${createResult.message}\n`);

    // 测试 3: 获取项目列表
    console.log("测试 3: 获取项目列表");
    const projects = await getProjects();
    assert(projects.length > 0, "应该至少有一个项目");
    testProjectId = projects[0]!.id;
    console.log(`   找到 ${projects.length} 个项目`);
    console.log(`   第一个项目ID: ${testProjectId}\n`);

    // 测试 4: 获取项目详情
    console.log("测试 4: 获取项目详情");
    const project = await getProjectById(testProjectId);
    assert(project !== null, "应该能够获取项目详情");
    console.log(`   项目名称: ${project?.name}`);
    console.log(`   文档数量: ${project?.assets.length}\n`);

    // 测试 5: 更新项目
    console.log("测试 5: 更新项目");
    const updateFormData = new FormData();
    updateFormData.append("projectId", testProjectId);
    updateFormData.append("name", "更新后的测试项目 - " + new Date().toISOString());
    updateFormData.append("metadata", JSON.stringify({ test: true }));

    const updateResult = await updateProjectAction({ ok: true, message: "" }, updateFormData);
    assert(updateResult.ok, "项目更新应该成功");
    console.log(`   ${updateResult.message}\n`);

    // 测试 6: 创建文档记录（模拟）
    console.log("测试 6: 创建文档记录");
    const assetFormData = new FormData();
    assetFormData.append("projectId", testProjectId);
    assetFormData.append("name", "测试文档.pdf");
    assetFormData.append("tosObjectKey", `projects/${user?.id}/test-${Date.now()}.pdf`);
    assetFormData.append("metadata", JSON.stringify({
      fileType: "pdf",
      fileSize: 102400,
      textContent: "这是一个测试文档的内容。包含了一些测试文本，用于验证知识库生成功能。",
      pageCount: 1,
      extractedAt: new Date().toISOString(),
    }));

    const assetResult = await createProjectAssetAction({ ok: true, message: "" }, assetFormData);
    assert(assetResult.ok, "文档创建应该成功");
    console.log(`   ${assetResult.message}\n`);

    // 测试 7: 获取项目文档列表
    console.log("测试 7: 获取项目文档列表");
    const assets = await getProjectAssets(testProjectId);
    assert(assets.length > 0, "应该至少有一个文档");
    testAssetId = assets[0]!.id;
    console.log(`   找到 ${assets.length} 个文档`);
    console.log(`   第一个文档ID: ${testAssetId}\n`);

    // 测试 8: 更新文档元数据
    console.log("测试 8: 更新文档元数据");
    const updateAssetFormData = new FormData();
    updateAssetFormData.append("assetId", testAssetId);
    updateAssetFormData.append("metadata", JSON.stringify({
      fileType: "pdf",
      fileSize: 102400,
      textContent: "更新后的文档内容",
      pageCount: 1,
      updated: true,
    }));

    const updateAssetResult = await updateProjectAssetAction({ ok: true, message: "" }, updateAssetFormData);
    assert(updateAssetResult.ok, "文档更新应该成功");
    console.log(`   ${updateAssetResult.message}\n`);

    // 测试 9: 获取预签名上传 URL
    console.log("测试 9: 获取预签名上传 URL");
    const uploadUrlResult = await getPresignedUploadUrl("test.pdf", "application/pdf");
    assert(uploadUrlResult.ok, "应该能够获取预签名上传 URL");
    assert(uploadUrlResult.url !== undefined, "上传 URL 不应为空");
    assert(uploadUrlResult.objectKey !== undefined, "对象键不应为空");
    console.log(`   ObjectKey: ${uploadUrlResult.objectKey}\n`);

    // 测试 10: 获取预签名下载 URL
    console.log("测试 10: 获取预签名下载 URL");
    const downloadUrlResult = await getPresignedDownloadUrl(uploadUrlResult.objectKey!);
    assert(downloadUrlResult.ok, "应该能够获取预签名下载 URL");
    assert(downloadUrlResult.url !== undefined, "下载 URL 不应为空");
    console.log(`   下载 URL 已生成\n`);

    // 测试 11: 生成 AI 知识库
    console.log("测试 11: 生成 AI 知识库");
    console.log("   正在调用 AI 服务...");
    const knowledgeBaseResult = await generateKnowledgeBaseAction(testProjectId);
    assert(knowledgeBaseResult.ok, "知识库生成应该成功");
    assert(knowledgeBaseResult.data !== undefined, "应该返回知识库数据");
    console.log(`   ${knowledgeBaseResult.message}`);
    console.log(`   总结: ${knowledgeBaseResult.data?.summary?.substring(0, 100)}...`);
    console.log(`   关键点数量: ${knowledgeBaseResult.data?.keyPoints?.length}`);
    console.log(`   分类数量: ${knowledgeBaseResult.data?.categories?.length}\n`);

    // 测试 12: 验证知识库已保存
    console.log("测试 12: 验证知识库已保存");
    const updatedProject = await getProjectById(testProjectId);
    const metadata = updatedProject?.metadata as { summary?: string } | null;
    assert(metadata?.summary !== undefined, "项目应该包含知识库总结");
    console.log(`   知识库已成功保存到项目元数据\n`);

    // 清理：删除测试文档
    console.log("清理测试数据...");
    console.log("删除测试文档");
    const deleteAssetFormData = new FormData();
    deleteAssetFormData.append("assetId", testAssetId);
    const deleteAssetResult = await deleteProjectAssetAction({ ok: true, message: "" }, deleteAssetFormData);
    assert(deleteAssetResult.ok, "文档删除应该成功");
    console.log(`   ${deleteAssetResult.message}\n`);

    // 清理：删除测试项目
    console.log("删除测试项目");
    const deleteFormData = new FormData();
    deleteFormData.append("projectId", testProjectId);
    const deleteResult = await deleteProjectAction({ ok: true, message: "" }, deleteFormData);
    assert(deleteResult.ok, "项目删除应该成功");
    console.log(`   ${deleteResult.message}\n`);

    console.log("========================================");
    console.log("✅ 所有测试通过！");
    console.log("========================================");
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ 测试失败");
    console.error("========================================");
    console.error(error);

    // 清理可能残留的测试数据
    if (testProjectId) {
      try {
        const deleteFormData = new FormData();
        deleteFormData.append("projectId", testProjectId);
        await deleteProjectAction({ ok: true, message: "" }, deleteFormData);
        console.log("\n已清理测试数据");
      } catch (cleanupError) {
        console.error("清理测试数据时出错:", cleanupError);
      }
    }

    process.exit(1);
  }
}

// 运行测试
runTests();
