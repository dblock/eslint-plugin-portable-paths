# CLI Acceptance Fixtures

The suite discovers directories under `integration/`. Each has a `command.json`, a checked-in `project/` containing its ESLint config and text inputs, and reviewed expected JSON files.

`command.json` declares a string-array command starting with `eslint`, an `expected` filename, and optional `files` records containing `{ "path": "Logo.webp", "bytes": [0, 255, 0] }`. These reviewed byte arrays supply binary files and spellings that cannot coexist in a case-insensitive checkout. The harness does not generate input values or expected diagnostics from the implementation.

A `steps` array can declare successive commands, expectations, additional files, and `removeFiles` paths naming individual files to remove before a command. Cache fixtures add or remove filenames between real CLI invocations. The literal `<cache>` argument refers to a cache file outside the scanned project.

The consumer harness packs the plugin and installs it with the same ESLint version as the development environment, once per suite. Cases execute the installed ESLint CLI in fresh project directories with spaces and Unicode in their paths; they never invoke the rule through an in-process test wrapper.

Fixtures that need case-distinct filenames declare `"requiresCaseSensitiveFilesystem": true`. Local runs use the native filesystem and explicitly skip those fixtures if a probe shows that case-distinct names cannot coexist; clean inputs and invalid configuration still run. Local runs do not mount disk images or require Windows case-sensitivity permissions.

All fixtures are mandatory on GitHub runners (`GITHUB_ACTIONS=true`). Linux uses its native filesystem. Windows enables case sensitivity on owned temporary directories with `fsutil`. macOS mounts an owned temporary 64 MiB case-sensitive HFS+ disk image and detaches it during cleanup. Runner setup failures are errors, not skips or synthetic filesystem fallbacks.

Windows fixture paths use the NT namespace so real reserved names and trailing-period directories can be created, inspected, and removed without Windows silently interpreting a different name. Names that the filesystem itself cannot retain, such as forbidden-character cases on Windows, are tested as logical inventories in the unit suite.

Every command asserts its exit code and complete parsed JSON stdout, normalizing absolute temporary project paths to `<project>/...`. ESLint 9's obsolete `nodeType: null` metadata is omitted to match ESLint 10; any non-null AST node type fails. Successful runs and findings compare stderr exactly. The invalid-config case explicitly matches its stable error message because stack traces and version banners vary by platform.

Runtime network connections and `fetch` are blocked. Each command compares project bytes, modes, modification times, directories, and symlink targets before and after execution. Installed dependencies must also remain unchanged. Cache files are outside the project and are the only expected runtime writes.

Cases cover manual plugin/rule registration, the recommended preset, clean arbitrary files, binary filename collisions, directory and file-versus-directory conflicts, full Unicode folding, ESLint-ignored counterparts, explicit inventory ignores, read-only `--fix`, cache invalidation for both configuration styles, and invalid configuration. Additional JavaScript inputs and competing configuration filenames verify that findings appear only on the selected anchor. Canonical normalization and other filesystem-independent Unicode edge cases remain in the unit suite.

Windows-name cases cover direct registration, reserved binary filenames, trailing-period directories and descendants, cache invalidation when a reserved name appears and disappears, helper inventory ignores, and read-only `--fix` and `--fix-dry-run`. These do not require case-distinct filenames and run on local filesystems as well as every GitHub runner.

Run with `npm test -- test/integration.test.mjs`. Fixture configurations are excluded from the repository's own ESLint and portability checks. `.gitattributes` preserves LF bytes on all operating systems.
