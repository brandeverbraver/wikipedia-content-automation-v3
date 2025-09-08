# Wikipedia Content Automation 3.0 — UI Only

This is the UI-only shell for the Figma plugin. It’s safe to install alongside your 2.x plugin; it does **not** modify your document.

## Files
- `manifest.json` — minimal manifest (no plugin ID so it won’t collide in local dev)
- `code.js` — opens the UI and streams live selection info to the panel
- `ui.html` — visual panel with tabs: Build / Sync / Review / Export

## Install (Figma desktop)
1. In Figma, go to **Plugins → Development → Import plugin from manifest…**
2. Choose this folder’s `manifest.json`.
3. Run **Plugins → Development → Wikipedia Content Automation 3.0 — UI Only**.

## Notes
- The panel is visual-only. Buttons display toasts but do not perform actions yet.
- Selection counts update live via `code.js`.
- When ready, we’ll add functionality in phases: export previews → sync → Airtable wiring.
