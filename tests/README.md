# 项目测试说明

## 测试文件

### 1. simple-test.ts - 数据库Schema测试
简化的测试脚本，用于验证数据库schema和基本CRUD操作。

**测试内容：**
- ✅ 数据库连接
- ✅ User/Project/ProjectAsset 表访问
- ✅ 创建测试用户
- ✅ 创建项目
- ✅ 创建文档资产
- ✅ 更新项目元数据（模拟AI知识库）
- ✅ 删除操作和级联删除

**运行方式：**
```bash
npm run test:simple
```

**前置条件：**
- 数据库已连接（DATABASE_URL 配置正确）
- 已运行 `npx prisma migrate dev` 或 `npx prisma db push`

---

### 2. project-actions.test.ts - Server Actions完整测试
完整的Server Actions测试，包括文件上传、AI知识库生成等。

**测试内容：**
- ✅ 用户认证
- ✅ 项目CRUD操作
- ✅ 文档资产CRUD操作
- ✅ TOS预签名URL生成
- ✅ AI知识库生成
- ✅ 数据级联删除

**运行方式：**
```bash
npm run test:actions
```

**前置条件：**
- 所有环境变量配置正确（参考 .env.example）
- 数据库已连接
- 已安装依赖 `npm install`
- 用户已注册（测试会使用 cookie 中的用户信息）

---

## 环境配置

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

**必需配置：**
- `DATABASE_URL` - PostgreSQL 数据库连接字符串
- `DEEPSEEK_API_KEY` - DeepSeek AI API密钥（用于知识库生成）
- `VOLCENGINE_ACCESS_KEY_ID` - 火山引擎TOS访问密钥ID
- `VOLCENGINE_ACCESS_KEY_SECRET` - 火山引擎TOS访问密钥Secret

---

## 数据库设置

1. **安装PostgreSQL**（如果还没有）

2. **创建数据库：**
```bash
createdb personalize
```

3. **运行迁移：**
```bash
npx prisma migrate dev
# 或者
npx prisma db push
```

4. **查看数据库（可选）：**
```bash
npx prisma studio
```

---

## 运行测试

### 快速测试（仅数据库）
```bash
npm run test:simple
```

### 完整测试（包含Server Actions）
```bash
npm run test:actions
```

---

## 测试输出示例

### 成功输出
```
========================================
开始测试 Server Actions
========================================

测试 1: 检查用户登录状态
✅ PASSED: 用户应该已登录
   当前用户: test@example.com

测试 2: 创建项目
✅ PASSED: 项目创建应该成功
   项目已创建

...

========================================
✅ 所有测试通过！
========================================
```

### 失败输出
```
❌ FAILED: 数据库连接失败
Error: P1001: Can't reach database server...
```

---

## 故障排除

### 1. 数据库连接失败
- 检查 `DATABASE_URL` 是否正确
- 确保 PostgreSQL 服务正在运行
- 检查数据库是否已创建

### 2. Module not found 错误
- 运行 `npm install` 安装依赖
- 运行 `npx prisma generate` 生成Prisma客户端

### 3. AI知识库生成失败
- 检查 `DEEPSEEK_API_KEY` 是否配置
- 确保网络可以访问 DeepSeek API
- 检查API配额和余额

### 4. TOS上传失败
- 检查 `VOLCENGINE_ACCESS_KEY_ID` 和 `VOLCENGINE_ACCESS_KEY_SECRET`
- 确保bucket权限正确
- 检查网络连接

---

## 注意事项

1. **测试会创建真实数据**：测试完成后会自动清理，但如果中途失败可能留下测试数据
2. **AI调用会产生费用**：`test:actions` 会调用真实的AI API
3. **并发测试**：避免同时运行多个测试实例，可能导致数据冲突

---

## CI/CD集成

添加到GitHub Actions（.github/workflows/test.yml）：

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: personalize_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm install

      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/personalize_test

      - run: npm run test:simple
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/personalize_test
```
