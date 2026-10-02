# Networking, keys and jobs

The main-process broker checks the calling plugin identity, manifest capabilities, destination
origin, credential binding, redirects, response size, and cancellation. API keys enter through a
Photon-owned password dialog. The plugin receives status and an ID, never decrypted key text.
Keys are encrypted at rest using Electron safeStorage; insecure Linux basic_text storage is not
used. Without secure encryption, credentials remain in memory until Photon quits.

Authenticate requests by credential reference. Raw Authorization, cookie and API-key headers
are rejected. Keys stay bound to their configured origin, plus any explicitly declared regional
aliases. Returned provider image URLs may be downloaded through the broker without credentials;
this grant permits GET downloads only, not authenticated requests or job submissions.

Private/local addresses require approval through `network.allowEndpoint`. Approval is persisted
separately from plugin settings. Custom HTTP endpoints are possible only after explicit approval;
choose HTTPS for remote providers. GET redirects are checked and followed without forwarding
keys. POST redirects are rejected rather than repeating a potentially billable request.

Every network request has a five-minute limit and a 64 MB input/output limit. The host aborts
pending requests when the plugin stops. Supply `jobId` so cancellation also aborts that request.
A job owns status/progress, while its callback owns provider orchestration and any remote-cancel
API call. `jobs.run` always releases host state and its cancellation listener.

Only retry operations known to be safe. Never blindly retry a generation POST after a timeout:
it may have been accepted and billed. Poll existing remote job IDs instead. Remote cancellation
is best effort; BFL and synchronous provider requests may continue after local cancellation.
A preview or Apply failure does not refund a completed generation.

Settings and keys survive disable/replacement/reload. Uninstall removes Photon-plugin settings,
endpoint approvals and keys, alongside the installed package. External source files are retained.
