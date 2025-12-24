import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // PDF.js worker 配置
    if (!isServer) {
      config.resolve.alias.canvas = false;
      config.resolve.alias.encoding = false;
    }
    
    // Prisma 二进制文件处理（用于部署）
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@prisma/client': '@prisma/client',
      });
    }
    
    return config;
  },
  // 允许使用 worker
  experimental: {
    webpackBuildWorker: true,
  },
  // 移除 Server Actions body 大小限制
  serverActions: {
    bodySizeLimit: false,
  },
  // 确保 Prisma 二进制文件被正确复制到部署环境
  outputFileTracingIncludes: {
    '/**': [
      './lib/generated/prisma/**/*',
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/client/**/*',
      './node_modules/prisma/**/*',
    ],
  },
};

export default nextConfig;
