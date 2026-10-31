import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, readlinkSync, realpathSync, rmSync, writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep, toNamespacedPath } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function snapshot(root) {
  return Object.fromEntries(readdirSync(root).sort().map((name) => {
    const path = toNamespacedPath(join(root, name));
    const entry = lstatSync(path);
    const metadata = { mode: entry.mode, mtimeMs: entry.mtimeMs };
    if (entry.isSymbolicLink()) {
      return [name, { ...metadata, target: readlinkSync(path) }];
    }
    if (entry.isDirectory()) {
      return [name, { ...metadata, directory: snapshot(path) }];
    }
    assert(entry.isFile(), `Unexpected fixture entry: ${path}`);
    return [name, { ...metadata, bytes: readFileSync(path) }];
  }));
}

function within(root, path) {
  assert.equal(typeof path, "string");
  assert(path && !path.split("/").some((part) => !part || part === "." || part === ".."));
  const absolute = resolve(root, ...path.split("/"));
  assert(absolute.startsWith(`${root}${sep}`), `Path escapes fixture root: ${path}`);
  return toNamespacedPath(absolute);
}

function addFiles(project, files = []) {
  assert(Array.isArray(files));
  for (const file of files) {
    assert(Array.isArray(file.bytes));
    assert(file.bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255));
    const path = within(project, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, new Uint8Array(file.bytes));
  }
}

function normalize(value, project) {
  if (typeof value === "string" && value.startsWith(`${project}${sep}`)) {
    return `<project>/${value.slice(project.length + 1).split(sep).join("/")}`;
  }
  if (Array.isArray(value)) return value.map((item) => normalize(item, project));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key, item]) => {
      if (key !== "nodeType") return true;
      assert.equal(item, null, "Project diagnostics must not attach AST nodes.");
      return false;
    }).map(([key, item]) => [
      key, normalize(item, project),
    ]));
  }
  return value;
}

function createProject(path, githubActions) {
  mkdirSync(path);
  if (githubActions && process.platform === "win32") {
    execFileSync("fsutil.exe", ["file", "setCaseSensitiveInfo", path, "enable"], {
      stdio: ["ignore", "pipe", "pipe"], timeout: 30000,
    });
  }
  writeFileSync(join(path, "CASE-PROBE"), "");
  writeFileSync(join(path, "case-probe"), "");
  const names = readdirSync(path);
  for (const name of names) rmSync(join(path, name));
  const caseSensitive = names.length === 2;
  if (githubActions) {
    assert(caseSensitive, "GitHub integration filesystem must retain case-distinct names.");
  }
  return caseSensitive;
}

export function createConsumer(context) {
  const githubActions = process.env.GITHUB_ACTIONS === "true";
  const root = realpathSync(mkdtempSync(join(tmpdir(), "portable paths integration \u03bb ")));
  const projects = join(root, "case sensitive projects");
  mkdirSync(projects);
  context.after(() => {
    if (process.platform === "darwin" && lstatSync(projects).dev !== lstatSync(root).dev) {
      execFileSync("hdiutil", ["detach", projects], {
        stdio: ["ignore", "pipe", "pipe"], timeout: 60000,
      });
    }
    rmSync(root, { recursive: true });
  });
  if (githubActions && process.platform === "darwin") {
    const image = join(root, "case-sensitive.dmg");
    execFileSync("hdiutil", [
      "create", "-size", "64m", "-fs", "Case-sensitive HFS+",
      "-volname", "portable-paths-tests", "-nospotlight", image,
    ], { stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
    execFileSync("hdiutil", ["attach", "-nobrowse", "-mountpoint", projects, image], {
      stdio: ["ignore", "pipe", "pipe"], timeout: 60000,
    });
  }
  assert(process.env.npm_execpath, "Run integration tests through npm test.");
  const npm = (args, cwd) => execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000,
  });
  const source = fileURLToPath(new URL("../", import.meta.url));
  const [archive] = JSON.parse(npm([
    "pack", "--ignore-scripts", "--json", "--pack-destination", root,
  ], source));
  assert(archive.files.some((file) => file.path === "src/index.mjs"));
  assert(archive.files.some((file) => file.path === "src/paths.mjs"));
  assert(archive.files.some((file) => file.path === "src/rules/no-case-collisions/index.mjs"));
  assert(archive.files.some((file) => file.path === "src/rules/no-case-collisions/README.md"));
  assert(archive.files.some((file) => file.path === "src/rules/no-windows-invalid-names/index.mjs"));
  assert(archive.files.some((file) => file.path === "src/rules/no-windows-invalid-names/README.md"));
  assert(!archive.files.some((file) => /^(?:test|fixtures)\//.test(file.path)));
  const sourceRequire = createRequire(join(source, "package.json"));
  const eslint = JSON.parse(readFileSync(sourceRequire.resolve("eslint/package.json"), "utf8"));
  const manifest = join(root, "package.json");
  writeFileSync(manifest, JSON.stringify({
    private: true, type: "module",
    dependencies: {
      eslint: eslint.version,
      "eslint-plugin-portable-paths": `file:${join(root, archive.filename)}`,
    },
  }));
  npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error"], root);
  const require = createRequire(manifest);
  const binary = join(dirname(require.resolve("eslint/package.json")), "bin", "eslint.js");
  const dependencies = snapshot(join(root, "node_modules"));
  const offline = new URL("./offline.mjs", import.meta.url).href;
  return {
    run(testContext, fixture) {
      const definition = JSON.parse(readFileSync(join(fixture, "command.json"), "utf8"));
      if ("requiresCaseSensitiveFilesystem" in definition) {
        assert.equal(typeof definition.requiresCaseSensitiveFilesystem, "boolean");
      }
      const scenario = mkdtempSync(join(projects, "scenario \u03bb "));
      testContext.after(() => rmSync(scenario, { recursive: true }));
      const project = join(scenario, "project files");
      const caseSensitive = createProject(project, githubActions);
      if (definition.requiresCaseSensitiveFilesystem && !caseSensitive) {
        testContext.skip("Requires a case-sensitive filesystem; mandatory on GitHub runners.");
        return;
      }
      // Node 22's native Windows copy can silently omit Unicode destinations (nodejs/node#61878).
      cpSync(join(fixture, "project"), project, { recursive: true, filter: () => true });
      addFiles(project, definition.files);
      const steps = definition.steps === undefined ? [definition] : definition.steps;
      assert(Array.isArray(steps) && steps.length);
      for (const step of steps) {
        if (step !== definition) addFiles(project, step.files);
        const removals = step.removeFiles === undefined ? [] : step.removeFiles;
        assert(Array.isArray(removals));
        for (const path of removals) rmSync(within(project, path));
        assert(Array.isArray(step.command) && step.command[0] === "eslint");
        assert(step.command.every((argument) => typeof argument === "string"));
        const expected = JSON.parse(readFileSync(within(fixture, step.expected), "utf8"));
        const before = snapshot(project);
        const result = spawnSync(process.execPath, [
          binary,
          ...step.command.slice(1).map((argument) =>
            argument === "<cache>" ? join(scenario, "eslintcache") : argument),
        ], {
          cwd: project, encoding: "utf8", timeout: 60000,
          env: {
            ...process.env,
            FORCE_COLOR: "0",
            npm_config_offline: "true",
            NODE_OPTIONS: `--import ${offline}`,
          },
        });
        assert.ifError(result.error);
        assert.equal(result.signal, null, result.stderr);
        assert.equal(result.status, expected.exitCode, result.stderr);
        if (typeof expected.stdout === "string") {
          assert.equal(result.stdout, expected.stdout);
        } else {
          assert(Array.isArray(expected.stdout));
          assert.deepEqual(normalize(JSON.parse(result.stdout), project), expected.stdout);
        }
        assert(("stderr" in expected) !== ("stderrPattern" in expected));
        if ("stderrPattern" in expected) {
          assert.match(result.stderr, new RegExp(expected.stderrPattern));
        } else {
          assert.equal(result.stderr, expected.stderr);
        }
        assert.deepEqual(snapshot(project), before, "CLI execution must not modify project files.");
      }
    },
    unchanged() {
      assert.deepEqual(snapshot(join(root, "node_modules")), dependencies);
    },
  };
}
