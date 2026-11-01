# Development

Use Node.js 22.18 or newer. The project uses native ES modules and has no build step.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow, [DESIGN.md](DESIGN.md) for the architecture, and [AGENTS.md](AGENTS.md) for automated contributor instructions.

## Setup

Install the locked development dependencies:

```sh
npm ci
```

## Checks

Run the final checks before committing:

```sh
npm run check
npm pack --dry-run
```

`npm run check` runs the Node.js test suite and ESLint. To work on a focused test file:

```sh
npm test -- test/rules/no-case-collisions/index.test.mjs
npm test -- test/integration.test.mjs
```

Keep the archive limited to the runtime implementation, README logo, and linked documentation; do not ship test fixtures or development dependencies. See [RELEASING.md](RELEASING.md) for publication.

The [ESLint](examples/eslint) and [Oxlint](examples/oxlint) examples are independent projects, each with its own manifest, lockfile, and installed plugin dependency. Run `npm ci` and `npm run lint` inside each example directory; the repository-root install is not required. `.npmrc` enables `install-links` to install the local plugin as a package with its own runtime dependencies.

The separate Examples workflow runs `npm ci` and `npm run lint` inside each example on Linux, macOS, and Windows without installing repository-root dependencies. The Oxlint adapter supplies valid budget defaults because Oxlint validates plugin defaults before merging configured options.

Repository-root ESLint excludes the standalone examples so ESLint 10 does not discover their configuration without their separately installed dependencies. Their own workflow handles linting; the root plugin's filesystem inventory still checks their names.

## Integration Tests

The [data-driven CLI acceptance suite](https://github.com/dblock/eslint-plugin-portable-paths/blob/main/fixtures/README.md) packs the plugin and installs it with ESLint. Reviewed fixtures assert complete diagnostics and exit codes, offline runtime, and project/dependency immutability.

All fixtures are mandatory on Linux, macOS, and Windows GitHub runners with Node.js 22 / ESLint 9 and Node.js 24 / ESLint 10. Local runs explicitly skip fixtures requiring case-distinct names when the native filesystem cannot retain them, without mounting disk images or enabling Windows filesystem flags.

CI runs on pull requests and pushes to `main`. Feature-branch pushes do not start separate runs.

See [CONTRIBUTING.md](CONTRIBUTING.md#tests) for test authoring and platform setup requirements.
