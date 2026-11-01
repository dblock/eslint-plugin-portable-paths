import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { ESLint } from "eslint";
import { createConfig } from "../../../src/index.mjs";
import { findLongPaths } from "../../../src/rules/max-pathname-length/index.mjs";
import { fixture } from "../../fixture.mjs";

test("accepts the exact limit and counts directories and separators", () => {
  assert.deepEqual(findLongPaths(["assets/image.webp"], { max: 17 }), []);
  assert.deepEqual(findLongPaths(["assets/images.webp"], { max: 17 }), [
    { path: "assets/images.webp", length: 18, nameBytes: 11 },
  ]);
});

test("counts original UTF-16 code units rather than bytes, code points, or normalized text", () => {
  assert.deepEqual(findLongPaths(["\u{1f600}/x"], { max: 3 }), [
    { path: "\u{1f600}/x", length: 4, nameBytes: 1 },
  ]);
  assert.deepEqual(findLongPaths(["caf\u00e9", "cafe\u0301"], { max: 4 }), [
    { path: "cafe\u0301", length: 5, nameBytes: 6 },
  ]);
  assert.deepEqual(findLongPaths(["\u00e9"], { max: 1 }), []);
});

test("deduplicates paths and reports over-limit directory prefixes deterministically", () => {
  const paths = ["aa/bbbb/d", "aa/bbbb/c", "aa/bbbb/c"];
  const expected = [
    { path: "aa/bbbb", length: 7, nameBytes: 4 },
    { path: "aa/bbbb/c", length: 9, nameBytes: 1 },
    { path: "aa/bbbb/d", length: 9, nameBytes: 1 },
  ];
  assert.deepEqual(findLongPaths(paths, { max: 6 }), expected);
  assert.deepEqual(findLongPaths([...paths].reverse(), { max: 6 }), expected);
});

test("requires at least one positive integer limit and rejects malformed paths", () => {
  assert.throws(() => findLongPaths([]), /Provide max or maxNameBytes/);
  assert.throws(() => findLongPaths([], { max: 20, typo: 1 }), /Unknown option/);
  for (const key of ["max", "maxNameBytes"]) {
    for (const value of [null, 0, -1, 1.5, "20", true, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => findLongPaths([], { [key]: value }), /positive safe integer/);
    }
  }
  assert.throws(() => findLongPaths(null, { max: 20 }), /array/);
  for (const path of ["", "/absolute", "../parent", "a//b", "a\0b", "\ud800"]) {
    assert.throws(() => findLongPaths([path], { max: 20 }), /root-relative POSIX/);
  }
});

test("validates user limits through the ESLint rule schema", async (context) => {
  const { root } = fixture(context);
  for (const settings of [{}, { max: 0 }, { max: 1.5 }, { max: "20" }, { max: Number.MAX_SAFE_INTEGER + 1 }, { maxNameBytes: 0 }, { maxNameBytes: "255" }]) {
    const config = createConfig({ root });
    config.rules["portable-paths/max-pathname-length"] = ["error", settings];
    const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [config] });
    await assert.rejects(eslint.lintFiles(["eslint.config.mjs"]), /max-pathname-length/);
  }
});

test("reports warnings without fixes and invalidates cached findings when the limit changes", async (context) => {
  const { directory, root } = fixture(context);
  const lint = (max) => {
    const config = createConfig({ root });
    config.rules["portable-paths/max-pathname-length"] = ["warn", {
      max, paths: ["assets/images.webp"], anchor: join(root, "eslint.config.mjs"),
    }];
    return new ESLint({
      cwd: root, overrideConfigFile: true, overrideConfig: [config],
      cache: true, cacheLocation: join(directory, "eslintcache"), fix: true,
    }).lintFiles(["eslint.config.mjs"]);
  };
  assert.equal((await lint(18))[0].warningCount, 0);
  const [result] = await lint(17);
  assert.equal(result.errorCount, 0);
  assert.equal(result.warningCount, 1);
  assert.equal(result.messages[0].message, 'Path too long: "assets/images.webp" (18 > 17).');
  assert.equal(result.messages[0].ruleId, "portable-paths/max-pathname-length");
  assert.equal(result.messages[0].line, 1);
  assert.equal(result.messages[0].column, 1);
  assert.equal(result.messages[0].fix, undefined);
  assert.equal(result.output, undefined);
  assert.equal((await lint(18))[0].warningCount, 0);
});

test("counts each filename in UTF-8 bytes without repeating invalid parents", () => {
  assert.deepEqual(findLongPaths(["\u00e9\u00e9"], { maxNameBytes: 4 }), []);
  assert.deepEqual(findLongPaths(["\u00e9".repeat(150)], { max: 200, maxNameBytes: 255 }), [
    { path: "\u00e9".repeat(150), length: 150, nameBytes: 300 },
  ]);
  assert.deepEqual(findLongPaths([
    "short/\u00e9\u00e9\u00e9/file", "short/\u00e9\u00e9\u00e9/other",
  ], { maxNameBytes: 5 }), [
    { path: "short/\u00e9\u00e9\u00e9", length: 9, nameBytes: 6 },
  ]);
});

test("reports either budget independently and returns both metrics for combined violations", () => {
  const paths = ["ab/\u00e9\u00e9\u00e9"];
  const expected = [{ path: paths[0], length: 6, nameBytes: 6 }];
  assert.deepEqual(findLongPaths(paths, { max: 5, maxNameBytes: 6 }), expected);
  assert.deepEqual(findLongPaths(paths, { max: 6, maxNameBytes: 5 }), expected);
  assert.deepEqual(findLongPaths(paths, { max: 5, maxNameBytes: 5 }), expected);
  assert.deepEqual(findLongPaths(paths, { max: 6, maxNameBytes: 6 }), []);
});

test("accepts name-only settings and combines two exceeded budgets in one diagnostic", async (context) => {
  const { root } = fixture(context);
  for (const [limits, messageId, message] of [
    [{ maxNameBytes: 5 }, "nameTooLong", 'Name too long: "ab/\u00e9\u00e9\u00e9" (6 bytes > 5).'],
    [{ max: 5, maxNameBytes: 5 }, "bothTooLong", 'Path and name too long: "ab/\u00e9\u00e9\u00e9" (path 6 > 5; name 6 bytes > 5).'],
  ]) {
    const config = createConfig({ root });
    config.rules["portable-paths/max-pathname-length"] = ["error", {
      ...limits, paths: ["ab/\u00e9\u00e9\u00e9"],
    }];
    const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [config] });
    const [result] = await eslint.lintFiles(["eslint.config.mjs"]);
    assert.equal(result.errorCount, 1);
    assert.equal(result.messages[0].messageId, messageId);
    assert.equal(result.messages[0].message, message);
    assert.equal(result.messages[0].fix, undefined);
  }
});
