# Photon AI Studio development guide

Use `development` as the integration base and create a short-lived feature branch for a separate PR. Read `DEVELOPMENT_LOG.md` and `docs/photon-host-changes.md` before changing plugin behavior.

Build features in small, reviewable parts. Keep provider logic in `src/providers`, persistent library data separate from panel rendering, and host-specific workarounds explicit. Prefer supported Photon SDK capabilities. When a feature needs a Photon host or SDK change, record the exact archive path, behavior, and compatibility limit in `docs/photon-host-changes.md` in the same change. Do not silently depend on an edited local installation.

Preserve existing generation, editing, preview, and Apply behavior. Treat provider responses as untrusted, keep provider secrets out of settings, logs, screenshots, and commits, and avoid storing raw reference-file paths. Keep shipped starter templates in `config/premade-templates.json`; store editable Library state in the plugin's separate `config-library.json`, never in main `settings.json`. Photon currently limits each JSON file to 1 MB; enforce a budget for saved references.

Keep UI usable at the panel's minimum width, with keyboard labels, visible focus, and reduced-motion support. Prefer short user-facing messages that identify an action the user can take. Update `DEVELOPMENT_LOG.md` with completed behavior and known limits. Run focused verification for changed behavior when needed; record what was actually checked.

Use Photon-supplied `--ph-*` skin tokens for active UI colors. The custom panel must apply the host theme payload at startup and on theme changes. Keep discarded visual experiments in a separate document and stylesheet; do not import them into the plugin.
