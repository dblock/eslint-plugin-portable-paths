import { createConfig } from "eslint-plugin-portable-paths";

export default [createConfig({ root: import.meta.dirname, typo: true })];
