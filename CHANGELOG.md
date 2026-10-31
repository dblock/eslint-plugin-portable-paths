# Changelog

## 0.1.0 (Unreleased)

- Support normal plugin/rule registration and a recommended preset with automatic cache-safe filesystem snapshots and a single configuration-file reporting anchor ([#2](https://github.com/dblock/eslint-plugin-portable-paths/pull/2)).
- Add a filesystem-wide `no-case-collisions` rule with NFC normalization and full Unicode case folding.
- Include binary filenames, symlinks, empty directories, and inferred directory prefixes without reading file contents.
- Add a flat-config helper with a single reporting anchor and snapshot-based ESLint cache invalidation.
- Add Linux, macOS, and Windows CI for ESLint 9 and 10, with data-driven installed-CLI fixtures on real case-sensitive filesystems ([#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1)).
- Allow explicit local skips for fixtures requiring case-distinct names without mounting disk images or changing Windows filesystem flags ([#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1)).
- Handle Unicode Windows destination paths when copying CLI fixtures on Node.js 22 ([#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1)).
- Add checked usage output, a Rules section, and design, contribution, and agent guides with README documentation and license links ([#1](https://github.com/dblock/eslint-plugin-portable-paths/pull/1)).
