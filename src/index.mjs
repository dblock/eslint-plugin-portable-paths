import process from "node:process";
import { options, reportingPath, rootPath, scanPaths } from "./paths.mjs";
import rule, { findCollisions, snapshotRule } from "./rules/no-case-collisions/index.mjs";

export { DEFAULT_IGNORES, scanPaths } from "./paths.mjs";
export { findCollisions };

const plugin = {
  meta: { name: "eslint-plugin-portable-paths", version: "0.1.0" },
  rules: { "no-case-collisions": rule },
  configs: {},
};

plugin.configs.recommended = {
  name: "portable-paths/recommended",
  files: ["eslint.config.{js,mjs,cjs}"],
  plugins: { "portable-paths": plugin },
  rules: { "portable-paths/no-case-collisions": "error" },
};

export function createConfig(supplied = {}) {
  options(supplied, ["root", "ignores", "reportOn"]);
  const root = rootPath(supplied.root === undefined ? process.cwd() : supplied.root);
  const reportOn = supplied.reportOn === undefined ? "eslint.config.mjs" : supplied.reportOn;
  const anchor = reportingPath(root, reportOn);
  const collisions = findCollisions(scanPaths(root, { ignores: supplied.ignores }));
  return {
    name: "portable-paths/no-case-collisions",
    basePath: root,
    files: [reportOn],
    plugins: {
      "portable-paths": {
        meta: plugin.meta,
        rules: { "no-case-collisions": { ...snapshotRule } },
      },
    },
    rules: {
      "portable-paths/no-case-collisions": ["error", { anchor, collisions }],
    },
  };
}

export default plugin;
