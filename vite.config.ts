import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "verification-page",
  build: {
    outDir: "../dist/verification-page",
    emptyOutDir: true,
  },
});
