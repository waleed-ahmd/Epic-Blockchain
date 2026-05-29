import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "verification-page",
  envDir: ".",
  envPrefix: ["VITE_", "CONTRACT_"],
  build: {
    outDir: "../dist/verification-page",
    emptyOutDir: true,
  },
});
