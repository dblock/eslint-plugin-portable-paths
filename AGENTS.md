# Agent Instructions

Read [DESIGN.md](DESIGN.md) and [CONTRIBUTING.md](CONTRIBUTING.md) before changing this repository.

## Workflow

- Work on a feature branch and open a pull request. Do not commit directly to `main`.
- Keep each PR as one logical commit. Do not rewrite `main` history without an explicit user instruction.
- Update `CHANGELOG.md` for changes and link the actual PR number, using `[#123](https://github.com/dblock/eslint-plugin-portable-paths/pull/123)`. Do not guess PR numbers.
- Update directly related documentation. Each README rule entry needs a problem-oriented description and a working configuration example, showing exclusions when supported; keep detailed guides in `rules/<rule-name>/README.md`.
- Keep Markdown paragraphs on one line and follow the existing ESM, two-space indentation, and double-quoted strings.
- Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` in agent-created commits.

## Implementation

Keep changes focused and preserve the design's invariants: filesystem-only discovery, explicit errors, deterministic Unicode collision groups, original spellings in diagnostics, independent inventory exclusions, and read-only runtime behavior. Do not add Git or runtime network dependencies.

The runtime is `index.mjs`; there is no build step. Keep dependency changes deliberate and keep development fixtures out of the package archive.

## Validation

Install locked dependencies with `npm ci` when setting up the checkout. Run the final checks before committing:

```sh
npm run check
npm pack --dry-run
```

Avoid repeated intermediate test runs. After a failure, fix the cause and rerun the smallest relevant check.

Use focused unit tests for changed behavior and reviewed data-driven fixtures for installed-CLI behavior. Do not generate golden expectations from the implementation.

Local integration tests may explicitly skip fixtures requiring case-distinct names on unsupported filesystems. All fixtures are mandatory on GitHub runners; setup failures must fail rather than skip or use synthetic inventories. Preserve offline runtime and project/dependency immutability checks, and detach owned mounts before deleting their backing files.
