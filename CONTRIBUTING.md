# Contributing

Read [DESIGN.md](DESIGN.md) before changing filesystem discovery, collision grouping, reporting, or caching. Keep changes focused and document new rules under the README's [Rules](README.md#rules) section.

Automated contributors should also follow [AGENTS.md](AGENTS.md).

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for requirements, setup, checks, packaging, and running focused tests. Follow the existing two-space indentation and double-quoted strings, and keep Markdown paragraphs on one line.

## Tests

Add focused unit tests for behavior introduced or fixed by a change. Unicode normalization cases that cannot coexist on the integration filesystems belong in the unit suite.

Unit tests mirror `src/` under `test/`: `src/index.mjs` maps to `test/index.test.mjs`, `src/paths.mjs` to `test/paths.test.mjs`, and `src/rules/<rule-name>/index.mjs` to `test/rules/<rule-name>/index.test.mjs`. Shared temporary-project setup is in `test/fixture.mjs`; installed-CLI acceptance tests remain separate in `test/integration.test.mjs`.

The data-driven CLI suite discovers `fixtures/integration/` directories. Each fixture declares commands, reviewed inputs, and complete expected output and exit codes. It runs the packed plugin through an installed ESLint CLI with runtime networking blocked and checks that project files and installed dependencies remain unchanged.

Review expected diagnostics independently of the implementation; do not automatically regenerate golden output from the code under test. See the [fixture contract](https://github.com/dblock/eslint-plugin-portable-paths/blob/main/fixtures/README.md) for byte-array inputs, cache steps, normalization, and stderr assertions.

Fixtures needing case-distinct names declare `requiresCaseSensitiveFilesystem`. Local runs probe the native filesystem and explicitly skip those fixtures when unsupported; clean inputs and invalid configuration still run. Local tests do not mount disk images or enable Windows filesystem flags.

GitHub Actions runs all fixtures on Linux, macOS, and Windows with Node.js 22 / ESLint 9 and Node.js 24 / ESLint 10. macOS uses an owned temporary case-sensitive disk image, and Windows enables case sensitivity on owned temporary project directories. Runner setup failures must fail the suite rather than skip fixtures or substitute synthetic inventories. Always detach owned mounts before deleting their backing files.

## Changes and Pull Requests

Format changelog entries as `- [#123](https://github.com/dblock/eslint-plugin-portable-paths/pull/123): Description - [@author](https://github.com/author).` Use the actual PR number and author; entries predating PRs go at the bottom without a PR or commit link.

Preserve explicit errors, deterministic diagnostics, independent inventory exclusions, and read-only runtime behavior. New rules should have clear schemas, documented defaults, and tests that exercise their actual behavior through the appropriate boundary.

Update directly affected documentation and keep unrelated changes out of the pull request. Each README rule entry should describe the user problems it catches and include a working configuration example, showing exclusions when supported. Keep detailed guides alongside implementations in `src/rules/<rule-name>/README.md`. Include the relevant behavior and any platform limitations in the PR description.

Contributions are covered by the project's [MIT license](LICENSE).
