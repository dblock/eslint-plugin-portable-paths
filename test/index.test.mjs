import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ESLint } from "eslint";
import plugin, { createConfig, findCollisions } from "../src/index.mjs";
import { fixture } from "./fixture.mjs";

test("rejects invalid configuration options instead of silently skipping them", (context) => {
  const { root } = fixture(context);
  assert.throws(() => createConfig({ root, ignore: [] }), /Unknown option: ignore/);
  assert.throws(() => createConfig({ root, reportOn: "*.mjs" }), /literal/);
  assert.throws(() => createConfig({ root, typo: true }), /Unknown option/);
  assert.throws(() => createConfig({ root, reportOn: "missing.mjs" }), /ENOENT/);
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
