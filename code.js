// Wikipedia Content Automation 3.0 — UI Only
// Host script that opens the UI and streams selection info.
// No Airtable calls, no document mutations — safe to run alongside v2.

figma.showUI(__html__, { width: 380, height: 600 });

function getAncestorSection(node) {
  let n = node;
  while (n) {
    if (n.type === "SECTION") return n;
    n = n.parent;
  }
  return null;
}

function summarizeSelection() {
  const sel = figma.currentPage.selection;
  const sections = new Map(); // sectionId -> name
  let frames = 0;

  for (const node of sel) {
    // Count top-level frames/instances/components in the selection cluster
    let top = node;
    while (top && !["FRAME", "COMPONENT", "INSTANCE"].includes(top.type)) {
      top = top.parent;
    }
    if (top) frames += 1;
    const sec = getAncestorSection(node);
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

figma.on("selectionchange", summarizeSelection);
figma.on("currentpagechange", summarizeSelection);
summarizeSelection(); // initial ping
