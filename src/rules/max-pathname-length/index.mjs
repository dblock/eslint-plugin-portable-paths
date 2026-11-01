import { Buffer } from "node:buffer";
import { defaultSnapshot, isReportingFile, options, pathInventory } from "../../paths.mjs";

export function findLongPaths(paths, supplied = {}) {
  options(supplied, ["max", "maxNameBytes"]);
  for (const key of ["max", "maxNameBytes"]) {
    if (supplied[key] !== undefined && (!Number.isSafeInteger(supplied[key]) || supplied[key] < 1)) {
      throw new TypeError(`${key} must be a positive safe integer.`);
    }
  }
  const { max, maxNameBytes } = supplied;
  if (max === undefined && maxNameBytes === undefined) {
    throw new TypeError("Provide max or maxNameBytes.");
  }
  return pathInventory(paths)
    .map((path) => ({
      path,
      length: path.length,
      nameBytes: Buffer.byteLength(path.split("/").at(-1), "utf8"),
    }))
    .filter(({ length, nameBytes }) =>
      (max !== undefined && length > max) ||
      (maxNameBytes !== undefined && nameBytes > maxNameBytes));
}

const ruleMeta = {
  type: "problem",
  docs: {
    description: "Limit project-relative paths and UTF-8 filename sizes.",
    url: "https://github.com/dblock/eslint-plugin-portable-paths/blob/main/src/rules/max-pathname-length/README.md",
  },
  schema: [{
    type: "object",
    properties: {
      max: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
      maxNameBytes: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
      anchor: { type: "string", minLength: 1 },
      paths: {
        type: "array",
        uniqueItems: true,
        items: { type: "string", minLength: 1 },
      },
    },
    required: ["paths"],
    anyOf: [{ required: ["max"] }, { required: ["maxNameBytes"] }],
    additionalProperties: false,
  }],
  messages: {
    tooLong: "Path too long: {{path}} ({{length}} > {{max}}).",
    nameTooLong: "Name too long: {{path}} ({{nameBytes}} bytes > {{maxNameBytes}}).",
    bothTooLong: "Path and name too long: {{path}} (path {{length}} > {{max}}; name {{nameBytes}} bytes > {{maxNameBytes}}).",
  },
};

const rule = {
  meta: {
    ...ruleMeta,
    // Budgets are user-supplied; the full inventory keeps external changes cache-safe.
    get defaultOptions() {
      return [defaultSnapshot()];
    },
  },
  create(context) {
    if (!isReportingFile(context)) return {};
    const { paths, max, maxNameBytes } = context.options[0];
    const longPaths = findLongPaths(paths, { max, maxNameBytes });
    return {
      Program() {
        for (const { path, length, nameBytes } of longPaths) {
          const pathTooLong = max !== undefined && length > max;
          const nameTooLong = maxNameBytes !== undefined && nameBytes > maxNameBytes;
          context.report({
            loc: { line: 1, column: 0 },
            messageId: pathTooLong ? (nameTooLong ? "bothTooLong" : "tooLong") : "nameTooLong",
            data: { path: JSON.stringify(path), length, max, nameBytes, maxNameBytes },
          });
        }
      },
    };
  },
};

export function createSnapshotRule(snapshot) {
  return { ...rule, meta: { ...ruleMeta, defaultOptions: [snapshot] } };
}

export default rule;
