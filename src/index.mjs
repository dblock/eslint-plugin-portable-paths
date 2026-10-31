import process from "node:process";
import { options, reportingPath, rootPath, scanPaths } from "./paths.mjs";
import rule, { findCollisions, snapshotRule } from "./rules/no-case-collisions/index.mjs";
import windowsRule, {
  findWindowsInvalidNames, snapshotRule as windowsSnapshotRule,
} from "./rules/no-windows-invalid-names/index.mjs";

export { DEFAULT_IGNORES, scanPaths } from "./paths.mjs";
export { findCollisions, findWindowsInvalidNames };

const plugin = {
  meta: { name: "eslint-plugin-portable-paths", version: "0.1.0" },
  rules: {
    "no-case-collisions": rule,
    "no-windows-invalid-names": windowsRule,
  },
  configs: {},
};

plugin.configs.recommended = {
  name: "portable-paths/recommended",
  files: ["eslint.config.{js,mjs,cjs}"],
  plugins: { "portable-paths": plugin },
  rules: {
    "portable-paths/no-case-collisions": "error",
    "portable-paths/no-windows-invalid-names": "error",
  },
};

export function createConfig(supplied = {}) {
  options(supplied, ["root", "ignores", "reportOn"]);
  const root = rootPath(supplied.root === undefined ? process.cwd() : supplied.root);
  const reportOn = supplied.reportOn === undefined ? "eslint.config.mjs" : supplied.reportOn;
  const anchor = reportingPath(root, reportOn);
  const paths = scanPaths(root, { ignores: supplied.ignores });
  const collisions = findCollisions(paths);
  const invalidNames = findWindowsInvalidNames(paths);
  return {
    name: "portable-paths",
    basePath: root,
    files: [reportOn],
    plugins: {
      "portable-paths": {
        meta: plugin.meta,
        rules: {
          "no-case-collisions": { ...snapshotRule },
          "no-windows-invalid-names": { ...windowsSnapshotRule },
        },
      },
    },
    rules: {
      "portable-paths/no-case-collisions": ["error", { anchor, collisions }],
      "portable-paths/no-windows-invalid-names": ["error", { anchor, invalidNames }],
    },
  };
}

export default plugin;
