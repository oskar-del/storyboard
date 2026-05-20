/**
 * Storyboard — Background Service Worker
 * Handles fetch to localhost (bypasses CORS restrictions in content scripts)
 */

const STORYBOARD_URL = 'http://127.0.0.1:3847/capture-web';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'CAPTURE_BLOCK') {
    captureBlock(msg.payload).then(sendResponse).catch(err => {
      sendResponse({ ok: false, error: err.message });
    });
    return true; // keep channel open for async
  }

  if (msg.type === 'OPEN_POPUP') {
    // Can't programmatically open popup in MV3 — user must click icon
    // Just acknowledge
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'CHECK_SERVER') {
    fetch('http://127.0.0.1:3847/ping', { method: 'GET' })
      .then(r => sendResponse({ ok: r.ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function captureBlock(payload) {
  const res = await fetch(STORYBOARD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return await res.json();
}
