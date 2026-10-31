import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";
import { join } from "node:path";
import { createConfig } from "../../../src/index.mjs";
import { findWindowsInvalidNames } from "../../../src/rules/no-windows-invalid-names/index.mjs";
import { fixture } from "../../fixture.mjs";

test("rejects reserved devices case-insensitively, with extensions and superscript digits", () => {
  const names = ["CON", "prn.txt", "Aux.tar.gz", "NUL", "COM1", "lpt9.log", "COM\u00b9.txt", "LPT\u00b2", "COM\u00b3", "CON .txt", "CONIN$", "conout$"];
  for (const path of names) {
    assert.deepEqual(findWindowsInvalidNames([path]), [
      { path, reasons: ["reserved device name"] },
    ]);
  }
  assert.deepEqual(findWindowsInvalidNames([
    "COM0", "COM10", "LPT0", "LPT10", "COM\u2074", ".CON", "CONSOLE.txt",
    "CONIN$.txt", "auxiliary", "nulled", "com1-backup", "console\u00a0",
  ]), []);
});

test("rejects forbidden characters and every discoverable ASCII control character", () => {
  const characters = ["<", ">", ":", "\"", "\\", "|", "?", "*"];
  for (let code = 1; code <= 31; code++) characters.push(String.fromCharCode(code));
  for (const character of characters) {
    const path = `bad${character}.txt`;
    assert.deepEqual(findWindowsInvalidNames([path]), [
      { path, reasons: ["forbidden characters"] },
    ]);
  }
  assert.deepEqual(findWindowsInvalidNames(["a:b"]), [
    { path: "a:b", reasons: ["forbidden characters"] },
  ]);
});

test("reports invalid parent names once and combines reasons in deterministic order", () => {
  const paths = ["good/CON/a.txt", "good/CON/b.txt", "bad?. /image.webp", "NUL. ", "NUL. "];
  const expected = [
    { path: "NUL. ", reasons: ["reserved device name", "trailing space or period"] },
    { path: "bad?. ", reasons: ["forbidden characters", "trailing space or period"] },
    { path: "good/CON", reasons: ["reserved device name"] },
  ];
  assert.deepEqual(findWindowsInvalidNames(paths), expected);
  assert.deepEqual(findWindowsInvalidNames([...paths].reverse()), expected);
});

test("preserves valid Unicode, dotfiles, leading spaces, and names beyond length limits", () => {
  assert.deepEqual(findWindowsInvalidNames([
    ".env", " leading.txt", "cafe\u0301.txt", "Stra\u00dfe", "\u65e5\u672c\u8a9e",
    "safe/child.txt", "a\u007f.txt", "ending\u00a0", "\u00e9".repeat(150),
  ]), []);
  for (const path of ["bad.", "bad ", "bad..."]) {
    assert.deepEqual(findWindowsInvalidNames([path]), [
      { path, reasons: ["trailing space or period"] },
    ]);
  }
});

test("rejects malformed logical paths instead of producing clean results", () => {
  assert.throws(() => findWindowsInvalidNames(null), /array/);
  for (const path of ["", "/absolute", "../parent", "a//b", "a/./b", "a\0b", "\ud800"]) {
    assert.throws(() => findWindowsInvalidNames([path]), /root-relative POSIX/);
  }
});

test("reports escaped names as warnings on one anchor without native fixes", async (context) => {
  const { root } = fixture(context);
  const config = createConfig({ root });
  config.rules["portable-paths/no-windows-invalid-names"] = ["warn", {
    anchor: join(root, "eslint.config.mjs"),
    invalidNames: findWindowsInvalidNames(["bad\n.txt", "CON.txt"]),
  }];
  const eslint = new ESLint({
    cwd: root, overrideConfigFile: true, overrideConfig: [config], fix: true,
  });
  const [result] = await eslint.lintFiles(["eslint.config.mjs"]);
  assert.equal(result.errorCount, 0);
  assert.equal(result.warningCount, 2);
  assert.deepEqual(result.messages.map((message) => message.message), [
    'Invalid Windows name: "CON.txt" (reserved device name).',
    'Invalid Windows name: "bad\\n.txt" (forbidden characters).',
  ]);
  assert(result.messages.every((message) =>
    message.ruleId === "portable-paths/no-windows-invalid-names" &&
    message.line === 1 && message.column === 1 && !message.fix));
  assert.equal(result.output, undefined);
});
