# eslint-plugin-portable-paths

[![CI](https://github.com/dblock/eslint-plugin-portable-paths/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dblock/eslint-plugin-portable-paths/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.18-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

ESLint checks for portable file and directory names, especially useful when developers work on the same code across Windows, macOS, and Linux.

- Catch filenames like `Logo.svg` and `logo.svg` that can overwrite each other on case-insensitive filesystems.
- Find directory clashes like `Src/` and `src/`, or a `ReadMe` file conflicting with a directory named `readme/`.
- Catch the same accented filename stored in two different ways, even when both names look identical.
- Catch names such as `NUL.txt`, `image?.png`, and `assets.` that cause problems on Windows.
- Set path and filename-size budgets, leaving room for checkout folders and avoiding oversized Unicode names.

## Installation

Requires Node.js 22.18+ and ESLint 9.39+ or 10.x. This repository is not published to npm yet. To try the GitHub version:

```sh
npm install --save-dev eslint github:dblock/eslint-plugin-portable-paths
```

## Usage

Add this to `eslint.config.mjs`:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [
  {
    plugins: { "portable-paths": portablePaths },
    rules: {
      "portable-paths/no-case-collisions": "error",
      "portable-paths/no-windows-invalid-names": "error",
    },
  },
];
```

Or use the recommended preset, which registers the plugin and enables the collision and Windows-name checks:

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [portablePaths.configs.recommended];
```

Run:

```sh
npx eslint .
```

Example output:

```text
eslint.config.mjs
  1:1  error  Conflicting paths: "public/Logo.svg", "public/logo.svg"  portable-paths/no-case-collisions

✖ 1 problem (1 error, 0 warnings)
```

Findings are reported on the configuration file; its project path is omitted above. Keep that file included and unignored. Rules report problems without autofixes. The collision example requires a filesystem that retains both spellings.

## Rules

### [no-case-collisions](src/rules/no-case-collisions/README.md)

Detect clashes between filenames, directory spellings, and files versus directories when capitalization is ignored, including asset and binary filenames. It also catches the same accented name stored in different ways.

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: { "portable-paths/no-case-collisions": "error" },
}];
```

See the [rule guide](src/rules/no-case-collisions/README.md) for more examples and details.

### [no-windows-invalid-names](src/rules/no-windows-invalid-names/README.md)

Detect file and directory names that can be created on macOS or Linux but cause problems for ordinary Windows applications: reserved device names such as `CON` and `NUL.txt`, forbidden characters such as `?` and `:`, and names ending in spaces or periods. Name and path lengths are not checked.

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: { "portable-paths/no-windows-invalid-names": "error" },
}];
```

See the [rule guide](src/rules/no-windows-invalid-names/README.md) for details and the [plugin-wide configuration](#configuration) to exclude paths.

### [max-pathname-length](src/rules/max-pathname-length/README.md)

Reject project-relative paths or individual file and directory names exceeding your chosen budgets. `max` counts full relative paths in UTF-16 code units, excluding the checkout location; `maxNameBytes` counts each name in UTF-8 bytes. Set either option or both.

```js
import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: {
    "portable-paths/max-pathname-length": ["error", { max: 200, maxNameBytes: 255 }],
  },
}];
```

This rule is opt-in and is not enabled by the recommended preset. The example budgets leave room for checkout folders and common filesystem name limits, not a universal compatibility guarantee. See the [rule guide](src/rules/max-pathname-length/README.md) for details and configuration with [inventory exclusions](#configuration).

## Configuration

Exclude `vendor/` and `generated/` from the plugin's filesystem inventory while preserving its default exclusions:

```js
import { createConfig, DEFAULT_IGNORES } from "eslint-plugin-portable-paths";

export default [createConfig({
  ignores: [...DEFAULT_IGNORES, "vendor/**", "generated/**"],
})];
```

This plugin-wide `ignores` option controls the filesystem inventory, not an individual rule. It replaces the defaults (`**/.git/**` and `**/node_modules/**`), so spread `DEFAULT_IGNORES` to retain them. ESLint's configuration-level `ignores` only controls which files it lints; it does not remove paths from this plugin's separate inventory.

For integrations from code, see the [programmatic API](API.md).

## Examples

Try the self-contained [ESLint example](examples/eslint) or [Oxlint example](examples/oxlint), each with its own dependencies, lockfile, and linting CI. Both enable all three rules and scan assets independently of the linter's file selection. Oxlint's JavaScript plugin API is in alpha; its example uses an explicit snapshot and reporting anchor.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance, [DEVELOPMENT.md](DEVELOPMENT.md) for setup and checks, [DESIGN.md](DESIGN.md) for the architecture, and [AGENTS.md](AGENTS.md) for automated contributor instructions.

## License

MIT. See [LICENSE](LICENSE).
