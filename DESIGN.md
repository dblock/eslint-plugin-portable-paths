# Design

`eslint-plugin-portable-paths` checks filesystem paths through ESLint. Its current rule detects collisions under Unicode normalization and case folding; filename-style enforcement, reserved names, and path-length checks are outside the MVP.

## Configuration

ESLint requires an exported configuration to enable plugins and rules. The default export is the standard ESLint plugin object, registered through `plugins`; `rules` enables `portable-paths/no-case-collisions` using ordinary severity settings. `plugin.configs.recommended` combines registration and activation in a flat-config preset. Importing the plugin or accessing its preset does not run a scan.

Standard configuration uses the process working directory as its inventory root; users should run ESLint from the project root. The plugin does not discover a Git root. `createConfig()` remains available for explicit roots, inventory exclusions, reporting files, or programmatic callers with a different ESLint `cwd`. Its `root` argument defaults to the process working directory.

The helper supplies a snapshot-scoped rule definition without dynamic defaults, so custom-root or ignore settings do not accidentally trigger an additional scan of the process working directory. Its registration is distinct from the default plugin; do not register both under the same namespace.

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

Accumulating filenames visited by ESLint would miss binary assets, directories, ignored counterparts, cached files, and paths omitted by a narrowed invocation. Instead, configuration-time snapshot defaults enumerate the filesystem independently of ESLint's file selection.

The rule emits one ordinary ESLint error per collision group at line 1 of one reporting anchor, listing all conflicting paths. Standard configuration selects the first existing regular file among `eslint.config.js`, `eslint.config.mjs`, and `eslint.config.cjs`, matching ESLint's precedence for those extensions. The recommended preset selects configuration filenames; manual registration can apply to every JavaScript file, but the rule reports only on the snapshot's absolute anchor.

The helper's default anchor remains `eslint.config.mjs`. Its `reportOn` option may select another existing regular JavaScript file using a literal, root-relative POSIX path.

The anchor must be included in the ESLint invocation and must not be ignored. An invocation such as `eslint src/` does not run the project-wide rule if it omits the anchor. No asset parser or processor is necessary because asset contents never reach ESLint.

The rule does not rename files or offer fixes, including under `--fix`.

## Snapshot Lifetime and Caching

The default rule exposes a lazy `meta.defaultOptions` getter. ESLint merges these defaults into normalized rule options before computing its cache key, even when a source file has cached results. The getter builds a plain, serializable snapshot containing collision groups and an absolute reporting anchor. It does not change plugin version metadata or scan from the rule's `create()` callback.

A changed collision set therefore changes the configuration cache key for both manual registration and the recommended preset. A fresh CLI invocation with `--cache` rechecks an unchanged anchor when a counterpart appears or disappears. Defaults may be evaluated for multiple normalized configurations, including configured disabled rules; the plugin does not maintain a global mutable scan cache.

Each `createConfig()` evaluation instead scans once and embeds explicit collision groups and an anchor in rule options. Scanning only inside the rule would leave external path changes out of the cache key; both configuration paths keep discovery before that cache boundary, while the rule only reports supplied groups.

Fresh CLI runs are the supported lifecycle. Editors, watch processes, and long-lived integrations must rebuild the configuration after path changes. There is no filesystem watcher, and discovery is not an atomic filesystem transaction.

## Validation Boundary

Unit tests cover grouping, Unicode edge cases, validation, scanning, reporting, and caching. Data-driven integration fixtures pack the plugin and run an installed ESLint CLI, rather than invoking the rule through an in-process wrapper.

All fixtures are mandatory on Linux, macOS, and Windows GitHub runners with real case-sensitive temporary filesystems. Local runs explicitly skip fixtures requiring case-distinct names when the native filesystem cannot retain them. Runtime network access is blocked, and project files and installed dependencies must remain unchanged.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.
