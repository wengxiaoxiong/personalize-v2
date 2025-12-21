import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // PDF.js worker 配置
    if (!isServer) {
      config.resolve.alias.canvas = false;
      config.resolve.alias.encoding = false;
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
};

export default nextConfig;
