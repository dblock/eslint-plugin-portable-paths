import { defineConfig } from "oxlint";
import { config } from "./portable-paths.mjs";

export default defineConfig({
  jsPlugins: [{ name: "portable-paths", specifier: "./portable-paths.mjs" }],
  rules: config.rules,
});
