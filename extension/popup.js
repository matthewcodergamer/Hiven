const scanBtn = document.getElementById("scan");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const ipEl = document.getElementById("ip");
const ipNote = document.getElementById("ip-note");
const chip = document.getElementById("prot-chip");
const secureBtn = document.getElementById("secure");
const leakBtn = document.getElementById("leak");

function filenameFrom(item) {
  const raw = item.title || "video";
  try {
    const u = new URL(item.src);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    if (last.includes(".")) return last;
  } catch {
    /* fall through */
  }
  const safe = raw.replace(/[<>:"/\\|?*]/g, " ").trim().slice(0, 80);
  return `${safe || "video"}.mp4`;
}

function render(found) {
  listEl.innerHTML = "";
  if (!found.length) {
    statusEl.textContent = "Nothing accessible on this page.";
    return;
  }
  const ready = found.filter((x) => x.downloadable).length;
  const held = found.length - ready;
  statusEl.textContent =
    ready === 0 && held
      ? `${found.length} detected · none can be saved`
      : `${found.length} detected · ${ready} ready to save`;
  for (const item of found) {
    const row = document.createElement("div");
    row.className = "row";
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("p");
    title.textContent = item.title || item.src;
    const kind = document.createElement("p");
    kind.className = "kind";
    kind.textContent = item.downloadable
      ? `${item.kind} · file`
      : item.blockedReason || `${item.kind} · held`;
    meta.append(title, kind);
    const action = document.createElement("button");
    action.type = "button";
    if (item.downloadable) {
      action.className = "save";
      action.textContent = "Save";
      action.addEventListener("click", async () => {
        action.disabled = true;
        action.textContent = "Saving";
        try {
          const res = await chrome.runtime.sendMessage({
            type: "hiven.download",
            url: item.src,
            filename: filenameFrom(item),
          });
          action.disabled = false;
          action.textContent = res?.ok ? "Saved" : "Failed";
          if (!res?.ok) statusEl.textContent = res?.error || "Save failed.";
        } catch (err) {
          action.disabled = false;
          action.textContent = "Failed";
          statusEl.textContent = err?.message || "Save failed.";
        }
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

function parseCandidateIp(candidate) {
  const m =
    candidate.match(/(?:raddr|typ host|typ srflx).*?(\d{1,3}(?:\.\d{1,3}){3})/i) ||
    candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
  return m ? m[1] : null;
}

async function fetchPublicIp() {
  for (const url of ["https://api.ipify.org?format=json", "https://api64.ipify.org?format=json"]) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.ip) return data.ip;
    } catch {
      /* next */
    }
  }
  return null;
}

async function collectWebRtcIps(timeoutMs = 1800) {
  if (typeof RTCPeerConnection === "undefined") return [];
  const ips = new Set();
  let pc;
  try {
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  } catch {
    return [];
  }
  pc.createDataChannel("hiven-leak");
  const done = new Promise((resolve) => {
    const t = setTimeout(resolve, timeoutMs);
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) {
        clearTimeout(t);
        resolve();
        return;
      }
      const ip = parseCandidateIp(ev.candidate.candidate);
      if (ip) ips.add(ip);
    };
  });
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await done;
  } catch {
    /* ignore */
  } finally {
    pc.close();
  }
  return [...ips];
}

function paintProtection({ ip, pinned, leak }) {
  ipEl.textContent = ip || "Unavailable";
  if (!ip) {
    chip.textContent = "Offline";
    chip.className = "chip warn";
    ipNote.textContent = "Could not read a public IP.";
    return;
  }
  if (pinned && ip !== pinned) {
    chip.textContent = "Exposed";
    chip.className = "chip warn";
    ipNote.textContent = `Pinned ${pinned}. This address changed.`;
    return;
  }
  if (leak) {
    chip.textContent = "Leak";
    chip.className = "chip warn";
    ipNote.textContent = "WebRTC advertised extra addresses.";
    return;
  }
  if (pinned) {
    chip.textContent = "Protected";
    chip.className = "chip ok";
    ipNote.textContent = "This IP is pinned. Hiven will warn if it changes.";
    return;
  }
  chip.textContent = "Unsecured";
  chip.className = "chip";
  ipNote.textContent = "Pin the address your VPN should keep.";
}

async function refreshIp(opts = {}) {
  const ip = await fetchPublicIp();
  const stored = await chrome.storage.local.get(["pinnedIp", "leakFound"]);
  let leak = Boolean(stored.leakFound);
  if (opts.checkLeak) {
    const extras = (await collectWebRtcIps()).filter((x) => x !== ip);
    leak = extras.length > 0;
    await chrome.storage.local.set({ leakFound: leak, webrtcIps: extras });
  }
  await chrome.storage.local.set({ lastIp: ip, lastIpAt: Date.now() });
  paintProtection({ ip, pinned: stored.pinnedIp, leak });
  return ip;
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

secureBtn?.addEventListener("click", async () => {
  secureBtn.disabled = true;
  const ip = await refreshIp();
  if (ip) {
    await chrome.storage.local.set({ pinnedIp: ip, leakFound: false });
    paintProtection({ ip, pinned: ip, leak: false });
  }
  secureBtn.disabled = false;
});

leakBtn?.addEventListener("click", async () => {
  leakBtn.disabled = true;
  await refreshIp({ checkLeak: true });
  leakBtn.disabled = false;
});

void refreshIp();
