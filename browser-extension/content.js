/**
 * Storyboard Capture — Content Script
 * Runs on every supported AI tool page.
 * Extracts conversation context and sends a badge count to the popup.
 */

// ── Site adapters — extract title + recent messages per tool ──────────────────
const ADAPTERS = {
  'claude.ai': {
    name: 'Claude',
    icon: '🟠',
    getTitle: () => {
      // Claude shows conversation name in the sidebar selected item
      const sel = document.querySelector('[data-testid="conversation-title"], .font-tiempos-medium, h1');
      return sel?.textContent?.trim() || document.title.replace(' - Claude', '').trim();
    },
    getMessages: () => extractMessages([
      '.font-claude-message',       // Claude response bubbles
      '[data-testid="human-turn"]', // Human turns
      '.human-turn-inner',
    ], 6),
  },
  'chat.openai.com': {
    name: 'ChatGPT',
    icon: '🟢',
    getTitle: () => {
      const nav = document.querySelector('nav [aria-selected="true"] span, .active-conversation span');
      return nav?.textContent?.trim() || document.title.replace(' | ChatGPT', '').replace('ChatGPT - ', '').trim();
    },
    getMessages: () => extractMessages([
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="user"]',
    ], 6),
  },
  'chatgpt.com': {
    name: 'ChatGPT',
    icon: '🟢',
    getTitle: () => {
      const nav = document.querySelector('nav [aria-selected="true"] span, .active-conversation span');
      return nav?.textContent?.trim() || document.title.replace(' | ChatGPT', '').replace('ChatGPT - ', '').trim();
    },
    getMessages: () => extractMessages([
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="user"]',
    ], 6),
  },
  'gemini.google.com': {
    name: 'Gemini',
    icon: '🔵',
    getTitle: () => {
      const item = document.querySelector('.conversation-title, .gds-body-l');
      return item?.textContent?.trim() || document.title.replace(' - Gemini', '').trim();
    },
    getMessages: () => extractMessages([
      'message-content',
      '.query-text',
    ], 6),
  },
  'www.perplexity.ai': {
    name: 'Perplexity',
    icon: '⚫',
    getTitle: () => document.title.replace(' - Perplexity', '').trim(),
    getMessages: () => extractMessages(['.prose', '.whitespace-pre-wrap'], 4),
  },
  'default': {
    name: 'AI Session',
    icon: '🤖',
    getTitle: () => document.title.trim(),
    getMessages: () => extractMessages(['p', 'li', '.message', '.response'], 4),
  },
};

function getAdapter() {
  const host = location.hostname.replace('www.', '');
  return ADAPTERS[host] || ADAPTERS['default'];
}

function extractMessages(selectors, maxMessages = 6) {
  const messages = [];
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 10 && text.length < 800) messages.push(text);
    });
    if (messages.length >= maxMessages) break;
  }
  // Return last N messages (most recent context)
  return messages.slice(-maxMessages).join('\n\n');
}

// ── Badge — inject a small floating capture indicator ─────────────────────────
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
      backdrop-filter:blur(8px);
      transition:all .2s; opacity:0.85;
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
    // Tell the background to open the popup
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    // Also flash the badge
    const inner = _badge.querySelector('div');
    inner.style.borderColor = 'rgba(86,207,170,0.8)';
    inner.querySelector('span:last-child').textContent = 'Opening…';
    setTimeout(() => {
      inner.style.borderColor = 'rgba(124,107,255,0.4)';
      inner.querySelector('span:last-child').textContent = 'Capture';
    }, 1500);
  };
}

// ── Page context extraction (called by popup) ─────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_CONTEXT') {
    const adapter = getAdapter();
    const title = adapter.getTitle();
    const messages = adapter.getMessages();
    sendResponse({
      tool: adapter.name,
      icon: adapter.icon,
      title,
      messages,
      url: location.href,
    });
    return true;
  }
});

// Inject badge after page settles
setTimeout(injectBadge, 2000);
// Re-inject on SPA navigation
const _origPushState = history.pushState.bind(history);
history.pushState = (...args) => { _origPushState(...args); setTimeout(injectBadge, 1500); };
