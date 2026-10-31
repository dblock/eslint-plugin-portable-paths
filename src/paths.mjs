import { lstatSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import { TextDecoder } from "node:util";
import picomatch from "picomatch";

export const DEFAULT_IGNORES = Object.freeze([
  "**/.git/**",
  "**/node_modules/**",
]);

export function options(value, allowed) {
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

export function relativePath(value) {
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

export function rootPath(value) {
  if (typeof value !== "string" || !value || !value.isWellFormed()) {
    throw new TypeError("root must be a nonempty directory path.");
  }
  const root = resolve(value);
  if (!statSync(root).isDirectory()) {
    throw new TypeError(`root is not a directory: ${root}`);
  }
  return root;
}

export function scanPaths(root = process.cwd(), supplied = {}) {
  options(supplied, ["ignores"]);
  const directory = rootPath(root);
  const ignores = supplied.ignores === undefined ? DEFAULT_IGNORES : supplied.ignores;
  if (!Array.isArray(ignores)) {
    throw new TypeError("ignores must be an array of positive, root-relative globs.");
  }
  const matches = ignores.map((pattern) => {
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
      throw new TypeError("ignores must contain positive, root-relative globs.");
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

export function reportingPath(root, reportOn) {
  relativePath(reportOn);
  if (/[*?[\]{}()]/.test(reportOn) || reportOn.startsWith("!")) {
    throw new TypeError("reportOn must name a literal file without glob syntax.");
  }
  const path = join(root, ...reportOn.split("/"));
  if (!lstatSync(path).isFile()) {
    throw new TypeError("reportOn must name an existing regular JavaScript file.");
  }
  if (!/\.[cm]?js$/.test(reportOn)) {
    throw new TypeError("reportOn must name a JavaScript file.");
  }
  return path;
}
