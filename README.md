# Hiven

Detect accessible media. Download it when the site and format allow. Watch for VPN exposure.

Hiven is not Chrometry. Chrometry is a separate palette-finder project.

## Status

`matthewcodergamer/Hiven` was an empty repository. This is **v0.1 / Phase 1**:

- Unified dashboard
- HTML5 + direct-file detector (page lab in the web UI; on-demand content script in Chrome)
- Direct downloads for authorized MP4/WebM files
- Queue, pause, retry, history
- VPN / IP monitoring and a WebRTC leak test
- Settings with permission explanations
- Free / Pro entitlements (local license: `HIVEN-PRO-DEV`)

## What Hiven will not do

- Extract YouTube streams or circumvent YouTube’s restrictions
- Defeat DRM or encrypted playback
- Bypass logins or access controls
- Claim a subscription can remove Chrome’s technical limits

Detected is not the same as downloadable. The UI says so.

## Chrome extension

Load `extension/` as an unpacked Manifest V3 extension.

Permissions are granted for `activeTab`, `scripting`, `downloads`, and `storage`. Host access is optional. The content script is injected when you click **Scan this tab**, not on every page.

## Architecture

```
Hiven
├── Dashboard / Detector / Downloads / Library / Performance / Protection / Settings
├── Background service worker — download coordination, messages
├── Detection engine — HTML5, files, URLs, manifests, embeds, dynamic DOM
└── VPN monitor — public IP, pin-as-protected, WebRTC leak test
```

A native kill-switch companion is out of scope for v0.1.

## Editions

| | Free | Pro |
|---|---|---|
| Core security warnings | Yes | Yes |
| HTML5 + direct downloads | Yes | Yes |
| Concurrent downloads | 2 | 4 |
| Manifest identification | Limited | Expanded |
| Library tags / history | Basic | Extended |

Pro adds capability. It does not pretend to download everything.
