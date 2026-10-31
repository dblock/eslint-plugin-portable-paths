import { createConfig } from "eslint-plugin-portable-paths";

export default [
  { ignores: ["*.webp"] },
  createConfig({ root: import.meta.dirname }),
];
