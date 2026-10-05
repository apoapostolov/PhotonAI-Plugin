# Build plugins for Photon

SDK v1 is intended for local desktop editor extensions: document workflows, pixel filters,
batch commands, panels, integrations, and file processing. Plugin code stays isolated from
the editor; Photon renders native controls and owns documents, undo, files, credentials, and jobs.

1. [Quickstart and examples](quickstart.md)
2. [Manifest, capabilities and contribution points](manifest.md)
3. [Complete SDK API reference](sdk-api.md)
4. [Native/custom UI, commands and lifecycle](ui-and-lifecycle.md)
5. [Documents, pixels, masks and history](documents.md)
6. [Networking, credentials and background jobs](networking.md)
7. [Provider setup and adding an adapter](providers.md)
8. [Packaging, debugging and compatibility](development.md)
9. [Verification and known limits](verification.md)
10. [Prompt Library and Templates](library-and-templates.md)
11. [Premade templates and research basis](premade-templates.md)
12. [Earlier panel style and four-skin adaptation](panel-style-draft.md)

[Photon host changes for device sign-in](photon-host-changes.md) is a note for the Photon team.
Device sign-in and editor-wide Library/Templates dialogs need Photon host and SDK changes. The required archive changes and local patch procedure are in [Photon host changes](./photon-host-changes.md).

The authoritative TypeScript declarations are in the bundled `@photon/plugin-sdk` package.
All examples compile against that exact package. APIs described here are implemented unless
explicitly listed as deferred. Custom canvas tools, pen input interception, custom cursors,
GPU plugins, automatic updates, and a marketplace are deferred.
