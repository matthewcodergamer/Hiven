/**
 * Hiven content script — injected on demand when the user scans the current tab.
 * Does not run on every page by default.
 */
(function hivenDetect() {
  const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)(?:$|\?|#)/i;
  const MANIFEST_EXT = /\.(m3u8|mpd)(?:$|\?|#)/i;
  const BLOCKED = /(?:^|\.)(?:youtube\.com|youtu\.be|youtube-nocookie\.com|googlevideo\.com|ytimg\.com)$/i;
  const found = [];

  function abs(src) {
    try {
      return new URL(src, location.href).toString();
    } catch {
      return src;
    }
  }

  function hostOf(src) {
    try {
      return new URL(src, location.href).hostname;
    } catch {
      return "";
    }
  }

  function blocked(src) {
    return BLOCKED.test(hostOf(src)) || BLOCKED.test(location.hostname);
  }

  function add(item) {
    if (!item.src) return;
    if (found.some((x) => x.src === item.src && x.kind === item.kind)) return;
    found.push(item);
  }

  function fileUrl(url) {
    if (!url || url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("mediasource:")) return false;
    if (blocked(url)) return false;
    return VIDEO_EXT.test(url);
  }

  if (BLOCKED.test(location.hostname)) {
    add({
      title: document.title || "YouTube",
      src: location.href,
      kind: "youtube",
      downloadable: false,
      blockedReason: "YouTube is detected. Hiven will not extract it.",
      pageUrl: location.href,
    });
    return found;
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
    const title = el.getAttribute("title") || el.getAttribute("aria-label") || document.title;
    if (drm) {
      add({
        title,
        src: url,
        kind: "drm",
        downloadable: false,
        blockedReason: "Encrypted playback. No authorized file to save.",
        pageUrl: location.href,
      });
      return;
    }
    if (blocked(url) || blocked(location.href)) {
      add({
        title,
        src: url,
        kind: "youtube",
        downloadable: false,
        blockedReason: "YouTube is detected. Hiven will not extract it.",
        pageUrl: location.href,
      });
      return;
    }
    const mime = el.querySelector("source")?.getAttribute("type") || "";
    const looksFile = fileUrl(url) || (/video\/(mp4|webm)/i.test(mime) && !url.startsWith("blob:"));
    add({
      title,
      src: url,
      kind: "html5",
      downloadable: Boolean(looksFile),
      blockedReason: looksFile
        ? undefined
        : url.startsWith("blob:")
          ? "In-memory playback. No file URL to save."
          : "No direct MP4 or WebM URL on this player.",
      pageUrl: location.href,
    });
  });

  document.querySelectorAll("a[href]").forEach((el) => {
    const href = el.getAttribute("href") || "";
    if (!VIDEO_EXT.test(href)) return;
    const url = abs(href);
    if (blocked(url)) {
      add({
        title: (el.textContent || "").trim() || "YouTube",
        src: url,
        kind: "youtube",
        downloadable: false,
        blockedReason: "YouTube is detected. Hiven will not extract it.",
      });
      return;
    }
    add({
      title: (el.textContent || "").trim() || href,
      src: url,
      kind: "direct",
      downloadable: true,
      pageUrl: location.href,
    });
  });

  document.querySelectorAll("video source[src], audio source[src]").forEach((el) => {
    const href = el.getAttribute("src") || "";
    if (!MANIFEST_EXT.test(href)) return;
    add({
      title: document.title,
      src: abs(href),
      kind: "manifest",
      downloadable: false,
      blockedReason: "Streaming manifest identified. Not assembled in v0.1.",
      pageUrl: location.href,
    });
  });

  document.querySelectorAll('meta[property="og:video"], meta[property="og:video:url"], meta[name="twitter:player:stream"]').forEach((el) => {
    const href = el.getAttribute("content") || "";
    if (!href) return;
    const url = abs(href);
    add({
      title: document.title,
      src: url,
      kind: fileUrl(url) ? "direct" : "embed",
      downloadable: fileUrl(url),
      blockedReason: fileUrl(url) ? undefined : "No direct file in the page metadata.",
      pageUrl: location.href,
    });
  });

  document.querySelectorAll("iframe[src], iframe[data-src]").forEach((el) => {
    const src = el.getAttribute("src") || el.getAttribute("data-src") || "";
    if (!src) return;
    const url = abs(src);
    const yt = blocked(url);
    add({
      title: el.getAttribute("title") || (yt ? "YouTube embed" : "Embedded player"),
      src: url,
      kind: yt ? "youtube" : "embed",
      downloadable: false,
      blockedReason: yt
        ? "YouTube is detected. Hiven will not extract it."
        : "This embed is in a frame Hiven cannot extract.",
      pageUrl: location.href,
    });
  });

  return found;
})();
