# Packaging, development and compatibility

`npm run build` produces `dist/plugin/`: manifest, HTML, bundled JavaScript and source map.
`npm run package` also creates a ZIP-based `.photon-plugin` archive. Photon validates manifests,
entrypoints, paths, duplicates and archive size before copying a package into an immutable
managed version. Symlink sources/traversal are rejected. An invalid replacement leaves the
existing version installed. Installation does not itself certify functionality.

For development, import `dist/plugin`, enable it, and open AI Studio. Edit source, rebuild,
then choose Reload development folder in the manager. Reopen the panel to start the new
runtime. This replaces only that plugin. Source-map files are local and bundled; no external
code is downloaded to run the plugin.

Run `npm run check` for typechecking, adapter tests, examples and packaging. The SDK tarball
is versioned locally. To update it, rebuild/pack the canonical SDK in the Photon repository,
replace `vendor/photon-plugin-sdk-1.0.0.tgz`, and reinstall that file so the lockfile records
its new integrity. A breaking API requires a new SDK major and matching manifest support.
Do not silently change an installed SDK major.

## Debugging

The plugin manager shows diagnostics and can export them. Check activation errors first if
native controls never appear. Check declared document/network/file capabilities for permission
failures; private endpoints require explicit approval. For provider errors, verify credits,
model access and documented request shape. A changed-document error means retain the preview
and regenerate from current content. A pixel-format mismatch means return the original depth,
components and profile metadata rather than silently changing precision.

Keep provider responses and test artifacts free of real keys. Credential status can be logged;
credential values cannot be read through the SDK. Never mark a provider as live-qualified just
because its mocked adapter tests passed. See the verification record.
