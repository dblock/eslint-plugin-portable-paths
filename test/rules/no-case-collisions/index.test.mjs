import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { ESLint } from "eslint";
import { createConfig } from "../../../src/index.mjs";
import { findCollisions } from "../../../src/rules/no-case-collisions/index.mjs";
import { fixture } from "../../fixture.mjs";

test("groups files, inferred directory prefixes, and file/directory conflicts", () => {
  assert.deepEqual(findCollisions([
    "Logo.webp", "logo.webp",
    "Src/a.js", "src/b.js",
    "ReadMe", "readme/child.txt",
    "Logo.webp",
  ]), [
    ["Logo.webp", "logo.webp"],
    ["ReadMe", "readme"],
    ["Src", "src"],
  ]);
});

test("uses NFC and full default Unicode folding without compatibility folding", () => {
  assert.deepEqual(findCollisions([
    "Straße.txt", "STRASSE.txt",
    "caf\u00e9.txt", "cafe\u0301.txt",
    "\u03c3.txt", "\u03c2.txt",
    "i.txt", "\u0130.txt",
    "\uff21.txt", "a.txt",
  ]), [
    ["STRASSE.txt", "Straße.txt"],
    ["cafe\u0301.txt", "caf\u00e9.txt"],
    ["\u03c2.txt", "\u03c3.txt"],
  ]);
});

test("preserves original spellings and reports deterministic nested groups", () => {
  const paths = ["Foo/Logo.svg", "foo/logo.svg", "Foo/Logo.svg"];
  const expected = [
    ["Foo", "foo"],
    ["Foo/Logo.svg", "foo/logo.svg"],
  ];
  assert.deepEqual(findCollisions(paths), expected);
  assert.deepEqual(findCollisions([...paths].reverse()), expected);
  assert.deepEqual(findCollisions(["new-name.svg"]), []);
});

test("rejects invalid collision paths instead of silently skipping them", () => {
  for (const path of ["", "/absolute", "../parent", "a//b", "a/./b", "\ud800", "a\0b"]) {
    assert.throws(() => findCollisions([path]), /root-relative POSIX/);
  }
  assert.throws(() => findCollisions(null), /array/);
});

test("reports one finding per group without fixes, and invalidates cached findings", async (context) => {
  const { directory, root } = fixture(context);
  const makeConfig = (paths) => {
    const config = createConfig({ root });
    config.rules["portable-paths/no-case-collisions"][1].collisions = findCollisions(paths);
    return config;
  };
  const lint = (paths, fix = false) => new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [makeConfig(paths)],
    cache: true,
    cacheLocation: join(directory, "eslintcache"),
    fix,
  }).lintFiles(["eslint.config.mjs"]);
  assert.equal((await lint(["Logo.svg"]))[0].errorCount, 0);
  const result = (await lint(["Logo.svg", "logo.svg", "Src/a", "src/b"]))[0];
  assert.equal(result.errorCount, 2);
  assert(result.messages[0].message.includes('"Logo.svg", "logo.svg"'));
  assert.equal(result.messages[0].ruleId, "portable-paths/no-case-collisions");
  assert.equal(result.messages[0].line, 1);
  assert(!result.messages.some((message) => message.fix));
  const single = (await lint(["public/Logo.svg", "public/logo.svg"], true))[0];
  assert.equal(single.output, undefined);
  const formatter = await new ESLint({ cwd: root, overrideConfigFile: true }).loadFormatter("stylish");
  const output = stripVTControlCharacters(formatter.format([single]))
    .replace(single.filePath, "eslint.config.mjs")
    .trim();
  const readme = readFileSync(resolve(import.meta.dirname, "../../..", "README.md"), "utf8");
  const documented = readme.match(/Example output:\n\n```text\n([\s\S]*?)\n```/);
  assert(documented, "README must include example output.");
  assert.equal(output, documented[1].trim());
  assert.equal((await lint(["Logo.svg"]))[0].errorCount, 0);
});
