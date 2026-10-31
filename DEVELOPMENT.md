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

The package remains private until publication is explicitly prepared. Keep the archive limited to the runtime implementation and linked documentation; do not ship test fixtures or development dependencies.

## Integration Tests

The [data-driven CLI acceptance suite](https://github.com/dblock/eslint-plugin-portable-paths/blob/main/fixtures/README.md) packs the plugin and installs it with ESLint. Reviewed fixtures assert complete diagnostics and exit codes, offline runtime, and project/dependency immutability.

All fixtures are mandatory on Linux, macOS, and Windows GitHub runners with Node.js 22 / ESLint 9 and Node.js 24 / ESLint 10. Local runs explicitly skip fixtures requiring case-distinct names when the native filesystem cannot retain them, without mounting disk images or enabling Windows filesystem flags.

CI runs on pull requests and pushes to `main`. Feature-branch pushes do not start separate runs.

See [CONTRIBUTING.md](CONTRIBUTING.md#tests) for test authoring and platform setup requirements.
