import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: {
    target: "es2018",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Firebase only downloads when the app is connected to a Firebase project.
        manualChunks: (id) => (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase") ? "cloud" : undefined),
      },
    },
  },
});
