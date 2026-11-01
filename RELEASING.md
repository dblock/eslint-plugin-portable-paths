# Releasing

Releases require explicit maintainer approval. Publish from a clean, merged `main` revision with all CI jobs green, not from a feature branch.

## Prepare

Create a release branch. Keep the version in `package.json`, `package-lock.json`, and `src/index.mjs`'s plugin metadata synchronized. For a subsequent release, `npm version <version> --no-git-tag-version` updates the package manifest and lockfile; update the plugin metadata separately. Refresh the example lockfiles with `npm install` inside each example when their local plugin version changes.

Date the release section in `CHANGELOG.md`, retain its PR links and author attribution, and update installation instructions or compatibility documentation as needed. Run the final checks:

```sh
npm run check
npm pack --dry-run
```

The acceptance suite installs the packed plugin and runs actual ESLint CLI fixtures. The archive should contain runtime source, the README logo, and linked documentation, not tests, fixtures, example projects, or development dependencies.

Open a pull request, keep its history to one logical commit, and squash-merge after all exact-head CI checks pass. Update the local checkout to merged `main` and confirm a clean worktree.

## Publish

Check npm authentication and confirm the version is not already published. An unpublished package or version returns `E404`; other registry errors need investigation.

```sh
npm whoami
npm view eslint-plugin-portable-paths@0.1.0 version
```

Replace `0.1.0` with the intended version for later releases. Pack once into a temporary directory, inspect the file list and integrity from npm's JSON output, and publish that exact archive:

```sh
release_dir=$(mktemp -d)
npm pack --json --pack-destination "$release_dir"
npm publish "$release_dir/eslint-plugin-portable-paths-0.1.0.tgz" --access public
```

If npm requires two-factor authentication, enter a fresh one-time password at its prompt, or supply `--otp` for that publication only. Treat it as a credential: never put it in documentation, configuration, commits, or persistent notes. Do not request it until the archive is ready.

Confirm the published version, `latest` tag, and integrity against the packed archive:

```sh
npm view eslint-plugin-portable-paths@0.1.0 version dist.integrity
npm view eslint-plugin-portable-paths dist-tags
```

Install the registry package in an isolated temporary consumer and run ESLint with the recommended preset, including a known invalid-name asset to confirm findings. Remove only the temporary paths created for the release after verification.

## GitHub Release

Create `v0.1.0` at the exact merged commit used for the npm archive, with notes taken from that version's changelog. Include the published npm link and attach the same archive:

```sh
gh release create v0.1.0 "$release_dir/eslint-plugin-portable-paths-0.1.0.tgz" \
  --target "$(git rev-parse HEAD)" \
  --title "0.1.0" \
  --notes-file /path/to/release-notes.txt
```

Replace the version and notes path as appropriate. Verify the tag's commit and the release asset before removing the temporary archive. Never overwrite an existing npm version or move a published release tag; fix a bad release with a new version.
