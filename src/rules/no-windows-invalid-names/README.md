# no-windows-invalid-names

Detect file and directory names that can be created on macOS or Linux but cause problems for ordinary Windows applications, even when no other name conflicts with them. The checker reads names, not contents, and does not rename anything.

## What It Catches

| Paths | Problem |
| --- | --- |
| `CON`, `nul.txt`, `AUX.tar.gz` | Reserved device names, including names followed by extensions. |
| `COM1`, `LPT9`, `COM¹.txt` | Reserved numbered devices, including superscript digits ¹, ², and ³. |
| `CONIN$`, `CONOUT$` | Special console input and output names. |
| `image?.png`, `data:backup`, `bad\name` | Forbidden filename characters. |
| `assets.`, `notes ` | Names end with a period or an ASCII space. |

Reserved names are matched case-insensitively. Spaces immediately before a device name's extension do not make it portable: `CON .txt` is also reported. `COM0`, `COM10`, `LPT0`, `LPT10`, `.CON`, and ordinary Unicode names are not rejected.

Forbidden characters are `<`, `>`, `:`, `"`, `\`, `|`, `?`, `*`, and ASCII control characters 1–31. `/` separates path components and NUL cannot exist in an inventoried filename; malformed logical paths containing NUL fail explicitly.

Each invalid path produces one diagnostic containing all its reasons. Directory prefixes are checked independently and deduplicated, so an invalid directory is reported once rather than once per child. Original spellings are preserved and quoted; control characters appear as escaped text.

This follows [Windows naming conventions](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) and [special console names](https://learn.microsoft.com/en-us/windows/console/console-handles), not every capability of the underlying filesystem. NTFS may retain names that ordinary Windows applications reject. The rule does not check name or path lengths, enforce lowercase or ASCII-only names, or detect case collisions; use [no-case-collisions](../no-case-collisions/README.md) for collisions.

## Configuration

Register the plugin and enable the rule:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: { "portable-paths/no-windows-invalid-names": "error" },
}];
```

The recommended preset enables both rules:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [portablePaths.configs.recommended];
```

Use `"warn"` for warnings or `"off"` to disable reporting. `anchor` and `invalidNames` are internal snapshot data, not ordinary rule settings. Configured `"off"` entries may still evaluate snapshot defaults; omit the rule entry to avoid its scan.

Exclude inventory paths for both rules using the [plugin-wide configuration](../../../README.md#configuration):

```js
import { createConfig, DEFAULT_IGNORES } from "eslint-plugin-portable-paths";

export default [createConfig({
  ignores: [...DEFAULT_IGNORES, "vendor/**", "generated/**"],
})];
```

ESLint's own file-selection ignores do not exclude names from the filesystem inventory.

## Reporting and Caching

Normal registration scans the process working directory and selects the first existing regular file among `eslint.config.js`, `eslint.config.mjs`, and `eslint.config.cjs`. Findings appear at line 1 of that single anchor, including when the inventory contains binary assets, directories, empty directories, or symlinks. Descendant symlinks are not followed.

Keep the anchor included and unignored. A narrowed invocation such as `eslint src/` misses the project-wide check if it omits the anchor.

Use [createConfig()](../../../API.md#createconfig) for a custom root or reporting file. It enables both rules, scans once, respects inventory ignores, and defaults its anchor to `eslint.config.mjs`. Do not combine its scoped registration with the default plugin under the same namespace.

Rule snapshot defaults participate in ESLint's cache key. A fresh CLI invocation with `--cache` rechecks an unchanged anchor when an invalid filename appears or disappears. Editors and long-lived integrations must rebuild configuration after path changes.

Checks remain read-only under both `--fix` and `--fix-dry-run`; no autofix is offered. Invalid options, unreadable directories, and malformed UTF-8 names fail explicitly rather than producing clean results.
