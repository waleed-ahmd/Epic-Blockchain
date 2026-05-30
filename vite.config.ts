import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "verification-page",
  envDir: ".",
  build: {
    outDir: "../dist/verification-page",
    emptyOutDir: true,
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
