# Design

`eslint-plugin-portable-paths` checks filesystem paths through ESLint. Its rules detect collisions under Unicode normalization and case folding, names incompatible with ordinary Windows applications, and paths or filename components exceeding explicit length budgets. Filename-style enforcement and absolute operating-system path limits are outside the current scope.

All runtime code lives under `src/`. The public entry point, plugin registration, and configuration helper are in `src/index.mjs`; shared filesystem discovery, path inventories, and reporting-anchor helpers are in `src/paths.mjs`. Each rule and its detailed README live together in `src/rules/<rule-name>/`. Unit tests mirror the source layout under `test/`, separately from installed-CLI acceptance tests.

## Configuration

ESLint requires an exported configuration to enable plugins and rules. The default export is the standard ESLint plugin object, registered through `plugins`; `rules` enables each rule using ordinary severity settings. `plugin.configs.recommended` enables the collision and Windows-name checks. `max-pathname-length` is opt-in and requires at least one explicit positive integer budget, `max` or `maxNameBytes`, with no preset default. Importing the plugin or accessing its preset does not run a scan.

Standard configuration uses the process working directory as its inventory root; users should run ESLint from the project root. The plugin does not discover a Git root. `createConfig()` remains available for explicit roots, inventory exclusions, reporting files, or programmatic callers with a different ESLint `cwd`. Its `root` argument defaults to the process working directory.

The helper supplies a snapshot-scoped rule definition without dynamic defaults, so custom-root or exclusion settings do not accidentally trigger an additional scan of the process working directory. Its registration is distinct from the default plugin; do not register both under the same namespace.

## Inventory

`scanPaths()` recursively enumerates the selected root and returns sorted, root-relative POSIX paths. It includes dotfiles, binary filenames, empty directories, symlinks, and other filesystem entries. It never reads file contents or follows descendant symlinks.

Names are decoded as UTF-8 with a fatal decoder. Invalid names, unreadable directories, and invalid options fail explicitly rather than producing an incomplete, clean-looking result.

Logical inventory paths use POSIX `/` separators regardless of the host. Windows-invalid characters such as `:` and `\` remain filename data so rules can analyze names retained on Unix. Reporting anchors separately reject absolute and drive-qualified paths. Windows filesystem access uses the NT namespace to preserve directory spellings with trailing spaces or periods rather than silently opening a different name.

The default exclusions are `**/.git/**` and `**/node_modules/**`. A supplied `ignores` array replaces those defaults. Patterns are positive, root-relative globs that match dotfiles; ignored directories are pruned. Inventory ignores are independent of ESLint's file-selection ignores. There is no Git inventory or runtime network access.

## Collision Groups

`findCollisions()` validates paths, deduplicates exact spellings, and includes every directory prefix. A file and a directory with differently cased spellings can therefore collide, and nested conflicts can produce independent directory and descendant-path groups.

Each path's comparison key is:

```js
caseFold(path.normalize("NFC")).normalize("NFC")
```

The pinned `unicode-case-folding` dependency supplies full default Unicode folding, including matches such as `Straße` and `STRASSE`. Original spellings remain in diagnostics. Paths and groups have deterministic JavaScript code-unit ordering.

This is a conservative portability policy, not exact filesystem emulation. It does not use compatibility normalization or Turkish-specific folding. The scanner cannot recover a spelling that a case-insensitive filesystem has already collapsed or overwritten.

## Windows Names

`findWindowsInvalidNames()` uses the same validated, deduplicated path inventory and checks each component's own basename, reporting an invalid parent once rather than duplicating it for every descendant.

The policy follows ordinary Windows naming conventions: case-insensitive `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, and `LPT1`–`LPT9`, including superscript digits ¹, ², and ³ and extensions; exact console aliases `CONIN$` and `CONOUT$`; forbidden characters `< > : " \ | ? *` and control characters 1–31; and trailing ASCII spaces or periods. Spaces immediately before the first period are removed when checking device stems. Valid Unicode names, `COM0`, `COM10`, and leading spaces are not rejected.

Findings preserve the original path and list all applicable reasons in a fixed order. The policy is about Win32/shell interoperability, not whether NTFS can store the name through an extended namespace. Length restrictions are deliberately excluded.

## Path Lengths

`findLongPaths()` compares each original root-relative POSIX path's JavaScript string length against optional `max`, and its final component's UTF-8 byte count against optional `maxNameBytes`. At least one positive safe integer budget is required. Path length includes directory names and separators but excludes the absolute checkout root and trailing directory separators. Exact-limit measurements pass; either exceeded budget yields a single record containing both measurements.

No Unicode normalization is applied before counting. Supplementary Unicode characters count as two UTF-16 units and four UTF-8 bytes; grapheme clusters are not measured. Directory prefixes are deduplicated, so oversized names are not repeated for descendants, while independently over-limit relative paths still report. A path exceeding both budgets produces one diagnostic with both reasons. The rule enforces project-selected budgets, not an absolute Windows path limit or a queried host-filesystem limit.

## Reporting Anchor

Accumulating filenames visited by ESLint would miss binary assets, directories, ignored counterparts, cached files, and paths omitted by a narrowed invocation. Instead, configuration-time snapshot defaults enumerate the filesystem independently of ESLint's file selection.

Rules report at line 1 of the same reporting anchor: one ordinary ESLint diagnostic per collision group, invalid Windows name, or over-limit relative path. Standard configuration selects the first existing regular file among `eslint.config.js`, `eslint.config.mjs`, and `eslint.config.cjs`, matching ESLint's precedence for those extensions. The recommended preset selects configuration filenames; manual registration can apply to every JavaScript file, but each rule reports only on its snapshot's absolute anchor.

The helper's default anchor remains `eslint.config.mjs`. Its `reportOn` option may select another existing regular JavaScript file using a literal, root-relative POSIX path.

The anchor must be included in the ESLint invocation and must not be ignored. An invocation such as `eslint src/` does not run the project-wide rule if it omits the anchor. No asset parser or processor is necessary because asset contents never reach ESLint.

No rule renames files or offers fixes, including under `--fix` or `--fix-dry-run`.

## Snapshot Lifetime and Caching

Each default rule exposes a lazy `meta.defaultOptions` getter. ESLint merges these defaults into normalized rule options before computing its cache key, even when a source file has cached results. Getters use the shared inventory/anchor helper to build plain, serializable snapshots containing collision groups, invalid-name records, or the full inventory and an absolute reporting anchor. The length rule captures the full inventory because its user-provided budgets are not available to the getter; it filters supplied snapshot paths without filesystem access. Getters do not change plugin version metadata or scan from a rule's `create()` callback.

A changed finding set therefore changes the configuration cache key for both manual registration and the recommended preset. A fresh CLI invocation with `--cache` rechecks an unchanged anchor when a counterpart or invalid filename appears or disappears. Each rule's defaults may scan independently and may be evaluated for multiple normalized configurations, including configured disabled rules; the plugin does not maintain a global mutable scan cache.

Each `createConfig()` evaluation instead scans once and embeds explicit collision groups, invalid-name records, and the same anchor in the two default checks. The optional length rule receives static default options containing that inventory and anchor; enabling it on the helper's configuration merges the user's budgets without scanning the process working directory. Scanning only inside a rule would leave external path changes out of the cache key; both configuration paths keep discovery before that cache boundary, while rules evaluate only supplied snapshots.

Fresh CLI runs are the supported lifecycle. Editors, watch processes, and long-lived integrations must rebuild the configuration after path changes. There is no filesystem watcher, and discovery is not an atomic filesystem transaction.

## Validation Boundary

Unit tests cover grouping, Unicode edge cases, validation, scanning, reporting, and caching. Data-driven integration fixtures pack the plugin and run an installed ESLint CLI, rather than invoking the rule through an in-process wrapper.

All fixtures are mandatory on Linux, macOS, and Windows GitHub runners with real case-sensitive temporary filesystems. Local runs explicitly skip fixtures requiring case-distinct names when the native filesystem cannot retain them. Runtime network access is blocked, and project files and installed dependencies must remain unchanged.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.
