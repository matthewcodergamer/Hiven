chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    hivenInstalledAt: Date.now(),
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "hiven.download" && typeof message.url === "string") {
    chrome.downloads.download(
      {
        url: message.url,
        filename: message.filename || undefined,
        saveAs: false,
      },
      (id) => {
        sendResponse({ ok: Boolean(id), id, error: chrome.runtime.lastError?.message });
      },
    );
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
