// Wikipedia Content Automation 3.0 — Alpha.1
// UI host + selection summary + non-destructive Export Preview.
// No Airtable calls. No document mutations.

figma.showUI(__html__, { width: 380, height: 640 });

/* ---------- helpers ---------- */

function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getAncestorSection(node) {
  let n = node;
  while (n) {
    if (n.type === "SECTION") return n;
    n = n.parent;
  }
  return null;
}

// treat a child selection as its top frame/instance/component
function toTopFrameLike(node) {
  let t = node;
  while (t && !["FRAME", "COMPONENT", "INSTANCE"].includes(t.type)) {
    t = t.parent;
  }
  return t || null;
}

function listSelectedFrameLikes() {
  const set = new Set();
  for (const n of figma.currentPage.selection) {
    const top = toTopFrameLike(n);
    if (top) set.add(top);
  }
  return Array.from(set);
}

function inferVariant(frame) {
  const name = frame.name.toLowerCase();
  if (name.includes("story")) return "STORY";
  if (name.includes("feed")) return "FEED";
  // fallback by aspect ratio (tall = STORY)
  const w = frame.width, h = frame.height;
  if (h > w * 1.15) return "STORY";
  return "FEED";
}

function parseSectionName(sectionName) {
  if (!sectionName) return { date: "unknown-date", articleSlug: "untitled" };
  const parts = sectionName.split("_");
  const date = parts[0] || "unknown-date";
  const articleSlug = slugify(parts.slice(1).join("_") || "untitled");
  return { date, articleSlug };
}

function buildFilename({ date, articleSlug, variant, index }) {
  const v = variant.toLowerCase();
  return `${date}_${articleSlug}_${v}_${index}.png`;
}

function summarizeSelectionToUI() {
  const sel = figma.currentPage.selection;
  const sections = new Map();
  let frames = 0;
  for (const n of sel) {
    const top = toTopFrameLike(n);
    if (top) frames += 1;
    const sec = getAncestorSection(n);
    if (sec) sections.set(sec.id, sec.name);
  }
  figma.ui.postMessage({
    type: "selection-summary",
    payload: {
      nodes: sel.length,
      frames,
      sections: Array.from(sections.values())
    }
  });
}

/* ---------- wire selection updates ---------- */

figma.on("selectionchange", summarizeSelectionToUI);
figma.on("currentpagechange", summarizeSelectionToUI);
summarizeSelectionToUI();

/* ---------- Export Preview (no disk writes) ---------- */

async function exportPreviewForSelection() {
  const targets = listSelectedFrameLikes();
  if (targets.length === 0) {
    figma.ui.postMessage({
      type: "export-preview-result",
      payload: { ok: false, error: "No frames selected." }
    });
    figma.notify("Select at least one frame/instance to preview.");
    return;
  }

  // index per (sectionId|variant)
  const counters = new Map();
  const items = [];

  for (const node of targets) {
    const section = getAncestorSection(node);
    const sectionName = section ? section.name : "NoSection";
    const { date, articleSlug } = parseSectionName(section ? section.name : "");
    const variant = inferVariant(node);
    const counterKey = `${section ? section.id : "__no__"}|${variant}`;
    const idx = (counters.get(counterKey) || 0) + 1;
    counters.set(counterKey, idx);

    const filename = buildFilename({
      date,
      articleSlug,
      variant,
      index: idx
    });

    // Export PNG bytes (scale 1 for speed; bump later if needed)
    const bytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 1 }
    });

    items.push({
      sectionName,
      variant,
      index: idx,
      filename,
      // The "virtual path" we’ll later mirror to disk:
      virtualPath: `${sectionName}/${variant}/${filename}`,
      bytes // Uint8Array; UI will turn this into a Blob URL
    });
  }

  figma.ui.postMessage({
    type: "export-preview-result",
    payload: { ok: true, items }
  });
}

/* ---------- UI messages ---------- */

figma.ui.onmessage = async (msg) => {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case "export-preview":
      figma.ui.postMessage({ type: "export-preview-progress", payload: { running: true } });
      try {
        await exportPreviewForSelection();
      } catch (e) {
        figma.ui.postMessage({
          type: "export-preview-result",
          payload: { ok: false, error: String(e) }
        });
      } finally {
        figma.ui.postMessage({ type: "export-preview-progress", payload: { running: false } });
      }
      break;

    // Stubs (reserved for future wiring):
    case "sync-selected":
    case "review-selected":
      // no-ops for alpha
      break;
  }
};
