/**
 * Storyboard Capture — Content Script v0.4
 * Auto-captures raw transcripts → /raw-capture → review inbox.
 * Rejection/compaction events still go direct to /capture-web (immediate).
 * Detects rejections, compactions, and new messages.
 */

// ── Config ────────────────────────────────────────────────────────────────────
const SB_PORT = 3847;
const SB_ENDPOINT = `http://127.0.0.1:${SB_PORT}/capture-web`;     // direct: rejections, compactions
const SB_RAW_ENDPOINT = `http://127.0.0.1:${SB_PORT}/raw-capture`;  // → inbox: auto-captured transcripts
const AUTO_CAPTURE_ENABLED = true;
const REJECTION_PATTERNS = [
  /no[,.]?\s+(that|this|it)\s+doesn't/i,
  /that\s+doesn't\s+make\s+(any\s+)?sense/i,
  /we\s+already\s+tried\s+that/i,
  /don't\s+do\s+that/i,
  /stop\s+doing/i,
  /I\s+said\s+don't/i,
  /not\s+what\s+I\s+wanted/i,
  /that's\s+wrong/i,
  /revert\s+that/i,
  /undo\s+that/i,
  /scratch\s+that/i,
  /forget\s+that/i,
  /that\s+won't\s+work/i,
  /not\s+going\s+with\s+that/i,
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function qs(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return null;
}

function clean(text, maxLen = 800) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function autoTitle(messages, fallback) {
  if (messages.length) {
    const first = clean(messages[0].text, 80);
    if (first.length > 10) return first.replace(/[?!.]$/, '').slice(0, 72);
  }
  return fallback || document.title.split('|')[0].split('-')[0].trim() || 'AI Session';
}

function domOrder(el) {
  let pos = 0;
  let node = el;
  while (node) { pos++; node = node.previousElementSibling; }
  let parent = el.parentElement;
  while (parent) {
    let p = 0, n = parent;
    while (n) { p++; n = n.previousElementSibling; }
    pos += p * 100;
    parent = parent.parentElement;
    break;
  }
  return pos;
}

function extractFallback(max) {
  const turns = [];
  document.querySelectorAll('p, li, .message, .response, .chat-message').forEach(el => {
    const text = clean(el.textContent, 400);
    if (text.length > 20 && text.length < 700) turns.push({ role: 'unknown', text, order: domOrder(el) });
  });
  return [...new Map(turns.map(t => [t.text, t])).values()].slice(-max);
}

// ── Site adapters ─────────────────────────────────────────────────────────────
const ADAPTERS = {

  'claude.ai': {
    name: 'Claude',
    icon: '🟠',
    getTitle() {
      return qs([
        '[data-testid="conversation-title"]',
        '.font-tiempos-medium',
        'nav [aria-current="page"] .truncate',
        'nav li[aria-selected="true"] span',
        'h1.truncate',
      ]) || null;
    },
    getMessages(limit = 40) {
      const turns = [];
      document.querySelectorAll([
        '[data-testid="human-turn"]',
        '.human-turn',
        '.human-turn-inner',
      ].join(',')).forEach(el => {
        const text = clean(el.textContent, 800);
        if (text.length > 5) turns.push({ role: 'user', text, order: domOrder(el) });
      });
      document.querySelectorAll([
        '[data-testid="assistant-message"]',
        '.font-claude-message',
        '.assistant-message',
        '[data-is-streaming="false"] .prose',
      ].join(',')).forEach(el => {
        const text = clean(el.textContent, 800);
        if (text.length > 5) turns.push({ role: 'assistant', text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-limit);
    },
    getLastUserMessage() {
      const els = [...document.querySelectorAll('[data-testid="human-turn"], .human-turn-inner')];
      return els.length ? clean(els[els.length - 1].textContent, 400) : null;
    },
    observeNewMessages(callback) {
      // Watch for new assistant responses completing
      const target = document.querySelector('main, [data-testid="conversation-turn-list"], .flex.flex-col') || document.body;
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              // Check if a new assistant message appeared
              const isAssistant = node.matches?.('[data-testid="assistant-message"], .font-claude-message') ||
                                  node.querySelector?.('[data-testid="assistant-message"], .font-claude-message');
              if (isAssistant) {
                // Small delay to let content render fully
                setTimeout(callback, 800);
                return;
              }
              // Also detect streaming completion (data-is-streaming changes)
              const streaming = node.querySelector?.('[data-is-streaming]');
              if (streaming) {
                const streamer = new MutationObserver(() => {
                  if (streaming.getAttribute('data-is-streaming') === 'false') {
                    streamer.disconnect();
                    setTimeout(callback, 600);
                  }
                });
                streamer.observe(streaming, { attributes: true });
              }
            }
          }
        }
      });
      observer.observe(target, { childList: true, subtree: true });
      return observer;
    },
  },

  'chatgpt.com': {
    name: 'ChatGPT',
    icon: '🟢',
    getTitle() {
      return qs([
        'nav [aria-selected="true"] span',
        'nav [aria-current="page"] span',
        'nav .active span',
        'title',
      ])?.replace(' | ChatGPT', '').replace('ChatGPT - ', '').trim() || null;
    },
    getMessages(limit = 40) {
      const turns = [];
      document.querySelectorAll('[data-message-author-role]').forEach(el => {
        const role = el.getAttribute('data-message-author-role');
        const textEl = el.querySelector('.markdown, .whitespace-pre-wrap, p') || el;
        const text = clean(textEl.textContent, 800);
        if (text.length > 5) turns.push({ role, text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-limit);
    },
    getLastUserMessage() {
      const els = [...document.querySelectorAll('[data-message-author-role="user"]')];
      return els.length ? clean(els[els.length - 1].textContent, 400) : null;
    },
    observeNewMessages(callback) {
      const target = document.querySelector('main') || document.body;
      const observer = new MutationObserver(() => {
        const last = [...document.querySelectorAll('[data-message-author-role="assistant"]')].pop();
        if (last && !last.querySelector('.result-streaming')) {
          setTimeout(callback, 800);
        }
      });
      observer.observe(target, { childList: true, subtree: true, characterData: true });
      return observer;
    },
  },

  'gemini.google.com': {
    name: 'Gemini',
    icon: '🔵',
    getTitle() {
      return qs(['.conversation-title', '[data-conversation-title]', 'h1.gds-headline-s']) || null;
    },
    getMessages(limit = 40) {
      const turns = [];
      document.querySelectorAll('.query-text, .user-query, [data-turn-type="human"]').forEach(el => {
        const text = clean(el.textContent, 800);
        if (text.length > 5) turns.push({ role: 'user', text, order: domOrder(el) });
      });
      document.querySelectorAll('message-content, .model-response-text, [data-turn-type="model"]').forEach(el => {
        const text = clean(el.textContent, 800);
        if (text.length > 5) turns.push({ role: 'assistant', text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-limit);
    },
    getLastUserMessage() {
      const els = [...document.querySelectorAll('.query-text, .user-query')];
      return els.length ? clean(els[els.length - 1].textContent, 400) : null;
    },
    observeNewMessages(callback) {
      const observer = new MutationObserver(() => setTimeout(callback, 1200));
      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },
  },

  'perplexity.ai': {
    name: 'Perplexity',
    icon: '⚫',
    getTitle() { return qs(['.conversation-title', 'h1']) || null; },
    getMessages(limit = 20) { return extractFallback(limit); },
    getLastUserMessage() { return null; },
    observeNewMessages(callback) {
      const observer = new MutationObserver(() => setTimeout(callback, 1000));
      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },
  },

  'copilot.microsoft.com': {
    name: 'Copilot',
    icon: '🔷',
    getTitle() { return qs(['[aria-label="Chat title"]', 'h1', '.chat-title']) || null; },
    getMessages(limit = 20) {
      const turns = [];
      document.querySelectorAll('[data-testid="user-message"], .user-message').forEach(el => {
        const text = clean(el.textContent, 800);
        if (text.length > 5) turns.push({ role: 'user', text, order: domOrder(el) });
      });
      document.querySelectorAll('[data-testid="ai-message"], .ai-message, .response-message').forEach(el => {
        const text = clean(el.textContent, 800);
        if (text.length > 5) turns.push({ role: 'assistant', text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-limit);
    },
    getLastUserMessage() { return null; },
    observeNewMessages(callback) {
      const observer = new MutationObserver(() => setTimeout(callback, 1000));
      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },
  },

  'default': {
    name: 'AI Session', icon: '🤖',
    getTitle() { return null; },
    getMessages(limit = 10) { return extractFallback(limit); },
    getLastUserMessage() { return null; },
    observeNewMessages(callback) {
      const observer = new MutationObserver(() => setTimeout(callback, 1500));
      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },
  },
};

function getAdapter() {
  const host = location.hostname;
  return ADAPTERS[host] || ADAPTERS[host.replace('www.', '')] || ADAPTERS['default'];
}

function buildContext(turns) {
  return turns.map(t => {
    const label = t.role === 'user' ? 'You' : t.role === 'assistant' ? 'AI' : '—';
    return `[${label}] ${t.text}`;
  }).join('\n\n');
}

// ── Auto-capture engine ───────────────────────────────────────────────────────
let _lastCapturedTurnCount = 0;
let _lastCaptureTs = 0;
let _debounceTimer = null;
const MIN_CAPTURE_INTERVAL_MS = 30000; // at most once every 30s

function buildDiscussionContent(turns, title) {
  const date = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const lines = [`# Discussion: ${title}`, `\nCaptured: ${date} · ${turns.length} turns\n`, '---\n'];
  turns.forEach(t => {
    const label = t.role === 'user' ? '**You:**' : t.role === 'assistant' ? '**AI:**' : '—';
    lines.push(`${label} ${t.text}\n`);
  });
  return lines.join('\n');
}

async function autoCapture() {
  const now = Date.now();
  if (now - _lastCaptureTs < MIN_CAPTURE_INTERVAL_MS) return;

  const adapter = getAdapter();
  const turns = adapter.getMessages(60); // capture up to 60 turns
  if (turns.length <= _lastCapturedTurnCount) return; // nothing new
  if (turns.length < 2) return; // too short

  _lastCapturedTurnCount = turns.length;
  _lastCaptureTs = now;

  const sidebarTitle = adapter.getTitle();
  const title = sidebarTitle || autoTitle(turns, document.title);
  const transcript = buildContext(turns);

  try {
    // Route through /raw-capture → inbox flow (total capture architecture)
    // Dashboard will show 📥 badge; user reviews/approves in inbox overlay
    const res = await fetch(SB_RAW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        transcript,
        source: adapter.name,
        url: location.href,
        turnCount: turns.length,
        _autoCapture: true,
      }),
    });
    if (res.ok) {
      showAutoCaptureToast('📥 Sent to inbox');
    }
  } catch {
    // MCP server might not be running — silent fail
  }
}

// ── Rejection detection ───────────────────────────────────────────────────────
function detectRejection(text) {
  if (!text) return false;
  return REJECTION_PATTERNS.some(p => p.test(text));
}

let _lastRejectionText = '';
function checkForRejection() {
  const adapter = getAdapter();
  const lastMsg = adapter.getLastUserMessage?.();
  if (!lastMsg || lastMsg === _lastRejectionText) return;
  if (detectRejection(lastMsg)) {
    _lastRejectionText = lastMsg;
    showRejectionToast(lastMsg);
  }
}

// ── Toasts ────────────────────────────────────────────────────────────────────
function showAutoCaptureToast(msg) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:70px; right:20px; z-index:2147483647;
    background:rgba(14,14,20,0.92); border:1px solid rgba(86,207,170,0.4);
    border-radius:8px; padding:7px 12px;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    font-size:11px; font-weight:600; color:#56cfaa;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);
    opacity:0; transition:opacity .3s; pointer-events:none;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function showRejectionToast(rejectedText) {
  const existing = document.getElementById('sb-rejection-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'sb-rejection-toast';
  el.style.cssText = `
    position:fixed; bottom:70px; right:20px; z-index:2147483647;
    background:rgba(14,14,20,0.95); border:1px solid rgba(220,38,38,0.4);
    border-radius:10px; padding:10px 14px; max-width:300px;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
    backdrop-filter:blur(8px);
  `;
  el.innerHTML = `
    <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#f87171;margin-bottom:5px">✕ Rejection detected</div>
    <div style="font-size:11px;color:#e2e8f0;line-height:1.4;margin-bottom:8px;text-decoration:line-through;text-decoration-color:rgba(248,113,113,.4)">${rejectedText.slice(0, 80)}${rejectedText.length > 80 ? '…' : ''}</div>
    <div style="display:flex;gap:6px">
      <button id="sb-reject-save" style="flex:1;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.3);border-radius:6px;padding:5px 8px;color:#f87171;font-size:11px;font-weight:700;cursor:pointer">Save rejection</button>
      <button id="sb-reject-dismiss" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:5px 8px;color:#64748b;font-size:11px;cursor:pointer">✕</button>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('#sb-reject-save').onclick = async () => {
    const adapter = getAdapter();
    const turns = adapter.getMessages(20);
    const prevAI = [...turns].reverse().find(t => t.role === 'assistant')?.text || '';
    try {
      await fetch(SB_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prevAI.slice(0, 80) || rejectedText.slice(0, 80),
          summary: `Rejected: "${rejectedText.slice(0, 200)}"${prevAI ? `\n\nWhat was rejected: ${prevAI.slice(0, 200)}` : ''}`,
          type: 'rejection',
          source: adapter.name,
          url: location.href,
        }),
      });
      el.innerHTML = `<div style="font-size:12px;color:#56cfaa;font-weight:600;padding:4px 0">✓ Rejection saved</div>`;
      setTimeout(() => el.remove(), 1500);
    } catch {
      el.innerHTML = `<div style="font-size:11px;color:#f87171;padding:4px 0">MCP server not running</div>`;
      setTimeout(() => el.remove(), 2000);
    }
  };
  el.querySelector('#sb-reject-dismiss').onclick = () => el.remove();

  // Auto-dismiss after 8s
  setTimeout(() => el?.isConnected && el.remove(), 8000);
}

// ── Compaction detection ──────────────────────────────────────────────────────
function checkForCompaction() {
  const adapter = getAdapter();
  const turns = adapter.getMessages(60);
  // If turn count drops significantly from what we last saw, compaction likely occurred
  if (_lastCapturedTurnCount > 10 && turns.length < _lastCapturedTurnCount * 0.4) {
    showCompactionToast();
    _lastCapturedTurnCount = turns.length;
  }
}

function showCompactionToast() {
  const existing = document.getElementById('sb-compaction-toast');
  if (existing) return;

  const el = document.createElement('div');
  el.id = 'sb-compaction-toast';
  el.style.cssText = `
    position:fixed; bottom:70px; right:20px; z-index:2147483647;
    background:rgba(14,14,20,0.95); border:1px solid rgba(100,116,139,0.4);
    border-radius:10px; padding:10px 14px; max-width:300px;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
    backdrop-filter:blur(8px);
  `;
  el.innerHTML = `
    <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:5px">🗜️ Context compacted</div>
    <div style="font-size:11px;color:#e2e8f0;line-height:1.4;margin-bottom:8px">The conversation was just summarised. What was lost?</div>
    <textarea id="sb-compaction-note" placeholder="What did the compaction miss? (optional)" style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(100,116,139,.25);border-radius:6px;padding:6px 8px;color:#e2e8f0;font-size:11px;resize:none;height:50px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:6px"></textarea>
    <div style="display:flex;gap:6px">
      <button id="sb-compact-save" style="flex:1;background:rgba(100,116,139,.15);border:1px solid rgba(100,116,139,.3);border-radius:6px;padding:5px 8px;color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer">Capture event</button>
      <button id="sb-compact-dismiss" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:5px 8px;color:#64748b;font-size:11px;cursor:pointer">✕</button>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('#sb-compact-save').onclick = async () => {
    const note = el.querySelector('#sb-compaction-note').value;
    try {
      await fetch(SB_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Context compaction',
          summary: note || 'Raw conversation was summarised by the AI. Exact losses unknown.',
          type: 'compaction',
          url: location.href,
        }),
      });
      el.innerHTML = `<div style="font-size:12px;color:#56cfaa;font-weight:600;padding:4px 0">✓ Compaction captured</div>`;
      setTimeout(() => el.remove(), 1500);
    } catch {
      el.innerHTML = `<div style="font-size:11px;color:#f87171;padding:4px 0">MCP server not running</div>`;
      setTimeout(() => el.remove(), 2000);
    }
  };
  el.querySelector('#sb-compact-dismiss').onclick = () => el.remove();
  setTimeout(() => el?.isConnected && el.remove(), 15000);
}

// ── Badge ─────────────────────────────────────────────────────────────────────
let _badge = null;
function injectBadge() {
  if (_badge || document.getElementById('sb-capture-badge')) return;

  _badge = document.createElement('div');
  _badge.id = 'sb-capture-badge';
  _badge.innerHTML = `
    <div style="
      position:fixed; bottom:20px; right:20px; z-index:2147483647;
      background:rgba(14,14,20,0.92); border:1px solid rgba(124,107,255,0.4);
      border-radius:10px; padding:8px 12px; cursor:pointer;
      display:flex; align-items:center; gap:8px;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      font-size:12px; font-weight:600; color:#c4b9ff;
      box-shadow:0 4px 20px rgba(0,0,0,0.4);
      backdrop-filter:blur(8px); transition:all .2s; opacity:0.85;
    "
    onmouseover="this.style.opacity='1';this.style.borderColor='rgba(124,107,255,0.8)'"
    onmouseout="this.style.opacity='0.85';this.style.borderColor='rgba(124,107,255,0.4)'"
    onclick="window._sbCaptureClick()">
      <span style="font-size:14px">⬡</span>
      <span>Capture</span>
    </div>
  `;
  document.body.appendChild(_badge);

  window._sbCaptureClick = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    const inner = _badge.querySelector('div');
    inner.style.borderColor = 'rgba(86,207,170,0.8)';
    inner.querySelector('span:last-child').textContent = 'Opening…';
    setTimeout(() => {
      inner.style.borderColor = 'rgba(124,107,255,0.4)';
      inner.querySelector('span:last-child').textContent = 'Capture';
    }, 1500);
  };
}

// ── Message listener (called by popup) ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_CONTEXT') {
    const adapter = getAdapter();
    const turns = adapter.getMessages(40);
    const sidebarTitle = adapter.getTitle();
    const title = sidebarTitle || autoTitle(turns, document.title);
    const context = buildContext(turns);
    sendResponse({
      tool: adapter.name,
      icon: adapter.icon,
      title,
      messages: context,
      turnCount: turns.length,
      url: location.href,
    });
    return true;
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  injectBadge();

  if (!AUTO_CAPTURE_ENABLED) return;

  const adapter = getAdapter();

  // Start observing new messages
  let _observer = null;
  function startObserver() {
    if (_observer) _observer.disconnect();
    try {
      _observer = adapter.observeNewMessages(() => {
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
          checkForRejection();
          checkForCompaction();
          autoCapture();
        }, 1200);
      });
    } catch (e) {
      // Fallback: poll every 20s
      setInterval(() => {
        checkForRejection();
        autoCapture();
      }, 20000);
    }
  }

  startObserver();

  // Re-init on SPA navigation (new conversation started)
  const _origPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    _origPushState(...args);
    _lastCapturedTurnCount = 0; // reset for new conversation
    _lastCaptureTs = 0;
    setTimeout(() => { injectBadge(); startObserver(); }, 1500);
  };
}

setTimeout(init, 2000);
