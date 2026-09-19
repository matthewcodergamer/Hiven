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
  return false;
});
