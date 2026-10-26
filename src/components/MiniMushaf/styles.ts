// The Picture-in-Picture window is a separate document, so the app's CSS modules don't reach it.
// This is the whole stylesheet for the Mini Mushaf; colors come in as CSS variables from the main tab.
const MINI_MUSHAF_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body {
  background: var(--mm-bg);
  color: var(--mm-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  overflow: hidden;
  user-select: none;
}
.mm { position: relative; height: 100%; }
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px 12px;
  direction: rtl;
  overflow-y: auto;
}
/* zoomed in: lines keep their natural width and the page scrolls both ways */
.page.zoomed { justify-content: flex-start; overflow: auto; }
.page.zoomed .line { width: max-content; min-width: 100%; }
.line { display: flex; justify-content: space-between; white-space: nowrap; line-height: 1.8; }
.line.centered { justify-content: center; gap: 0.12em; }
.header {
  direction: ltr;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: surahnames;
  line-height: 1.8;
  border-block: 1px solid var(--mm-border);
}
.header span { font-size: 1.15em; line-height: 1; }
.bismillah { display: flex; justify-content: center; align-items: center; line-height: 1.8; color: var(--mm-text); }
.bismillah svg { height: 1.5em; width: auto; }
.measure { position: absolute; top: 0; left: 0; visibility: hidden; pointer-events: none; font-size: 100px; direction: rtl; }
.measure .line { display: block; width: max-content; }
.status { height: 100%; display: grid; place-items: center; text-align: center; color: var(--mm-faded); font-size: 13px; padding: 16px; }
.status button { margin-top: 8px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--mm-border); background: none; color: var(--mm-text); cursor: pointer; }
.bar {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--mm-bar);
  border-top: 1px solid var(--mm-border);
  font-size: 12px;
  color: var(--mm-faded);
  opacity: 0;
  transition: opacity 150ms ease;
}
.mm:hover .bar, .bar:focus-within { opacity: 1; }
.bar button {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--mm-text);
  cursor: pointer;
}
.bar button:hover { background: var(--mm-hover); }
.bar button:disabled { opacity: 0.35; cursor: default; background: none; }
.bar button.on { color: var(--mm-accent); }
.bar svg { width: 16px; height: 16px; }
.info { flex: 1; min-width: 0; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

export default MINI_MUSHAF_CSS;
