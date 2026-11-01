import { createConfig, DEFAULT_IGNORES } from "eslint-plugin-portable-paths";

const config = createConfig({
  root: import.meta.dirname,
  ignores: [...DEFAULT_IGNORES, "vendor/**"],
});
config.rules["portable-paths/max-pathname-length"] = ["error", { max: 20 }];

export default [config];
