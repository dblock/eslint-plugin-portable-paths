import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, toNamespacedPath } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { scanPaths } from "../src/paths.mjs";
import { fixture } from "./fixture.mjs";

test("rejects invalid scanner options instead of silently skipping them", (context) => {
  const { root } = fixture(context);
  assert.throws(() => scanPaths(root, { ignores: ["!vendor/**"] }), /positive/);
  assert.throws(() => scanPaths(root, { ignores: ["/absolute"] }), /positive/);
  assert.throws(() => scanPaths(root, { ignore: [] }), /Unknown option: ignore/);
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
  assert(scanPaths(root, { ignores: [] }).includes("node_modules/Dependency.js"));
  assert(!scanPaths(root, { ignores: ["Wrong.webp"] }).includes("Wrong.webp"));
});

test("retains Windows-invalid directory spellings and their descendants", (context) => {
  const { root } = fixture(context);
  const directory = toNamespacedPath(join(root, "assets."));
  mkdirSync(directory);
  writeFileSync(join(directory, "image.webp"), new Uint8Array([0, 255]));
  assert.deepEqual(scanPaths(root), [
    "assets.", "assets./image.webp", "eslint.config.mjs",
  ]);
});
