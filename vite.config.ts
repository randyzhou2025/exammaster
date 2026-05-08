import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** 生产子路径部署时在构建环境设置 VITE_BASE_PATH，例如 /examprep/ */
function viteBase(): string {
  const raw = process.env.VITE_BASE_PATH ?? "/";
  if (raw === "/" || raw === "") return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

export default defineConfig({
  base: viteBase(),
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:4000", changeOrigin: true },
    },
  },
});
