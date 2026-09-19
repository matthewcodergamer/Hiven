chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    hivenInstalledAt: Date.now(),
  });
});

const BLOCKED = /(?:^|\.)(?:youtube\.com|youtu\.be|youtube-nocookie\.com|googlevideo\.com|ytimg\.com)$/i;

function safeFilename(name) {
  const base = String(name || "video.mp4").split(/[/\\]/).pop() || "video.mp4";
  const cleaned = base.replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "video.mp4").slice(0, 180);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "hiven.download" && typeof message.url === "string") {
    let parsed;
    try {
      parsed = new URL(message.url);
    } catch {
      sendResponse({ ok: false, error: "Invalid media URL." });
      return false;
    }
    if (BLOCKED.test(parsed.hostname)) {
      sendResponse({ ok: false, error: "YouTube is not downloadable." });
      return false;
    }
    if (parsed.protocol === "blob:" || parsed.protocol === "data:") {
      sendResponse({ ok: false, error: "No file URL to save." });
      return false;
    }
    const origin = `${parsed.origin}/*`;
    const start = () => {
      chrome.downloads.download(
        {
          url: parsed.href,
          filename: safeFilename(message.filename),
          saveAs: true,
        },
        (id) => {
          sendResponse({
            ok: Boolean(id),
            id,
            error: chrome.runtime.lastError?.message,
          });
        },
      );
    };
    chrome.permissions.request({ origins: [origin] }, () => start());
    return true;
  }

  if (message?.type === "hiven.detected" && Array.isArray(message.found)) {
    const ready = message.found.filter((x) => x.downloadable).length;
    chrome.action.setBadgeBackgroundColor({ color: "#ff3b30" });
    chrome.action.setBadgeText({ text: ready ? String(ready) : "" });
    chrome.storage.local.set({
      lastScan: {
        at: Date.now(),
        pageTitle: message.pageTitle || "",
        found: message.found,
      },
    });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
