import { createConfig } from "eslint-plugin-portable-paths";

const config = createConfig({ root: import.meta.dirname });
config.rules["portable-paths/max-pathname-length"] = [
  "error", { max: 200, maxNameBytes: 255 },
];

export default [config];
