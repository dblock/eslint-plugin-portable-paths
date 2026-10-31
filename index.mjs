import { lstatSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import { TextDecoder } from "node:util";
import picomatch from "picomatch";
import { caseFold } from "unicode-case-folding";

export const DEFAULT_IGNORE = Object.freeze([
  "**/.git/**",
  "**/node_modules/**",
]);

function options(value, allowed) {
  if (
    value === null ||
    typeof value !== "object" ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new TypeError("Options must be an object.");
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TypeError(`Unknown option: ${key}.`);
    }
  }
}

function relativePath(value) {
  if (
    typeof value !== "string" ||
    !value.isWellFormed() ||
    value.includes("\0") ||
    isAbsolute(value) ||
    /^[a-zA-Z]:/.test(value) ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new TypeError("Paths must be nonempty, root-relative POSIX paths.");
  }
}

function rootPath(value) {
  if (typeof value !== "string" || !value || !value.isWellFormed()) {
    throw new TypeError("root must be a nonempty directory path.");
  }
  const root = resolve(value);
  if (!statSync(root).isDirectory()) {
    throw new TypeError(`root is not a directory: ${root}`);
  }
  return root;
}

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

export function scanPaths(root = process.cwd(), supplied = {}) {
  options(supplied, ["ignore"]);
  const directory = rootPath(root);
  const ignore = supplied.ignore === undefined ? DEFAULT_IGNORE : supplied.ignore;
  if (!Array.isArray(ignore)) {
    throw new TypeError("ignore must be an array of positive, root-relative globs.");
  }
  const matches = ignore.map((pattern) => {
    if (
      typeof pattern !== "string" ||
      !pattern.trim() ||
      !pattern.isWellFormed() ||
      pattern.includes("\0") ||
      isAbsolute(pattern) ||
      /^[a-zA-Z]:/.test(pattern) ||
      pattern.split("/").includes("..") ||
      picomatch.scan(pattern).negated
    ) {
      throw new TypeError("ignore must contain positive, root-relative globs.");
    }
    return picomatch(pattern, {
      dot: true,
      windows: false,
      strictBrackets: true,
    });
  });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const paths = [];
  function visit(parent) {
    const absolute = parent ? join(directory, ...parent.split("/")) : directory;
    for (const entry of readdirSync(absolute, { encoding: "buffer", withFileTypes: true })) {
      let name;
      try {
        name = decoder.decode(entry.name);
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        throw new TypeError(
          `Filename is not valid UTF-8 in ${absolute}: ${Buffer.from(entry.name).toString("hex")}`,
          { cause: error },
        );
      }
      const path = parent ? `${parent}/${name}` : name;
      if (matches.some((match) => match(path) || (entry.isDirectory() && match(`${path}/`)))) {
        continue;
      }
      paths.push(path);
      if (entry.isDirectory()) visit(path);
    }
  }
  visit("");
  return paths.sort();
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Detect case-insensitive and Unicode-normalization path collisions.",
      url: "https://github.com/dblock/eslint-plugin-portable-paths#no-case-collisions",
    },
    schema: [{
      type: "object",
      properties: {
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
      collision: "Paths collide under NFC normalization and Unicode case folding: {{paths}}.",
    },
  },
  create(context) {
    if (!context.options[0]) {
      throw new TypeError("Use createConfig() to supply a filesystem collision snapshot.");
    }
    const { collisions } = context.options[0];
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

const plugin = {
  meta: { name: "eslint-plugin-portable-paths", version: "0.1.0" },
  rules: { "no-case-collisions": rule },
};

export function createConfig(supplied = {}) {
  options(supplied, ["root", "ignore", "reportOn"]);
  const root = rootPath(supplied.root === undefined ? process.cwd() : supplied.root);
  const reportOn = supplied.reportOn === undefined ? "eslint.config.mjs" : supplied.reportOn;
  relativePath(reportOn);
  if (/[*?[\]{}()]/.test(reportOn) || reportOn.startsWith("!")) {
    throw new TypeError("reportOn must name a literal file without glob syntax.");
  }
  if (!lstatSync(join(root, ...reportOn.split("/"))).isFile()) {
    throw new TypeError("reportOn must name an existing regular JavaScript file.");
  }
  if (!/\.[cm]?js$/.test(reportOn)) {
    throw new TypeError("reportOn must name a JavaScript file.");
  }
  const collisions = findCollisions(scanPaths(root, { ignore: supplied.ignore }));
  return {
    name: "portable-paths/no-case-collisions",
    basePath: root,
    files: [reportOn],
    plugins: { "portable-paths": plugin },
    rules: {
      "portable-paths/no-case-collisions": ["error", { collisions }],
    },
  };
}

export default plugin;
