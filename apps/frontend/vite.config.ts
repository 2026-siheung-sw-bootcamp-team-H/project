import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? "http://localhost:4000";
  const wafProxyTarget = env.VITE_WAF_PROXY_TARGET ?? "http://localhost:8081";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        "/api/demo-shop": {
          target: wafProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/demo-shop/, "/demo-shop")
        },
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
