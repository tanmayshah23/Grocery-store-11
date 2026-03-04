import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  optimizeDeps: {
    exclude: ['sqlocal'],
  },
  worker: {
    format: 'es'
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'email-relay',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/send-email' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                // We pipe the JSON body directly to python stdin
                const python = spawn('python', ['test_email.py']);

                let output = '';
                let errorOutput = '';

                python.stdout.on('data', (data) => { output += data.toString(); });
                python.stderr.on('data', (data) => { errorOutput += data.toString(); });

                python.on('close', (code) => {
                  if (code !== 0) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ status: "Error", message: errorOutput || "Python exited with error" }));
                    return;
                  }
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(output);
                });

                python.stdin.write(body);
                python.stdin.end();
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ status: "Error", message: "Invalid JSON" }));
              }
            });
            return;
          }
          next();
        });
      }
    },
    {
      name: "configure-response-headers",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          next();
        });
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable.png"],
      manifest: {
        name: "Smart Grocery POS",
        short_name: "GroceryPOS",
        description: "Professional offline-first POS & billing system for grocery stores",
        theme_color: "#3b82f6",
        background_color: "#0d0f14",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        categories: ["business", "finance", "productivity"],
        shortcuts: [
          { name: "New Sale", short_name: "Sale", url: "/?action=sale", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
          { name: "Purchases", short_name: "Purchase", url: "/?action=purchase", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
