# Changelog

## 0.1.0 (Unreleased)

- [#6](https://github.com/dblock/eslint-plugin-portable-paths/pull/6): Add opt-in `max-pathname-length` with independent relative-path UTF-16 and filename UTF-8 byte budgets, cache-safe snapshots, and support for custom roots and inventory ignores without autofixes - [@dblock](https://github.com/dblock).
- [#5](https://github.com/dblock/eslint-plugin-portable-paths/pull/5): Add `no-windows-invalid-names` for reserved devices, forbidden characters, and trailing spaces or periods; enable it in the recommended preset and configuration helper without length checks or autofixes - [@dblock](https://github.com/dblock).
- [#4](https://github.com/dblock/eslint-plugin-portable-paths/pull/4): Run CI on pull requests and pushes to `main`, avoiding duplicate runs for upstream feature branches - [@dblock](https://github.com/dblock).
- [#4](https://github.com/dblock/eslint-plugin-portable-paths/pull/4): Organize runtime code under `src/` and mirror its layout in `test/`; colocate the `no-case-collisions` implementation and guide in `src/rules/no-case-collisions/` while preserving public exports - [@dblock](https://github.com/dblock).
- [#3](https://github.com/dblock/eslint-plugin-portable-paths/pull/3): Rename the plugin-wide inventory option to `ignores` and its defaults to `DEFAULT_IGNORES`, and document inventory exclusions separately from individual rules and ESLint's file-selection ignores - [@dblock](https://github.com/dblock).
- [#3](https://github.com/dblock/eslint-plugin-portable-paths/pull/3): Simplify the README with badges, real-world problems, and rule configuration examples, split out rule, API, and development guides, and use plain-English collision diagnostics - [@dblock](https://github.com/dblock).
- [#2](https://github.com/dblock/eslint-plugin-portable-paths/pull/2): Support normal plugin/rule registration and a recommended preset with automatic cache-safe filesystem snapshots and a single configuration-file reporting anchor - [@dblock](https://github.com/dblock).
- [#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1): Add Linux, macOS, and Windows CI for ESLint 9 and 10, with data-driven installed-CLI fixtures on real case-sensitive filesystems - [@dblock](https://github.com/dblock).
- [#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1): Allow explicit local skips for fixtures requiring case-distinct names without mounting disk images or changing Windows filesystem flags - [@dblock](https://github.com/dblock).
- [#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1): Handle Unicode Windows destination paths when copying CLI fixtures on Node.js 22 - [@dblock](https://github.com/dblock).
- [#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1): Add checked usage output, a Rules section, and design, contribution, and agent guides with README documentation and license links - [@dblock](https://github.com/dblock).
- Add a filesystem-wide `no-case-collisions` rule with NFC normalization and full Unicode case folding - [@dblock](https://github.com/dblock).
- Include binary filenames, symlinks, empty directories, and inferred directory prefixes without reading file contents - [@dblock](https://github.com/dblock).
- Add a flat-config helper with a single reporting anchor and snapshot-based ESLint cache invalidation - [@dblock](https://github.com/dblock).
