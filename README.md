# eslint-plugin-portable-paths

ESLint checks for portable filesystem paths. The MVP provides one rule, `portable-paths/no-case-collisions`, comparing file and directory names across a filesystem inventory. No Git, file-content parser, or network access is required at runtime.

## Installation

Requires Node.js 22.18+ and ESLint 9.39+ or 10.x. This repository is not published to npm yet. To try the GitHub version:

```sh
npm install --save-dev eslint github:dblock/eslint-plugin-portable-paths
```

## Usage

Add this to `eslint.config.mjs`:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [
  {
    plugins: { "portable-paths": portablePaths },
    rules: { "portable-paths/no-case-collisions": "error" },
  },
];
```

Or use the recommended preset, which registers the plugin and enables its rule:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [portablePaths.configs.recommended];
```

Run:

```sh
npx eslint .
```

For files named `Logo.svg` and `logo.svg`, example output is:

```text
/path/to/project/eslint.config.mjs
  1:1  error  Paths collide under NFC normalization and Unicode case folding: "Logo.svg", "logo.svg"  portable-paths/no-case-collisions

✖ 1 problem (1 error, 0 warnings)
```

The absolute project path is shortened here. This example requires a filesystem that can retain both spellings; a case-insensitive filesystem may collapse or overwrite one. Collisions are reported, never automatically renamed.

## Reporting

Standard registration and the recommended preset scan the current process working directory, including dotfiles, binary filenames, symlinks, and empty directories. Run ESLint from the project root; there is no Git-root discovery. The scanner never reads file contents or follows descendant symlinks.

Each collision group produces one ordinary ESLint error on the first line of the reporting anchor, listing all conflicting paths. By default, the anchor is the first existing regular file among `eslint.config.js`, `eslint.config.mjs`, and `eslint.config.cjs`, in that order. The configuration file is a **reporting anchor**, not the only file being checked. This lets a project-wide rule report binary and directory-only collisions without trying to parse every file as JavaScript, and avoids duplicate reports when other JavaScript files are linted.

The anchor must be included in your ESLint invocation and not ignored by ESLint. For a custom root or reporting file, the optional helper supplies an explicit snapshot:

```js
import { createConfig } from "eslint-plugin-portable-paths";

export default [createConfig({
  root: import.meta.dirname,
  reportOn: "tools/report.js",
})];
```

For the helper, `root` defaults to the current working directory and `reportOn` defaults to `eslint.config.mjs`; `reportOn` must name an existing regular JavaScript file using a literal, root-relative POSIX path, not a glob. Programmatic callers with an ESLint `cwd` different from the process working directory should use the helper with an explicit `root`. The helper supplies its own scoped plugin registration; do not combine it with the default plugin or preset under the same namespace.

Narrow invocations such as `eslint src/` do not run the project-wide check if they omit the anchor.

## Inventory Scope

The default scanner ignores `**/.git/**` and `**/node_modules/**`. These are explicit inventory defaults, not inferred Git or ESLint exclusions.

```js
createConfig({
  root: import.meta.dirname,
  ignore: ["**/.git/**", "**/node_modules/**", "vendor/**"],
});
```

`ignore` replaces the defaults; `ignore: []` scans every discoverable entry under the root. Patterns are positive, root-relative POSIX globs and include dotfiles. Ignored directories are pruned. ESLint's own ignores do not remove inventory counterparts.

Unreadable directories, malformed options, and filenames that cannot be represented as valid UTF-8 are errors, not clean results.

## Rules

### no-case-collisions

Configure this rule with `"error"` or `"warn"`, or disable it with `"off"`. Filesystem snapshots and anchors are supplied automatically; the `collisions` and `anchor` rule options are internal snapshot data, not ordinary user settings. Use `createConfig()` for custom inventory exclusions, roots, or anchors.

Paths are compared using `caseFold(path.normalize("NFC")).normalize("NFC")`, with the full default Unicode folding table from the pinned `unicode-case-folding` dependency.

Examples:

| Paths | Collision |
| --- | --- |
| `Logo.svg`, `logo.svg` | Filename case. |
| `Src/a.js`, `src/b.js` | Directory spellings `Src` and `src`. |
| File `ReadMe`, directory `readme/` | File-versus-directory case. |
| `Straße.txt`, `STRASSE.txt` | Full Unicode case folding. |
| Composed and decomposed `é` | NFC-equivalent spellings. |

Original spellings are preserved in diagnostics. Directory prefixes participate independently, so nested conflicts can produce both directory and descendant-path findings. Exact duplicates are deduplicated.

This is a deterministic, conservative portability policy, **not exact emulation of Windows or macOS**. It does not apply compatibility normalization or Turkish-specific folding. It does not enforce lowercase, reject Windows reserved names, or check path lengths. Names are never renamed, including under `--fix`.

A filesystem inventory can only discover names the host filesystem actually retains. On a case-insensitive filesystem, it cannot reconstruct a second spelling that was already collapsed or overwritten.

## Snapshots and ESLint Caching

For standard registration and the recommended preset, ESLint evaluates the rule's default options during configuration normalization, before checking cached results. Those defaults contain the filesystem collision snapshot and reporting anchor. A changed collision set changes ESLint's configuration cache key, so an unchanged reporting anchor is rechecked on a fresh CLI invocation with `--cache`.

ESLint also normalizes defaults for configured `"off"` entries; omit the rule entry entirely if no inventory scan is wanted. The helper instead scans once during `createConfig()` evaluation and supplies explicit snapshot options without evaluating the working-directory defaults.

This MVP targets fresh CLI runs. Editors, watch processes, and long-lived Node API integrations must rebuild the configuration after path changes; the plugin does not watch the filesystem. Discovery is not an atomic filesystem transaction.

Importing the plugin or accessing its preset does not scan the filesystem by itself.

## Programmatic API

```js
import { findCollisions, scanPaths } from "eslint-plugin-portable-paths";

const paths = scanPaths("/path/to/project", { ignore: [] });
const collisions = findCollisions(paths);
```

`scanPaths` returns sorted root-relative POSIX paths. `findCollisions` accepts such paths, infers directory prefixes, and returns deterministic groups of original spellings. Neither function mutates paths.

## Development

```sh
npm ci
npm run check
npm pack --dry-run
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and data-driven CLI acceptance suite, [DESIGN.md](DESIGN.md) for the filesystem inventory, reporting, and caching architecture, and [AGENTS.md](AGENTS.md) for automated contributor instructions.

## License

MIT. See [LICENSE](LICENSE).
