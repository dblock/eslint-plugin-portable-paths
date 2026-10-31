import { defaultSnapshot, isReportingFile, pathInventory } from "../../paths.mjs";

const reservedDevice = /^(?:CON|PRN|AUX|NUL|COM[1-9\u00b9\u00b2\u00b3]|LPT[1-9\u00b9\u00b2\u00b3])$/i;
const reservedConsole = /^(?:CONIN\$|CONOUT\$)$/i;
const forbiddenCharacters = /[<>:"\\|?*\u0000-\u001f]/;
const reasons = ["reserved device name", "forbidden characters", "trailing space or period"];

export function findWindowsInvalidNames(paths) {
  const invalidNames = [];
  for (const path of pathInventory(paths)) {
    const name = path.split("/").at(-1);
    const stem = name.split(".")[0].replace(/ +$/, "");
    const failures = [];
    if (reservedDevice.test(stem) || reservedConsole.test(name)) failures.push(reasons[0]);
    if (forbiddenCharacters.test(name)) failures.push(reasons[1]);
    if (/[ .]$/.test(name)) failures.push(reasons[2]);
    if (failures.length) invalidNames.push({ path, reasons: failures });
  }
  return invalidNames;
}

const ruleMeta = {
  type: "problem",
  docs: {
    description: "Detect file and directory names incompatible with Windows.",
    url: "https://github.com/dblock/eslint-plugin-portable-paths/blob/main/src/rules/no-windows-invalid-names/README.md",
  },
  schema: [{
    type: "object",
    properties: {
      anchor: { type: "string", minLength: 1 },
      invalidNames: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string", minLength: 1 },
            reasons: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { enum: reasons },
            },
          },
          required: ["path", "reasons"],
          additionalProperties: false,
        },
      },
    },
    required: ["invalidNames"],
    additionalProperties: false,
  }],
  messages: {
    invalidName: "Invalid Windows name: {{path}} ({{reasons}}).",
  },
};

const rule = {
  meta: {
    ...ruleMeta,
    // Snapshot defaults participate in ESLint's cache key, even for cached files.
    get defaultOptions() {
      const { anchor, paths } = defaultSnapshot();
      return [{ anchor, invalidNames: findWindowsInvalidNames(paths) }];
    },
  },
  create(context) {
    if (!isReportingFile(context)) return {};
    const { invalidNames } = context.options[0];
    return {
      Program() {
        for (const { path, reasons } of invalidNames) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: "invalidName",
            data: { path: JSON.stringify(path), reasons: reasons.join(", ") },
          });
        }
      },
    };
  },
};

export const snapshotRule = { ...rule, meta: ruleMeta };

export default rule;
