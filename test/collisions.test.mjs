import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { ESLint } from "eslint";
import plugin, { createConfig, findCollisions, scanPaths } from "../index.mjs";

function fixture(context) {
  const directory = mkdtempSync(join(tmpdir(), "portable-paths-test-"));
  context.after(() => rmSync(directory, { recursive: true }));
  const root = join(directory, "project");
  mkdirSync(root);
  writeFileSync(join(root, "eslint.config.mjs"), "export default [];\n");
  return { directory, root };
}

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

test("rejects invalid paths and options instead of silently skipping them", (context) => {
  const { root } = fixture(context);
  for (const path of ["", "/absolute", "../parent", "a//b", "a/./b", "\ud800", "a\0b"]) {
    assert.throws(() => findCollisions([path]), /root-relative POSIX/);
  }
  assert.throws(() => findCollisions(null), /array/);
  assert.throws(() => scanPaths(root, { ignore: ["!vendor/**"] }), /positive/);
  assert.throws(() => scanPaths(root, { ignore: ["/absolute"] }), /positive/);
  assert.throws(() => createConfig({ root, reportOn: "*.mjs" }), /literal/);
  assert.throws(() => createConfig({ root, typo: true }), /Unknown option/);
  assert.throws(() => createConfig({ root, reportOn: "missing.mjs" }), /ENOENT/);
});

test("scans dotfiles, binary files, empty directories, and symlinks without following targets", (context) => {
  const { directory, root } = fixture(context);
  writeFileSync(join(root, ".env"), "");
  writeFileSync(join(root, "Wrong.webp"), new Uint8Array([0, 255, 0]));
  mkdirSync(join(root, "Empty"));
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, "node_modules", "Dependency.js"), "");
  mkdirSync(join(root, ".git"));
  writeFileSync(join(root, ".git", "HEAD"), "");
  const outside = join(directory, "outside");
  mkdirSync(outside);
  writeFileSync(join(outside, "Outside.js"), "");
  symlinkSync(outside, join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
  assert.deepEqual(scanPaths(root), [
    ".env", "Empty", "Wrong.webp", "eslint.config.mjs", "linked",
  ]);
  assert(scanPaths(root, { ignore: [] }).includes("node_modules/Dependency.js"));
  assert(!scanPaths(root, { ignore: ["Wrong.webp"] }).includes("Wrong.webp"));
});

test("creates one reporting anchor while scanning names ESLint need not parse", async (context) => {
  const { directory, root } = fixture(context);
  writeFileSync(join(root, "README"), "not JavaScript");
  writeFileSync(join(root, "image.webp"), new Uint8Array([0, 255]));
  const config = createConfig({ root });
  assert.deepEqual(config.files, ["eslint.config.mjs"]);
  const eslint = new ESLint({ cwd: directory, overrideConfigFile: true, overrideConfig: [config] });
  const results = await eslint.lintFiles(["project"]);
  assert.equal(results.length, 1);
  assert.equal(results[0].fatalErrorCount, 0);
  assert.equal(results[0].errorCount, 0);
});

test("composes the recommended preset with normal registration and a namespace alias", async (context) => {
  const { root } = fixture(context);
  writeFileSync(join(root, "other.mjs"), "export default 1;\n");
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [
      plugin.configs.recommended,
      {
        plugins: { "portable-paths": plugin, paths: plugin },
        rules: {
          "portable-paths/no-case-collisions": "off",
          "paths/no-case-collisions": ["warn", {
            anchor: join(root, "eslint.config.mjs"),
            collisions: findCollisions(["Logo.svg", "logo.svg"]),
          }],
        },
      },
    ],
  });
  const results = await eslint.lintFiles(["."]);
  assert.equal(results.length, 2);
  assert.equal(results.reduce((count, result) => count + result.warningCount, 0), 1);
  assert.equal(results.reduce((count, result) => count + result.errorCount, 0), 0);
  assert.equal(results.find((result) => result.warningCount).messages[0].ruleId, "paths/no-case-collisions");
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
  const single = (await lint(["Logo.svg", "logo.svg"], true))[0];
  assert.equal(single.output, undefined);
  const formatter = await new ESLint({ cwd: root, overrideConfigFile: true }).loadFormatter("stylish");
  const output = stripVTControlCharacters(formatter.format([single]))
    .replace(single.filePath, "/path/to/project/eslint.config.mjs")
    .trim();
  const readme = readFileSync(resolve(import.meta.dirname, "..", "README.md"), "utf8");
  const documented = readme.match(/```text\n([\s\S]*?)\n```/);
  assert(documented, "README must include example output.");
  assert.equal(output, documented[1].trim());
  assert.equal((await lint(["Logo.svg"]))[0].errorCount, 0);
});
