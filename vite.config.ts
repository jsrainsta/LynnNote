import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Tauri 期望固定端口，且不需要它自己弹出的提示
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // 避免 Tauri 的 Rust 目录触发前端重载
      ignored: ["**/src-tauri/**"],
    },
  },
  // Tauri 通过环境变量注入应用信息（TAURI_*）
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: "es2021",
  },
});
