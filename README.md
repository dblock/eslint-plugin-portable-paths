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
import { createConfig } from "eslint-plugin-portable-paths";

export default [createConfig({ root: import.meta.dirname })];
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

The helper scans names under `root`, including dotfiles, binary filenames, symlinks, and empty directories. It never reads file contents or follows descendant symlinks.

Each collision group produces one ordinary ESLint error on the first line of `eslint.config.mjs`, listing all conflicting paths. The configuration file is a **reporting anchor**, not the only file being checked. This lets a project-wide rule report binary and directory-only collisions without trying to parse every file as JavaScript.

The anchor must be an existing regular JavaScript file included in your ESLint invocation and not ignored by ESLint. For a different configuration filename:

```js
createConfig({
  root: import.meta.dirname,
  reportOn: "eslint.config.js",
});
```

`root` defaults to the current working directory. `reportOn` defaults to `eslint.config.mjs` and must be a literal, root-relative POSIX path, not a glob. Narrow invocations such as `eslint src/` do not run the project-wide check if they omit the anchor.

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

`createConfig` scans once when the configuration is evaluated and embeds collision groups in the rule options. A changed collision set changes ESLint's configuration cache key, so an unchanged reporting anchor is rechecked on a fresh CLI invocation with `--cache`.

This MVP targets fresh CLI runs. Editors, watch processes, and long-lived Node API integrations must rebuild the configuration after path changes; the plugin does not watch the filesystem. Discovery is not an atomic filesystem transaction.

The rule's `collisions` option is supplied by `createConfig`. Registering the rule without the helper does not automatically discover files.

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
