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

function showEmpty(title, detail) {
  const empty = document.createElement("div");
  empty.className = "empty";
  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "▣";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const message = document.createElement("p");
  message.textContent = detail;
  empty.append(icon, heading, message);
  listEl.append(empty);
}

function render(found) {
  listEl.replaceChildren();
  if (!found.length) {
    statusEl.textContent = "0 found";
    showEmpty("No accessible media found", "Try another page, or check whether its player exposes a downloadable source.");
    return;
  }
  const ready = found.filter((x) => x.downloadable).length;
  statusEl.textContent = `${found.length} found · ${ready} available`;
  for (const item of found) {
    const row = document.createElement("div");
    row.className = "row";
    const icon = document.createElement("span");
    icon.className = "media-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▶";
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("p");
    title.textContent = item.title || item.src;
    const kind = document.createElement("p");
    kind.className = "kind";
    kind.textContent = item.kind || "Media file";
    meta.append(title, kind);
    const action = document.createElement("button");
    action.type = "button";
    if (item.downloadable) {
      action.className = "save";
      action.textContent = "Save";
      action.setAttribute("aria-label", `Save ${item.title || "detected media"}`);
      action.addEventListener("click", async () => {
        action.disabled = true;
        action.textContent = "Saving…";
        try {
          const res = await chrome.runtime.sendMessage({
            type: "hiven.download",
            url: item.src,
            filename: filenameFrom(item),
          });
          action.textContent = res?.ok ? "Queued" : "Failed";
          if (!res?.ok) action.title = res?.error || "Download could not be started";
        } catch (err) {
          action.textContent = "Failed";
          action.title = err?.message || "Download could not be started";
        } finally {
          action.disabled = false;
        }
      });
    } else {
      action.className = "held";
      action.textContent = "Unavailable";
      action.disabled = true;
      action.title = item.blockedReason || "This source cannot be downloaded by Hiven.";
    }
    row.append(icon, meta, action);
    listEl.append(row);
  }
}

scanBtn?.addEventListener("click", async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning…";
  statusEl.textContent = "Scanning page";
  listEl.replaceChildren();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      statusEl.textContent = "No active tab";
      showEmpty("No active tab", "Open a webpage and try again.");
      return;
    }
    if (tab.url && /^(chrome|chrome-extension|edge|about|devtools):/i.test(tab.url)) {
      statusEl.textContent = "Page unavailable";
      showEmpty("This page can’t be scanned", "Chrome internal pages and browser settings do not allow content scanning.");
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
    statusEl.textContent = "Scan failed";
    showEmpty("Couldn’t scan this page", err?.message || "The page may restrict extension access.");
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = '<span aria-hidden="true">⌕</span> Scan this tab';
  }
});
