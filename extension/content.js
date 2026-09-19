/**
 * Hiven content script — injected on demand when the user scans the current tab.
 * Does not run on every page by default.
 */
(function hivenDetect() {
  const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)(?:$|\?)/i;
  const MANIFEST_EXT = /\.(m3u8|mpd)(?:$|\?)/i;
  const YT = /youtube\.com|youtu\.be/i;
  const found = [];

  function abs(src) {
    try {
      return new URL(src, location.href).toString();
    } catch {
      return src;
    }
  }

  function add(item) {
    if (!item.src) return;
    if (found.some((x) => x.src === item.src && x.kind === item.kind)) return;
    found.push(item);
  }

  document.querySelectorAll("video").forEach((el) => {
    const src =
      el.currentSrc ||
      el.getAttribute("src") ||
      el.querySelector("source")?.getAttribute("src") ||
      "";
    if (!src) return;
    const url = abs(src);
    const drm = el.mediaKeys || el.getAttribute("data-drm");
    if (drm) {
      add({
        title: el.getAttribute("title") || document.title,
        src: url,
        kind: "drm",
        downloadable: false,
        blockedReason: "Encrypted playback. No authorized file to save.",
      });
      return;
    }
    add({
      title: el.getAttribute("title") || el.getAttribute("aria-label") || document.title,
      src: url,
      kind: "html5",
      downloadable: VIDEO_EXT.test(url) && !url.startsWith("blob:"),
      blockedReason: url.startsWith("blob:") ? "Blob source — no file URL." : undefined,
      pageUrl: location.href,
    });
  });

  document.querySelectorAll("a[href]").forEach((el) => {
    const href = el.getAttribute("href") || "";
    if (!VIDEO_EXT.test(href)) return;
    add({
      title: (el.textContent || "").trim() || href,
      src: abs(href),
      kind: "direct",
      downloadable: true,
      pageUrl: location.href,
    });
  });

  document.querySelectorAll("video source[src], audio source[src]").forEach((el) => {
    const href = el.getAttribute("src") || "";
    if (MANIFEST_EXT.test(href)) {
      add({
        title: document.title,
        src: abs(href),
        kind: "manifest",
        downloadable: false,
        blockedReason: "Streaming manifest identified. Not assembled in v0.1.",
      });
    }
  });

  document.querySelectorAll("iframe[src], iframe[data-src]").forEach((el) => {
    const src = el.getAttribute("src") || el.getAttribute("data-src") || "";
    if (!src) return;
    const url = abs(src);
    const yt = YT.test(url);
    add({
      title: el.getAttribute("title") || (yt ? "YouTube embed" : "Embedded player"),
      src: url,
      kind: yt ? "youtube" : "embed",
      downloadable: false,
      blockedReason: yt
        ? "Detected, but Hiven will not extract YouTube streams."
        : "This embed is in a frame Hiven cannot extract.",
    });
  });

  return found;
})();
