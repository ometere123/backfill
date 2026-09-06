import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: true, outputFileTracingRoot: process.cwd(), turbopack: { root: process.cwd() }, webpack: (config) => { config.resolve = { ...config.resolve, symlinks: false }; return config; } };
export default nextConfig;
