/**
 * Hiven content script — injected on demand when the user scans the current tab.
 * Does not run on every page by default.
 */
(function hivenDetect() {
  const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)(?:$|\?)/i;
  const found = [];

  function abs(src) {
    try {
      return new URL(src, location.href).toString();
    } catch {
      return src;
    }
  }

  document.querySelectorAll("video").forEach((el) => {
    const src =
      el.currentSrc ||
      el.getAttribute("src") ||
      el.querySelector("source")?.getAttribute("src") ||
      "";
    if (!src) return;
    found.push({
      title: el.getAttribute("title") || el.getAttribute("aria-label") || document.title,
      src: abs(src),
      kind: "html5",
      downloadable: VIDEO_EXT.test(src),
      pageUrl: location.href,
    });
  });

  document.querySelectorAll("a[href]").forEach((el) => {
    const href = el.getAttribute("href") || "";
    if (!VIDEO_EXT.test(href)) return;
    found.push({
      title: (el.textContent || "").trim() || href,
      src: abs(href),
      kind: "direct",
      downloadable: true,
      pageUrl: location.href,
    });
  });

  chrome.runtime.sendMessage({ type: "hiven.detected", found, pageTitle: document.title });
  return found;
})();
