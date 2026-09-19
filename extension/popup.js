const scanBtn = document.getElementById("scan");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

function filenameFrom(item) {
  try {
    const u = new URL(item.src);
    const last = u.pathname.split("/").filter(Boolean).pop() || "video.mp4";
    return last.includes(".") ? last : `${last}.mp4`;
  } catch {
    return "video.mp4";
  }
}

function render(found) {
  listEl.innerHTML = "";
  if (!found.length) {
    statusEl.textContent = "Nothing accessible on this page.";
    return;
  }
  const ready = found.filter((x) => x.downloadable).length;
  statusEl.textContent = `${found.length} detected · ${ready} ready to save`;
  for (const item of found) {
    const row = document.createElement("div");
    row.className = "row";
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("p");
    title.textContent = item.title || item.src;
    const kind = document.createElement("p");
    kind.className = "kind";
    kind.textContent = item.kind || "media";
    meta.append(title, kind);
    const action = document.createElement("button");
    action.type = "button";
    if (item.downloadable) {
      action.className = "save";
      action.textContent = "Save";
      action.addEventListener("click", async () => {
        action.disabled = true;
        const res = await chrome.runtime.sendMessage({
          type: "hiven.download",
          url: item.src,
          filename: filenameFrom(item),
        });
        action.disabled = false;
        action.textContent = res?.ok ? "Queued" : "Failed";
      });
    } else {
      action.className = "held";
      action.textContent = "Held";
      action.disabled = true;
      action.title = item.blockedReason || "Not downloadable";
    }
    row.append(meta, action);
    listEl.append(row);
  }
}

scanBtn?.addEventListener("click", async () => {
  scanBtn.disabled = true;
  statusEl.textContent = "Scanning…";
  listEl.innerHTML = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      statusEl.textContent = "No active tab.";
      return;
    }
    if (tab.url && /^(chrome|chrome-extension|edge|about|devtools):/i.test(tab.url)) {
      statusEl.textContent = "Chrome pages cannot be scanned.";
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    const found = Array.isArray(results?.[0]?.result) ? results[0].result : [];
    render(found);
    await chrome.runtime.sendMessage({ type: "hiven.detected", found, pageTitle: tab.title });
  } catch (err) {
    statusEl.textContent = err?.message || "Scan failed on this page.";
  } finally {
    scanBtn.disabled = false;
  }
});
