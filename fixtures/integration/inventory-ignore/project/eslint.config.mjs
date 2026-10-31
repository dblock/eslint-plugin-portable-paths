import { createConfig } from "eslint-plugin-portable-paths";

export default [createConfig({ root: import.meta.dirname, ignores: ["assets/**"] })];
