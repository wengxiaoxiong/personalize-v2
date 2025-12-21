# 项目文档管理系统 - 使用指南

## 📍 功能位置

### 导航入口
项目管理功能已集成到 Dashboard 的左侧导航栏：

```
Dashboard Sidebar
├── 🏠 工作台 (/dashboard)
├── 🎭 人设库 (/personas)
└── 📁 项目管理 (/projects) ← 新增
```

### 页面路由
- **项目列表**: `/projects`
- **项目详情**: `/projects/[id]`

---

## 🎯 核心功能

### 1️⃣ 项目列表页面 (`/projects`)

**功能：**
- ✅ 查看所有项目的卡片视图
- ✅ 创建新项目
- ✅ 查看项目基本信息：
  - 项目名称
  - 创建时间
  - 文档数量
  - AI 知识库状态（是否已生成）
  - 知识库摘要预览
  - 分类标签（最多显示 3 个）
- ✅ 删除项目（级联删除所有文档）
- ✅ 空状态提示

**界面元素：**
```
┌─────────────────────────────────────┐
│  我的项目                   [+ 新建项目] │
│  管理你的项目和文档，生成 AI 知识库       │
├─────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  │
│  │项目卡片│  │项目卡片│  │项目卡片│  │
│  │  📄 3个 │  │  📄 5个 │  │  📄 1个 │  │
│  │✨已生成 │  │        │  │✨已生成 │  │
│  └────────┘  └────────┘  └────────┘  │
└─────────────────────────────────────┘
```

---

### 2️⃣ 项目详情页面 (`/projects/[id]`)

**布局：三列式设计**

```
┌────────────────────────────────────────────────────────┐
│  ← 返回项目列表                                          │
│  项目名称                                               │
│  创建于 XXXX-XX-XX · 最后更新于 XXXX-XX-XX              │
├─────────────────────────────┬──────────────────────────┤
│  📤 上传文档                  │  ✨ AI 知识库             │
│  ┌─────────────────────┐     │  ┌──────────────────┐   │
│  │  点击选择 PDF 文件    │     │  │  📝 总结          │   │
│  │  📁 支持 PDF 格式    │     │  │  文字内容...      │   │
│  │                     │     │  ├──────────────────┤   │
│  │  [进度条 60%]        │     │  │  🏷️ 分类          │   │
│  │  正在上传文件...     │     │  │  [标签1][标签2]   │   │
│  └─────────────────────┘     │  ├──────────────────┤   │
│                              │  │  💡 关键点         │   │
│  📄 文档列表                  │  │  • 要点 1         │   │
│  已上传 3 个文档              │  │  • 要点 2         │   │
│  ┌─────────────────────┐     │  │  • 要点 3         │   │
│  │ 📄 document.pdf      │     │  ├──────────────────┤   │
│  │ 1.2 MB · 10 页       │     │  │  基于 3 个文档    │   │
│  │ 2024-12-21    [⋮]   │     │  │  生成时间: ...    │   │
│  └─────────────────────┘     │  │                  │   │
│  ┌─────────────────────┐     │  │  [🔄 重新生成]    │   │
│  │ 📄 report.pdf        │     │  └──────────────────┘   │
│  │ 2.5 MB · 25 页       │     │                         │
│  │ 2024-12-20    [⋮]   │     │  (固定在右侧)            │
│  └─────────────────────┘     │                         │
└─────────────────────────────┴──────────────────────────┘
```

---

## 🚀 使用流程

### 步骤 1: 创建项目
1. 点击左侧导航 **"项目管理"**
2. 点击 **"+ 新建项目"** 按钮
3. 输入项目名称（例如：产品设计文档）
4. 点击 **"创建项目"**

### 步骤 2: 上传文档
1. 进入项目详情页
2. 在 **"上传文档"** 区域点击选择文件
3. 选择 PDF 文件（目前仅支持 PDF）
4. 系统自动执行 4 个步骤：
   - ⏳ 步骤 1: 正在提取文档内容... (25%)
   - ⏳ 步骤 2: 正在获取上传链接... (40%)
   - ⏳ 步骤 3: 正在上传文件... (60%)
   - ⏳ 步骤 4: 正在保存记录... (80%)
   - ✅ 上传完成! (100%)

### 步骤 3: 生成 AI 知识库
1. 确保已上传至少一个文档
2. 在右侧 **"AI 知识库"** 面板
3. 点击 **"生成知识库"** 按钮
4. 等待 AI 处理（通常 5-15 秒）
5. 查看生成的：
   - 📝 整体总结（200-300字）
   - 💡 关键点（3-8个要点）
   - 🏷️ 分类标签（2-5个类别）

### 步骤 4: 管理文档
- **下载文档**: 点击文档右侧 `⋮` → 下载文件
- **删除文档**: 点击文档右侧 `⋮` → 删除文档
- **重新生成知识库**: 添加新文档后，点击 **"重新生成"** 更新知识库

---

## 🔧 技术实现

### 前端技术栈
- **框架**: Next.js 15 (App Router)
- **UI 组件**: shadcn/ui
- **样式**: Tailwind CSS
- **PDF 处理**: pdfjs-dist (浏览器端)
- **状态管理**: React Hooks

### 后端技术栈
- **Server Actions**: Next.js Server Actions
- **数据库**: PostgreSQL + Prisma ORM
- **存储**: Volcengine TOS (类似 S3)
- **AI**: Vercel AI SDK + DeepSeek

### 数据流程

#### 文档上传流程
```
[浏览器选择文件]
    ↓
[pdfjs 提取文本] → 客户端处理
    ↓
[请求预签名 URL] → Server Action
    ↓
[直接上传到 TOS] → 浏览器 PUT 请求
    ↓
[创建文档记录] → Server Action + Prisma
    ↓
[保存元数据] → metadata: { textContent, pageCount, ... }
```

#### AI 知识库生成流程
```
[用户点击生成]
    ↓
[Server Action: generateKnowledgeBaseAction]
    ↓
[提取所有文档文本] → 从 ProjectAsset.metadata.textContent
    ↓
[调用 DeepSeek API] → Vercel AI SDK generateText()
    ↓
[解析 AI 响应] → JSON { summary, keyPoints, categories }
    ↓
[保存到 Project.metadata]
    ↓
[revalidatePath 刷新页面]
```

---

## 📊 数据库 Schema

### Project 表
```typescript
{
  id: string (UUID)
  userId: string (UUID) → 关联用户
  name: string → 项目名称
  metadata: JSON → 存储 AI 知识库
  createdAt: DateTime
  updatedAt: DateTime
}
```

### ProjectAsset 表
```typescript
{
  id: string (UUID)
  projectId: string (UUID) → 关联项目
  name: string → 文件名
  tosObjectKey: string → TOS 对象键
  metadata: JSON → 存储文本内容等
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Metadata 结构

**Project.metadata:**
```json
{
  "summary": "AI 生成的项目总结...",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "categories": ["分类1", "分类2"],
  "generatedAt": "2024-12-21T...",
  "documentCount": 3,
  "totalTextLength": 15000
}
```

**ProjectAsset.metadata:**
```json
{
  "fileType": "pdf",
  "fileSize": 1234567,
  "mimeType": "application/pdf",
  "textContent": "提取的全文内容...",
  "pageCount": 10,
  "extractedAt": "2024-12-21T..."
}
```

---

## 🔐 安全特性

### 用户权限控制
- ✅ 所有 Server Actions 检查用户登录状态
- ✅ 项目查询自动过滤 `userId`
- ✅ 文档操作验证项目所有权

### TOS 安全
- ✅ ObjectKey 格式: `projects/{userId}/{timestamp}-{uuid}.{ext}`
- ✅ 预签名 URL 有效期 1 小时
- ✅ 下载时验证 objectKey 所属项目

### 数据完整性
- ✅ 级联删除: 删除项目自动删除所有文档
- ✅ 外键约束: userId → User, projectId → Project
- ✅ Zod schema 验证所有输入

---

## 🎨 UI/UX 特性

### 响应式设计
- 📱 移动端: 单列布局
- 💻 平板: 2 列布局
- 🖥️ 桌面: 3 列布局

### 交互反馈
- ⏳ 上传进度条 (4 步骤)
- ✨ 加载状态 (生成中...)
- ✅ 成功提示
- ❌ 错误提示 (alert)

### 视觉元素
- 🎴 卡片阴影悬停效果
- 🏷️ Badge 标签显示状态
- 📊 文件大小、页数等元信息
- 🎯 空状态插图

---

## 🧪 测试

### 运行测试
```bash
# 数据库 Schema 测试
npm run test:simple

# 完整 Server Actions 测试
npm run test:actions
```

### 测试覆盖
- ✅ 数据库连接
- ✅ 项目 CRUD
- ✅ 文档 CRUD
- ✅ TOS 预签名 URL
- ✅ AI 知识库生成
- ✅ 级联删除

---

## 🔧 环境配置

### 必需环境变量
```env
# 数据库
DATABASE_URL=postgresql://...

# DeepSeek AI (知识库生成)
DEEPSEEK_API_KEY=sk-xxx

# Volcengine TOS (文件存储)
VOLCENGINE_ACCESS_KEY_ID=xxx
VOLCENGINE_ACCESS_KEY_SECRET=xxx
```

---

## 📝 已知限制

### 当前支持
- ✅ PDF 文件上传和解析
- ✅ 中文文本提取
- ✅ DeepSeek AI 总结

### 未来支持
- ⏳ Word 文档 (.docx)
- ⏳ Markdown 文件 (.md)
- ⏳ 文本文件 (.txt)
- ⏳ 图片 OCR 识别
- ⏳ 批量上传
- ⏳ 文档预览
- ⏳ 全文搜索
- ⏳ 版本历史

---

## 🐛 故障排除

### 1. 上传失败
**症状**: 文件上传卡在某个步骤

**可能原因**:
- PDF 格式损坏
- 文件过大 (>50MB)
- TOS 凭证错误
- 网络连接问题

**解决方法**:
1. 检查 PDF 文件是否可以正常打开
2. 尝试较小的文件
3. 检查 `.env` 中 TOS 配置
4. 查看浏览器控制台错误

### 2. 知识库生成失败
**症状**: 点击生成后报错

**可能原因**:
- DeepSeek API Key 无效
- 网络无法访问 DeepSeek API
- 文档内容为空
- API 配额用尽

**解决方法**:
1. 确认 `DEEPSEEK_API_KEY` 配置正确
2. 测试网络连接: `curl https://api.deepseek.com`
3. 确保至少上传一个有文本内容的 PDF
4. 检查 DeepSeek 账户余额

### 3. 文档列表为空
**症状**: 上传成功但列表不显示

**可能原因**:
- 页面缓存未刷新
- 数据库写入失败

**解决方法**:
1. 刷新页面 (F5)
2. 检查浏览器控制台错误
3. 查看数据库中 `ProjectAsset` 表

---

## 📚 相关文档

- [测试指南](../tests/README.md)
- [API 参考](./API.md) (待创建)
- [数据库 Schema](../prisma/schema.prisma)
- [环境配置](.env.example)

---

## 🤝 贡献

如需添加新功能或修复 bug，请：
1. 创建新分支
2. 实现功能并添加测试
3. 提交 Pull Request

---

**最后更新**: 2024-12-21
**版本**: 1.0.0
