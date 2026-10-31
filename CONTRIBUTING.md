# Contributing

Read [DESIGN.md](DESIGN.md) before changing filesystem discovery, collision grouping, reporting, or caching. Keep changes focused and document new rules under the README's [Rules](README.md#rules) section.

Automated contributors should also follow [AGENTS.md](AGENTS.md).

## Setup

Use Node.js 22.18 or newer and install the locked development dependencies:

```sh
npm ci
```

The project uses native ES modules and has no build step. Follow the existing two-space indentation and double-quoted strings. Keep Markdown paragraphs on one line.

## Checks

Run the final checks before committing:

```sh
npm run check
npm pack --dry-run
```

`npm run check` runs the Node.js test suite and ESLint. To work on a focused test file:

```sh
npm test -- test/collisions.test.mjs
npm test -- test/integration.test.mjs
```

The package remains private until publication is explicitly prepared. Keep the archive limited to the runtime implementation and documentation; do not ship test fixtures or development dependencies.

## Tests

Add focused unit tests for behavior introduced or fixed by a change. Unicode normalization cases that cannot coexist on the integration filesystems belong in the unit suite.

The data-driven CLI suite discovers `fixtures/integration/` directories. Each fixture declares commands, reviewed inputs, and complete expected output and exit codes. It runs the packed plugin through an installed ESLint CLI with runtime networking blocked and checks that project files and installed dependencies remain unchanged.

Review expected diagnostics independently of the implementation; do not automatically regenerate golden output from the code under test. See the [fixture contract](https://github.com/dblock/eslint-plugin-portable-paths/blob/main/fixtures/README.md) for byte-array inputs, cache steps, normalization, and stderr assertions.

Fixtures needing case-distinct names declare `requiresCaseSensitiveFilesystem`. Local runs probe the native filesystem and explicitly skip those fixtures when unsupported; clean inputs and invalid configuration still run. Local tests do not mount disk images or enable Windows filesystem flags.

GitHub Actions runs all fixtures on Linux, macOS, and Windows with Node.js 22 / ESLint 9 and Node.js 24 / ESLint 10. macOS uses an owned temporary case-sensitive disk image, and Windows enables case sensitivity on owned temporary project directories. Runner setup failures must fail the suite rather than skip fixtures or substitute synthetic inventories. Always detach owned mounts before deleting their backing files.

## Changes and Pull Requests

Preserve explicit errors, deterministic diagnostics, independent inventory exclusions, and read-only runtime behavior. New rules should have clear schemas, documented defaults, and tests that exercise their actual behavior through the appropriate boundary.

Update directly affected documentation and keep unrelated changes out of the pull request. Include the relevant behavior and any platform limitations in its description.

Contributions are covered by the project's [MIT license](LICENSE).
