# max-pathname-length

Limit project-relative paths and individual file or directory name sizes. Path budgets leave room for different checkout locations; filename byte budgets catch names that fit Windows limits but exceed a common Linux filesystem's byte limit.

## Configuration

Set either budget or both:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: {
    "portable-paths/max-pathname-length": ["error", { max: 200, maxNameBytes: 255 }],
  },
}];
```

| Option | Meaning |
| --- | --- |
| `max` | Maximum project-relative path length in UTF-16 code units. |
| `maxNameBytes` | Maximum UTF-8 byte count of each filename or directory name. |

Both options are optional, but at least one must be supplied. Each supplied limit must be a positive integer no larger than `Number.MAX_SAFE_INTEGER`. There are no defaults. A value exactly at its limit passes; a larger value produces a diagnostic. Use `{ max: 200 }` for paths only or `{ maxNameBytes: 255 }` for names only.

The recommended preset does not enable this rule because each project must choose its budgets. To add it while retaining the recommended checks:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [{
  ...portablePaths.configs.recommended,
  rules: {
    ...portablePaths.configs.recommended.rules,
    "portable-paths/max-pathname-length": ["error", { max: 200, maxNameBytes: 255 }],
  },
}];
```

Use `"warn"` for warnings or `"off"` to disable reporting. `paths` and `anchor` are internal snapshot fields, not user settings.

## What Is Counted

`max` measures the original root-relative POSIX path in UTF-16 code units, including directory names and `/` separators, but excluding the absolute project root, a leading separator, and any trailing directory separator. Moving the same project deeper into another folder does not change its findings.

For example, `assets/nested/image.webp` measures 24. Most common characters count as one unit; an emoji outside the basic Unicode range counts as two. This matches Windows UTF-16 path accounting, not UTF-8 byte counts or visually perceived characters.

`maxNameBytes` measures only the final filename or directory component in UTF-8 bytes, not its parent directories or separators. For example, 150 `é` characters occupy 150 UTF-16 units but 300 UTF-8 bytes, exceeding a 255-byte name budget. Names are not normalized before either measurement.

Files, binary assets, directories, empty directories, and symlink names participate. Descendant symlinks are not followed, and symlink target paths are not counted. Directory prefixes are deduplicated. An oversized directory name is reported once for the name budget; its descendants can also produce path-budget findings when their full relative paths exceed `max`. When both budgets are exceeded by one path, one diagnostic describes both violations.

The example budgets are not a universal compatibility guarantee. Windows full-path limits depend on the checkout location, APIs, and system settings. A 255-byte name budget matches common Linux filesystems such as ext4 and conservatively fits NTFS's 255-unit name limit for valid Unicode; other filesystems may impose different restrictions. The rule does not inspect the host filesystem's actual limits.

## Inventory Exclusions and Custom Roots

Use the [configuration helper](../../../API.md#createconfig) to capture the selected root and [plugin-wide ignores](../../../README.md#configuration), then enable the rule on that same configuration:

```js
import { createConfig, DEFAULT_IGNORES } from "eslint-plugin-portable-paths";

const config = createConfig({
  root: import.meta.dirname,
  ignores: [...DEFAULT_IGNORES, "vendor/**", "generated/**"],
});
config.rules["portable-paths/max-pathname-length"] = ["error", { max: 200, maxNameBytes: 255 }];

export default [config];
```

The helper scans once, enables the two default checks, and supplies a static inventory/anchor default for this optional rule. This avoids accidentally scanning the process working directory when a custom root is supplied. Keep the rule on the helper's configuration so its reporting-file selection and scoped plugin registration remain aligned.

ESLint's own file-selection ignores do not remove filesystem inventory paths. Do not combine the helper's scoped plugin registration with the default plugin under the same namespace.

## Reporting and Caching

Normal registration scans the process working directory and selects the first existing regular file among `eslint.config.js`, `eslint.config.mjs`, and `eslint.config.cjs`. The helper defaults its anchor to `eslint.config.mjs` and supports `reportOn`.

All findings appear at line 1 of that single anchor. Keep the anchor included and unignored; an invocation such as `eslint src/` misses the check if it omits the anchor.

The full filesystem inventory is captured in snapshot defaults before ESLint computes cache keys, since user-provided budgets are not available to the default-options getter. A fresh invocation with `--cache` rechecks an unchanged anchor when paths appear or disappear or either configured budget changes. Editors and long-lived integrations must rebuild configuration after path changes.

Checks remain read-only under `--fix` and `--fix-dry-run`. No files are renamed and no autofix is offered.
