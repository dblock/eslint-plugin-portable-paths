import { caseFold } from "unicode-case-folding";
import { defaultSnapshot, isReportingFile, pathInventory } from "../../paths.mjs";

export function findCollisions(paths) {
  const groups = new Map();
  for (const path of pathInventory(paths)) {
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
      const { anchor, paths } = defaultSnapshot();
      return [{
        anchor,
        collisions: findCollisions(paths),
      }];
    },
  },
  create(context) {
    if (!isReportingFile(context)) return {};
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

export const snapshotRule = { ...rule, meta: ruleMeta };

export default rule;
