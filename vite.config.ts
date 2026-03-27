import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@geoviz/data-models": resolve(__dirname, "../geoviz/packages/data-models/src/index.ts"),
      "@geoviz/chart-core": resolve(__dirname, "../geoviz/packages/chart-core/src/index.ts"),
      "@geoviz/renderer": resolve(__dirname, "../geoviz/packages/renderer/src/index.ts"),
      "@geoviz/domain-geoscience": resolve(__dirname, "../geoviz/packages/domain-geoscience/src/index.ts")
    }
  }
});

