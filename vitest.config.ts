import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      // Módulos con lógica testeable (pagos, IA, validaciones). Las páginas no se miden aún.
      include: [
        "supabase/functions/_shared/{payments,mp-webhook,idempotency,refunds,ai,html}.ts",
        "src/utils/**/*.ts",
        "src/lib/ai-service.ts",
        "src/config/**/*.ts",
        "src/components/payments/**/*.tsx",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
