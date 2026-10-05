# Verification and limits

Validation on 2026-10-02:

| Check | Result |
| --- | --- |
| Standalone `npm run check` | Passed: typecheck, **38 tests**, documentation checks, four example builds and packaging |
| Photon SDK and relevant compatibility units | **130 passed** in 13 files, including the original 23-test plugin baseline |
| SDK/AI/custom-panel Electron workflows and original modal cancellation/recovery | **4 passed** |
| Final packaged AI workflow | Passed again: generation, fill, removal, explicit Apply, cancellation and editing during requests |
| SDK build, Photon typecheck, renderer/Electron builds | Passed |

Tests cover the provider adapters and custom endpoints using fixtures, queued jobs,
mask conventions, binary outputs, errors and cancellation. Host tests cover manifest validation,
isolation, permissions, credential scoping, contribution cleanup, fractional selection masks,
depth/profile conversion, stale revisions and atomic history. Electron tests cover installation,
credentials, contextual actions, previews, Apply, undo/redo, save/reopen, development reload,
disable/uninstall, live custom-panel themes, narrow native docks and floating input/focus.
Run `npm run docs:check` to verify documentation examples against the bundled SDK.

The Photon automation schema check reports a generated `coreSchemas.json` mismatch;
the separate automation inventory check passes. Two original Photoshop Electron tests
(Power Rename undo and CEP dimensions) remain failing and reproduce with the original
panel renderer bypassing the SDK router. The complete compatibility suite is not green.
The main repository's `docs/development/photon-plugin-sdk-2026-10-02.md` records commands,
outcomes, screenshots and these separate failures. No full repository CI gate or
cross-platform runtime qualification was run.

Live-provider billing, account availability, quality and remote cancellation require a real
provider key and a live request. Mocked responses are not proof of live provider qualification.
This repository contains no keys and no automatic paid smoke test.

Provider image edits operate on sRGB references; prompt-based models may interpret selection
boundaries imperfectly. Photon limits Apply with the original selection mask, preserving the
unselected region. Regions larger than 16 megapixels are rejected with a smaller-selection
instruction. Original-depth pixel APIs preserve 8/16/32-bit precision subject to transfer limits.

Deferred: marketplace/discovery downloads, plugin auto-updates, custom toolbox/input handlers,
GPU kernels, arbitrary Node/Electron modules, and non-RGB AI edit placement. Plugins can still
perform broad editor workflows through commands, operations, files, filters and batch history.
