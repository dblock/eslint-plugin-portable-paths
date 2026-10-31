import { lstatSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { caseFold } from "unicode-case-folding";
import { relativePath, reportingPath, rootPath, scanPaths } from "../../paths.mjs";

export function findCollisions(paths) {
  if (!Array.isArray(paths)) {
    throw new TypeError("paths must be an array.");
  }
  const inventory = new Set();
  for (const path of paths) {
    relativePath(path);
    const parts = path.split("/");
    for (let length = 1; length <= parts.length; length++) {
      inventory.add(parts.slice(0, length).join("/"));
    }
  }
  const groups = new Map();
  for (const path of [...inventory].sort()) {
    const key = caseFold(path.normalize("NFC")).normalize("NFC");
    const group = groups.get(key);
    if (group) group.push(path);
    else groups.set(key, [path]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

const ruleMeta = {
  type: "problem",
  docs: {
    description: "Detect case-insensitive and Unicode-normalization path collisions.",
    url: "https://github.com/dblock/eslint-plugin-portable-paths/blob/main/src/rules/no-case-collisions/README.md",
  },
  schema: [{
    type: "object",
    properties: {
      anchor: { type: "string", minLength: 1 },
      collisions: {
        type: "array",
        items: {
          type: "array",
          minItems: 2,
          uniqueItems: true,
          items: { type: "string", minLength: 1 },
        },
      },
    },
    required: ["collisions"],
    additionalProperties: false,
  }],
  messages: {
    collision: "Conflicting paths: {{paths}}.",
  },
};

const rule = {
  meta: {
    ...ruleMeta,
    // ESLint applies defaults before computing its cache key, even for cached files.
    get defaultOptions() {
      const root = rootPath(process.cwd());
      const paths = scanPaths(root);
      const reportOn = ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs"]
        .find((name) => paths.includes(name) && lstatSync(join(root, name)).isFile());
      if (!reportOn) {
        throw new TypeError("No reporting anchor at the working directory. Use createConfig({ root, reportOn }) for a custom root or anchor.");
      }
      return [{
        anchor: reportingPath(root, reportOn),
        collisions: findCollisions(paths),
      }];
    },
  },
  create(context) {
    if (!context.options[0]) {
      throw new TypeError("Filesystem snapshot defaults require ESLint 9.39 or newer.");
    }
    const { collisions, anchor = join(context.cwd, "eslint.config.mjs") } = context.options[0];
    if (!isAbsolute(anchor) || !anchor.isWellFormed() || anchor.includes("\0")) {
      throw new TypeError("Snapshot anchor must be an absolute JavaScript file path.");
    }
    reportingPath(dirname(anchor), basename(anchor));
    if (resolve(context.filename) !== anchor) return {};
    return {
      Program() {
        for (const paths of collisions) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: "collision",
            data: { paths: paths.map((path) => JSON.stringify(path)).join(", ") },
          });
        }
      },
    };
  },
};

export const snapshotRule = { ...rule, meta: ruleMeta };

export default rule;
