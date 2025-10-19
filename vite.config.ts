import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: "./server/app.ts",
        }
      : undefined,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), svgr()],
  resolve: {
    alias: {
      "@icons": path.resolve(__dirname, "./app/assets/icons"),
    },
  },
  assetsInclude: ["**/*.svg"],
  server: {
    host: true, // 외부 접근 허용
    allowedHosts: [
      "localhost",
      ".ngrok-free.app", // 모든 ngrok 도메인 허용
      ".ngrok.io", // 구버전 ngrok 도메인
    ],
    hmr: {
      clientPort: 443, // ngrok HTTPS 포트
    },
  },
}));
