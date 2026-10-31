# Programmatic API

The package exports `scanPaths`, `findCollisions`, `createConfig`, and `DEFAULT_IGNORES`. Importing them does not scan the filesystem.

## scanPaths

```js
import { scanPaths } from "eslint-plugin-portable-paths";

const paths = scanPaths("/path/to/project", { ignores: [] });
```

Returns sorted, root-relative POSIX paths for files, directories, symlinks, and other discoverable entries. It includes directory prefixes, reads no file contents, and does not follow descendant symlinks.

The root defaults to the process working directory. The default exclusions are `**/.git/**` and `**/node_modules/**`, also exported as `DEFAULT_IGNORES`. A supplied `ignores` array replaces those defaults; `ignores: []` disables inventory exclusions. See [inventory scope](rules/no-case-collisions/README.md#inventory-scope) for pattern semantics and errors.

## findCollisions

```js
import { findCollisions, scanPaths } from "eslint-plugin-portable-paths";

const collisions = findCollisions(scanPaths("/path/to/project"));
// An example group: [["Logo.svg", "logo.svg"]].
```

Accepts an array of root-relative POSIX paths, infers all directory prefixes, deduplicates exact entries, and returns deterministic groups of conflicting original spellings. It does not read or mutate the filesystem. Invalid paths are errors. See the [rule guide](rules/no-case-collisions/README.md#what-it-catches) for examples and [DESIGN.md](DESIGN.md#collision-groups) for the comparison algorithm.

## createConfig

```js
import { createConfig, DEFAULT_IGNORES } from "eslint-plugin-portable-paths";

export default [createConfig({
  root: import.meta.dirname,
  ignores: [...DEFAULT_IGNORES, "vendor/**"],
  reportOn: "eslint.config.mjs",
})];
```

Returns a flat configuration with a scoped plugin registration, one reporting anchor, and an explicit collision snapshot. Use it for custom roots, inventory exclusions, reporting files, or programmatic ESLint callers whose `cwd` differs from the process working directory.

| Option | Default | Meaning |
| --- | --- | --- |
| `root` | Process working directory | Directory to scan. |
| `ignores` | `DEFAULT_IGNORES` | Positive, root-relative POSIX globs; supplied arrays replace the defaults. |
| `reportOn` | `eslint.config.mjs` | Existing regular JavaScript file, using a literal, root-relative POSIX path. |

The anchor must be included in the ESLint invocation and not ignored. Do not combine this scoped registration with the default plugin or recommended preset under the same namespace.

Each evaluation scans once. Rebuild the configuration after path changes in long-lived integrations. See [caching and lifecycle](rules/no-case-collisions/README.md#caching-and-long-lived-processes) for details.
