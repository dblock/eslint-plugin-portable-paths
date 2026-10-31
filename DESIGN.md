# Design

`eslint-plugin-portable-paths` checks filesystem paths through ESLint. Its current rule detects collisions under Unicode normalization and case folding; filename-style enforcement, reserved names, and path-length checks are outside the MVP.

## Configuration

ESLint requires an exported configuration to enable plugins and rules. Installing or importing this plugin does not run a scan. The default export is the standard ESLint plugin object; `createConfig()` returns a flat configuration that registers the plugin, enables its rule, and supplies a collision snapshot.

The `root` argument is optional and defaults to the current working directory. `createConfig()` is sufficient when ESLint runs from the project root with an `eslint.config.mjs` reporting anchor. Setting `root: import.meta.dirname` explicitly keeps the inventory scope tied to the configuration's directory even when ESLint starts elsewhere. The `export default` in the project's configuration is still required.

## Inventory

`scanPaths()` recursively enumerates the selected root and returns sorted, root-relative POSIX paths. It includes dotfiles, binary filenames, empty directories, symlinks, and other filesystem entries. It never reads file contents or follows descendant symlinks.

Names are decoded as UTF-8 with a fatal decoder. Invalid names, unreadable directories, and invalid options fail explicitly rather than producing an incomplete, clean-looking result.

The default exclusions are `**/.git/**` and `**/node_modules/**`. A supplied `ignore` array replaces those defaults. Patterns are positive, root-relative globs that match dotfiles; ignored directories are pruned. Inventory exclusions are independent of ESLint ignores. There is no Git inventory or runtime network access.

## Collision Groups

`findCollisions()` validates paths, deduplicates exact spellings, and includes every directory prefix. A file and a directory with differently cased spellings can therefore collide, and nested conflicts can produce independent directory and descendant-path groups.

Each path's comparison key is:

```js
caseFold(path.normalize("NFC")).normalize("NFC")
```

The pinned `unicode-case-folding` dependency supplies full default Unicode folding, including matches such as `Straße` and `STRASSE`. Original spellings remain in diagnostics. Paths and groups have deterministic JavaScript code-unit ordering.

This is a conservative portability policy, not exact filesystem emulation. It does not use compatibility normalization or Turkish-specific folding. The scanner cannot recover a spelling that a case-insensitive filesystem has already collapsed or overwritten.

## Reporting Anchor

Accumulating filenames visited by ESLint would miss binary assets, directories, ignored counterparts, cached files, and paths omitted by a narrowed invocation. Instead, `createConfig()` builds its filesystem snapshot independently of ESLint's file selection.

The rule runs on one reporting anchor and emits one ordinary ESLint error per collision group at line 1, listing all conflicting paths. The default anchor is `eslint.config.mjs`; `reportOn` may select another existing regular JavaScript file using a literal, root-relative POSIX path.

The anchor must be included in the ESLint invocation and must not be ignored. An invocation such as `eslint src/` does not run the project-wide rule if it omits the anchor. No asset parser or processor is necessary because asset contents never reach ESLint.

The rule does not rename files or offer fixes, including under `--fix`.

## Snapshot Lifetime and Caching

Each `createConfig()` evaluation scans once and embeds the resulting collision groups in rule options. A changed collision set changes ESLint's configuration cache key, so a fresh CLI invocation with `--cache` rechecks an unchanged anchor when a counterpart appears or disappears.

Scanning inside the rule instead would leave external path changes out of that cache key. The snapshot helper therefore handles discovery, while the rule only reports the supplied groups.

Fresh CLI runs are the supported lifecycle. Editors, watch processes, and long-lived integrations must rebuild the configuration after path changes. There is no filesystem watcher, and discovery is not an atomic filesystem transaction.

## Validation Boundary

Unit tests cover grouping, Unicode edge cases, validation, scanning, reporting, and caching. Data-driven integration fixtures pack the plugin and run an installed ESLint CLI, rather than invoking the rule through an in-process wrapper.

All fixtures are mandatory on Linux, macOS, and Windows GitHub runners with real case-sensitive temporary filesystems. Local runs explicitly skip fixtures requiring case-distinct names when the native filesystem cannot retain them. Runtime network access is blocked, and project files and installed dependencies must remain unchanged.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.
