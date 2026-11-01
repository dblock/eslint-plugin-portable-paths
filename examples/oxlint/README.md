# Oxlint Example

This small project enables all three portability rules through Oxlint's [JavaScript plugin API](https://oxc.rs/docs/guide/usage/linter/js-plugins.html). That API is in alpha; the example pins the tested Oxlint version.

From the repository root, install and run this example independently:

```sh
cd examples/oxlint
npm ci
npm run lint
```

The explicit `--config oxlint.config.mjs` selects a JavaScript configuration; Oxlint only automatically discovers its JSON and TypeScript configuration filenames.

`portable-paths.mjs` builds a filesystem snapshot with `createConfig()` and exports its scoped plugin. `oxlint.config.mjs` registers that plugin through `jsPlugins` and supplies the snapshot's rule options. This avoids the default plugin's ESLint-configuration anchor and reports on `oxlint.config.mjs` instead.

Set the length budgets in `portable-paths.mjs`. Oxlint validates a rule's default options when loading the plugin, before merging configured options, so this adapter includes the budgets in both the length rule's defaults and its configured options.

The inventory includes `public/logo.svg` even though Oxlint does not parse SVG files. No processor is needed: these rules inspect the filesystem, not the files visited by the linter. The clean example succeeds without findings. Add an over-budget asset path, a Windows-invalid name, or a case-only collision to see diagnostics. Some names require a suitable filesystem; case-insensitive filesystems cannot retain case-only collisions.

This example has its own manifest and lockfile; no repository-root dependency installation is needed. Its `file:../..` dependency installs the checkout's plugin as a package, and `.npmrc` enables `install-links` so the plugin's runtime dependencies are installed here rather than relying on a source symlink. To use the example outside this checkout before npm publication, replace that dependency with `github:dblock/eslint-plugin-portable-paths` and run `npm install`.

Default inventory exclusions skip `.git` and `node_modules`; the length budgets are examples, not universal compatibility guarantees. The separate [Examples CI workflow](../../.github/workflows/examples.yml) installs and lints this example on Linux, macOS, and Windows.

Keep `oxlint.config.mjs` included and unignored. Run a fresh CLI invocation after changing names; this example does not establish editor, watch, or cache compatibility. Rules do not rename files or offer autofixes.
