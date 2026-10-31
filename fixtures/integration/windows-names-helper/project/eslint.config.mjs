import { createConfig, DEFAULT_IGNORES } from "eslint-plugin-portable-paths";

export default [createConfig({
  root: import.meta.dirname,
  ignores: [...DEFAULT_IGNORES, "vendor/**"],
})];
