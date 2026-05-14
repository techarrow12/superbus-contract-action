import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  sourcemap: false,
  clean: true,
  dts: false,
  bundle: true,
  splitting: false,
  outDir: "dist",
});
