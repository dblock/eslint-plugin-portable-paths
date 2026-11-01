# no-case-collisions

Detect file and directory names that can conflict on another filesystem, including assets and binary filenames. The checker reads names, not file contents, and never renames anything.

## What It Catches

| Paths | Problem |
| --- | --- |
| `Logo.svg`, `logo.svg` | Filenames differ only in case. |
| `Src/a.js`, `src/b.js` | Directory spellings `Src` and `src` conflict. |
| File `ReadMe`, directory `readme/` | A file and directory differ only in case. |
| `Straße.txt`, `STRASSE.txt` | Unicode-aware case matching treats these names as equivalent. |
| Two spellings of `café.txt` | The same accented letter can be stored as one character or as a letter followed by an accent. |

Original spellings remain in diagnostics. Directory prefixes participate independently, so nested conflicts can produce both directory and descendant-path findings. Exact duplicates are deduplicated.

The comparison is a conservative portability policy, not exact emulation of Windows or macOS. It does not enforce lowercase, reject Windows reserved names, or check path lengths. It does not equate every visually similar character, use compatibility normalization, or apply Turkish-specific case matching. See [DESIGN.md](../../../DESIGN.md#collision-groups) for the precise algorithm.

The scanner can only discover names the host filesystem actually retains. It cannot reconstruct a spelling that a case-insensitive filesystem has already collapsed or overwritten.

## Configuration

Register the plugin and enable the rule:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: { "portable-paths/no-case-collisions": "error" },
}];
```

The recommended preset registers the plugin and enables the collision and Windows-name checks:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [portablePaths.configs.recommended];
```

Use `"error"` or `"warn"` to choose severity, or `"off"` to disable reporting. Filesystem snapshots and anchors are supplied automatically; the `collisions` and `anchor` rule options are internal snapshot data, not ordinary user settings.

## Reporting

Standard registration and the recommended preset scan the current process working directory. Run ESLint from the project root; there is no Git-root discovery.

Each collision group produces one error or warning on the first line of a reporting anchor, listing all conflicting paths. By default, the anchor is the first existing regular file among `eslint.config.js`, `eslint.config.mjs`, and `eslint.config.cjs`, in that order.

The anchor is not the only file being checked. It allows project-wide findings for binary files and directories without parsing their contents, and avoids duplicate reports when other JavaScript files are linted.

The anchor must be included in the ESLint invocation and not ignored. A narrowed invocation such as `eslint src/` does not run the project-wide check if it omits the anchor.

For a custom root or reporting file, use the optional [configuration helper](../../../API.md#createconfig):

```js
import { createConfig } from "eslint-plugin-portable-paths";

export default [createConfig({
  root: import.meta.dirname,
  reportOn: "tools/report.js",
})];
```

The helper enables the collision and Windows-name checks. Its `root` defaults to the current working directory and `reportOn` defaults to `eslint.config.mjs`. The reporting file must exist and be a regular JavaScript file, named using a literal, root-relative POSIX path rather than a glob.

Programmatic callers with an ESLint `cwd` different from the process working directory should use the helper with an explicit `root`. Its scoped plugin registration must not be combined with the default plugin or preset under the same namespace.

## Inventory Scope

The inventory includes dotfiles, binary filenames, symlinks, and empty directories. File contents are never read, and descendant symlinks are not followed.

The default scanner excludes `**/.git/**` and `**/node_modules/**`. These are explicit inventory defaults, not inferred Git or ESLint exclusions. For plugin-wide configuration and examples, see the [main README](../../../README.md#configuration).

`ignores` replaces the defaults; `ignores: []` scans every discoverable entry under the root. Patterns are positive, root-relative POSIX globs and include dotfiles. Ignored directories are pruned. ESLint's own file-selection ignores do not remove inventory counterparts.

Unreadable directories, malformed options, and filenames that cannot be represented as valid UTF-8 are errors, not clean results.

## Caching and Long-Lived Processes

For standard registration and the recommended preset, ESLint evaluates the rule's default options during configuration normalization, before checking cached results. Those defaults contain the filesystem collision snapshot and reporting anchor. A changed collision set changes the configuration cache key, so a fresh CLI invocation with `--cache` rechecks an unchanged anchor when a counterpart appears or disappears.

ESLint also normalizes defaults for configured `"off"` entries; omit the rule entry entirely if no inventory scan is wanted. The helper instead scans once during `createConfig()` evaluation and supplies explicit snapshot options without evaluating working-directory defaults.

Fresh CLI runs are the supported lifecycle. Editors, watch processes, and long-lived Node API integrations must rebuild the configuration after path changes; the plugin does not watch the filesystem. Discovery is not an atomic filesystem transaction.

Importing the plugin or accessing its preset does not scan the filesystem by itself. Checks remain read-only, including under `--fix`.
