# ESLint Example

This small project enables all three portability rules. The inventory includes `public/logo.svg` without parsing its contents.

From the repository root, install and run this example independently:

```sh
cd examples/eslint
npm ci
npm run lint
```

The clean example succeeds without findings. Add an over-budget asset path, a Windows-invalid name, or two names differing only in case to see diagnostics on `eslint.config.mjs`. Creating some of these names requires a suitable filesystem; case-insensitive filesystems cannot retain case-only collisions.

This example has its own manifest and lockfile; no repository-root dependency installation is needed. Its `file:../..` dependency installs the checkout's plugin as a package, and `.npmrc` enables `install-links` so the plugin's runtime dependencies are installed here rather than relying on a source symlink. To use the example outside this checkout, replace that dependency with a published version such as `0.1.0` and run `npm install`.

`createConfig()` pins the inventory to this example's directory; its default exclusions skip `.git` and `node_modules`. The length budgets are examples, not universal compatibility guarantees. The separate [Examples CI workflow](../../.github/workflows/examples.yml) installs and lints this example on Linux, macOS, and Windows.

Keep the reporting configuration included and unignored. Use a fresh CLI run after changing names; rules do not rename files or offer autofixes.
