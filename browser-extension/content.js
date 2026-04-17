/**
 * Storyboard Capture — Content Script v0.2
 * Smarter DOM adapters per AI tool.
 * Extracts title + ordered conversation context for the popup.
 */

// ── Utilities ─────────────────────────────────────────────────────────────────
function qs(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return null;
}

function qsAll(selectors) {
  for (const s of selectors) {
    const els = [...document.querySelectorAll(s)];
    if (els.length) return els;
  }
  return [];
}

function clean(text, maxLen = 400) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function autoTitle(messages, fallback) {
  // Use first user message as title if no sidebar title found
  if (messages.length) {
    const first = clean(messages[0].text, 80);
    if (first.length > 10) return first.replace(/[?!.]$/, '').slice(0, 72);
  }
  return fallback || document.title.split('|')[0].split('-')[0].trim() || 'AI Session';
}

// ── Site adapters ─────────────────────────────────────────────────────────────
const ADAPTERS = {

  'claude.ai': {
    name: 'Claude',
    icon: '🟠',
    getTitle() {
      return (
        qs([
          '[data-testid="conversation-title"]',
          '.font-tiempos-medium',
          'nav [aria-current="page"] .truncate',
          'nav li[aria-selected="true"] span',
          'h1.truncate',
        ]) || null  // null = fall back to autoTitle from messages
      );
    },
    getMessages() {
      const turns = [];
      // Human turns
      document.querySelectorAll([
        '[data-testid="human-turn"]',
        '.human-turn',
        '.human-turn-inner',
      ].join(',')).forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 5) turns.push({ role: 'user', text, order: domOrder(el) });
      });
      // Assistant turns
      document.querySelectorAll([
        '[data-testid="assistant-message"]',
        '.font-claude-message',
        '.assistant-message',
        '[data-is-streaming="false"] .prose',
      ].join(',')).forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 5) turns.push({ role: 'assistant', text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-8);
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
    getMessages() {
      const turns = [];
      document.querySelectorAll('[data-message-author-role]').forEach(el => {
        const role = el.getAttribute('data-message-author-role');
        const textEl = el.querySelector('.markdown, .whitespace-pre-wrap, p') || el;
        const text = clean(textEl.textContent);
        if (text.length > 5) turns.push({ role, text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-8);
    },
  },

  'chat.openai.com': {
    name: 'ChatGPT',
    icon: '🟢',
    getTitle() {
      return qs(['nav [aria-selected="true"] span', 'nav .active span'])
        ?.replace(' | ChatGPT', '').trim() || null;
    },
    getMessages() {
      const turns = [];
      document.querySelectorAll('[data-message-author-role]').forEach(el => {
        const role = el.getAttribute('data-message-author-role');
        const textEl = el.querySelector('.markdown, p') || el;
        const text = clean(textEl.textContent);
        if (text.length > 5) turns.push({ role, text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-8);
    },
  },

  'gemini.google.com': {
    name: 'Gemini',
    icon: '🔵',
    getTitle() {
      return qs([
        '.conversation-title',
        '[data-conversation-title]',
        'h1.gds-headline-s',
        '.gds-body-l strong',
      ]) || null;
    },
    getMessages() {
      const turns = [];
      // User queries
      document.querySelectorAll('.query-text, .user-query, [data-turn-type="human"]').forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 5) turns.push({ role: 'user', text, order: domOrder(el) });
      });
      // Gemini responses
      document.querySelectorAll('message-content, .model-response-text, [data-turn-type="model"]').forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 5) turns.push({ role: 'assistant', text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-8);
    },
  },

  'perplexity.ai': {
    name: 'Perplexity',
    icon: '⚫',
    getTitle() {
      return qs(['.conversation-title', 'h1']) || null;
    },
    getMessages() {
      const turns = [];
      document.querySelectorAll('.whitespace-pre-line, .query-text').forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 5) turns.push({ role: 'user', text, order: domOrder(el) });
      });
      document.querySelectorAll('.prose, .answer-text').forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 10) turns.push({ role: 'assistant', text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-6);
    },
  },

  'copilot.microsoft.com': {
    name: 'Copilot',
    icon: '🔷',
    getTitle() {
      return qs(['[aria-label="Chat title"]', 'h1', '.chat-title']) || null;
    },
    getMessages() {
      const turns = [];
      document.querySelectorAll('[data-testid="user-message"], .user-message').forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 5) turns.push({ role: 'user', text, order: domOrder(el) });
      });
      document.querySelectorAll('[data-testid="ai-message"], .ai-message, .response-message').forEach(el => {
        const text = clean(el.textContent);
        if (text.length > 5) turns.push({ role: 'assistant', text, order: domOrder(el) });
      });
      return turns.sort((a, b) => a.order - b.order).slice(-8);
    },
  },

  'cursor.com': {
    name: 'Cursor',
    icon: '⬛',
    getTitle() {
      return qs(['.chat-title', 'h1']) || null;
    },
    getMessages() {
      return extractFallback(6);
    },
  },

  'default': {
    name: 'AI Session',
    icon: '🤖',
    getTitle() { return null; },
    getMessages() { return extractFallback(4); },
  },
};

function domOrder(el) {
  // Approximate DOM position for sort
  let pos = 0;
  let node = el;
  while (node) { pos++; node = node.previousElementSibling; }
  let parent = el.parentElement;
  while (parent) { let p = 0; let n = parent; while (n) { p++; n = n.previousElementSibling; } pos += p * 100; parent = parent.parentElement; break; }
  return pos;
}

function extractFallback(max) {
  const turns = [];
  document.querySelectorAll('p, li, .message, .response, .chat-message').forEach(el => {
    const text = clean(el.textContent, 300);
    if (text.length > 20 && text.length < 600) turns.push({ role: 'unknown', text, order: domOrder(el) });
  });
  return [...new Map(turns.map(t => [t.text, t])).values()].slice(-max);
}

function getAdapter() {
  const host = location.hostname;
  return ADAPTERS[host] || ADAPTERS[host.replace('www.', '')] || ADAPTERS['default'];
}

function buildContext(turns) {
  // Format as a readable context string
  return turns.map(t => {
    const label = t.role === 'user' ? 'You' : t.role === 'assistant' ? 'AI' : '—';
    return `[${label}] ${t.text}`;
  }).join('\n\n');
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
    const turns = adapter.getMessages();
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

// Inject badge after page settles + re-inject on SPA nav
setTimeout(injectBadge, 2000);
const _origPushState = history.pushState.bind(history);
history.pushState = (...args) => { _origPushState(...args); setTimeout(injectBadge, 1500); };
