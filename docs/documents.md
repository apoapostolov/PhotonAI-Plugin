# Documents, masks and history

Photon owns the authoritative document. Plugins receive metadata and copied pixels through
an isolated bridge. Source layers, undo state, paths, and file handles are not mutable plugin objects.

## Safe asynchronous editing

1. Capture the source and retain the returned token.
2. Encode/resize a copy for the service; keep the capture's original coordinate bounds.
3. Run provider work outside a document transaction.
4. Decode the response back to the capture dimensions.
5. Preview without publishing pixels.
6. `applyImage({image, captureToken, name})` adds a masked layer in one history step.
7. Release tokens for discarded/cancelled results.

Each runtime may retain four captures. Captures carry a document revision and the exact original
selection coverage. Apply rejects closed/stale documents and never falls back to the active tab.
Changing tabs alone does not change the target. Crops are clipped to the editing bounds, including
negative artboard coordinates. Preview images may be resized; the Apply pixels must match the
original crop dimensions.

The mask on the output layer retains floating-point selection coverage once. Original layers
are untouched; pixels outside the mask cannot be replaced. Feathered edges blend once instead
of multiplying selection opacity twice. Returned sRGB pixels are converted through Photon's
color transforms to the destination RGB profile and 8/16/32-bit depth. Source HDR precision is
not replaced globally; the generated region itself originates in an 8-bit provider image.

For generation, `newDocument: true` creates an RGB document. To insert into an existing document,
capture its identity/revision before requesting and supply both on Apply. RGB placement is the
initial supported mode; other modes are rejected without converting the source document.

## Layer and pixel workflows

Use `documents.operations('layer')` or `documents.operations('filter')` to discover concrete
operation IDs and input schemas. Available domains include layers, selections, filters,
image/document operations, pixels, text, vector paths/shapes, channels, timeline,
presets, recorded actions and shared core operations. Only registry operations with
`read` or `document` scope are exposed; document edits run in the existing editing worker.
Read operations return copies without adding history entries. Schema errors and unavailable
operations are reported. A plugin cannot call integration/credential automation operations.

Use `pixels()` and `writePixels()` for exact original-depth RGB edits. Return the same dimensions,
components, componentSize, color space, profile, and fullRange metadata. Integer buffers must use
the corresponding typed array; Float32 values must be finite. Locked pixels/transparency are
rejected. Writes respect the document selection. Run several edits in `transaction` or `batch`
for one undo step; an error/cancellation discards the private draft.

Network requests inside transactions are rejected. Complete remote work first. Transaction
commits detect intervening document changes. Native file operations run outside transactions.

File services exposed by `execute` include session creation/open/close, document duplication,
and save. Open/save and save-on-close require file capabilities and a picker-granted path; `files.read/write`
can implement plugin-specific import/export without registering a native binary format handler.
