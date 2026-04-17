/**
 * Storyboard Capture — Popup Logic
 */

// Projects — kept in sync with app.html PROJECT_META keys
const DEFAULT_PROJECTS = [
  'Storyboard',
  'PropertyOS',
  'New Build Homes',
  'Hansson Hertzell',
  'Opero Agency',
  'Curated Estate',
];

let _pageContext = null;
let _selectedType = 'session';
let _previewOpen = false;

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  loadProjects();
  checkServer();
  await loadPageContext();
}

function loadProjects() {
  // Load saved custom projects from storage, merge with defaults
  chrome.storage.local.get(['sb_projects'], result => {
    const saved = result.sb_projects || [];
    const all = [...new Set([...DEFAULT_PROJECTS, ...saved])];
    const sel = document.getElementById('projectSelect');
    // Restore last used project
    chrome.storage.local.get(['sb_last_project'], r => {
      all.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if (p === r.sb_last_project) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  });
}

function checkServer() {
  chrome.runtime.sendMessage({ type: 'CHECK_SERVER' }, response => {
    const dot = document.getElementById('serverDot');
    const label = document.getElementById('serverLabel');
    if (response?.ok) {
      dot.className = 'server-dot live';
      label.textContent = 'Server live';
    } else {
      dot.className = 'server-dot dead';
      label.textContent = 'Server offline';
      document.getElementById('captureBtn').disabled = true;
      document.getElementById('captureBtn').textContent = '⚠ Start mcp-server.js first';
    }
  });
}

async function loadPageContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' });
    if (!response) return;

    _pageContext = response;

    // Show source bar
    document.getElementById('sourceBar').style.display = 'flex';
    document.getElementById('sourceIcon').textContent = response.icon || '🤖';
    document.getElementById('sourceTool').textContent = response.tool || 'AI Tool';
    document.getElementById('sourceTitle').textContent = response.title || tab.title || 'Untitled';

    // Pre-fill title
    const titleInput = document.getElementById('titleInput');
    if (!titleInput.value && response.title) {
      titleInput.value = response.title.substring(0, 100);
    }

    // Fill preview
    const preview = document.getElementById('contextPreview');
    if (response.messages) {
      preview.textContent = response.messages.substring(0, 600) + (response.messages.length > 600 ? '…' : '');
    } else {
      preview.textContent = 'No conversation content detected on this page.';
    }
  } catch (err) {
    // Content script not injected (e.g. new tab, chrome:// pages)
    document.getElementById('contextPreview').textContent = 'Not an AI tool page — context unavailable.';
  }
}

// ── Type selection ─────────────────────────────────────────────────────────────
function selectType(el) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  _selectedType = el.dataset.type;

  // Update placeholder per type
  const placeholders = {
    session: 'What was this session about?',
    decision: 'What was decided? (e.g. "Use Sonnet for sprint, Opus for architecture")',
    idea: 'What\'s the idea? Keep it one punchy line.',
    feature: 'What feature or capability was built?',
  };
  document.getElementById('titleInput').placeholder = placeholders[_selectedType] || 'Title…';
}

// ── Preview toggle ─────────────────────────────────────────────────────────────
function togglePreview() {
  _previewOpen = !_previewOpen;
  document.getElementById('contextPreview').style.display = _previewOpen ? 'block' : 'none';
  document.getElementById('previewArrow').textContent = _previewOpen ? '▾' : '▸';
}

// ── Capture ───────────────────────────────────────────────────────────────────
async function doCapture() {
  const title = document.getElementById('titleInput').value.trim();
  const project = document.getElementById('projectSelect').value;
  const notes = document.getElementById('notesInput').value.trim();
  const includeContext = document.getElementById('includeContext').checked;

  if (!title) {
    document.getElementById('titleInput').focus();
    document.getElementById('titleInput').style.borderColor = '#f97316';
    setTimeout(() => { document.getElementById('titleInput').style.borderColor = ''; }, 1500);
    return;
  }
  if (!project) {
    document.getElementById('projectSelect').focus();
    document.getElementById('projectSelect').style.borderColor = '#f97316';
    setTimeout(() => { document.getElementById('projectSelect').style.borderColor = ''; }, 1500);
    return;
  }

  const btn = document.getElementById('captureBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Capturing…';

  const now = new Date();
  const ts = parseInt(`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`);

  const payload = {
    type: _selectedType,
    title,
    project,
    summary: notes || undefined,
    source: _pageContext?.tool || 'Browser',
    url: _pageContext?.url || undefined,
    context: (includeContext && _pageContext?.messages) ? _pageContext.messages.substring(0, 1000) : undefined,
    ts,
    date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    _captured: now.toISOString(),
  };

  chrome.runtime.sendMessage({ type: 'CAPTURE_BLOCK', payload }, response => {
    if (response?.ok) {
      // Save last used project
      chrome.storage.local.set({ sb_last_project: project });
      showSuccess(title, project);
    } else {
      showError(response?.error);
    }
  });
}

function showSuccess(title, project) {
  document.getElementById('mainForm').style.display = 'none';
  document.getElementById('sourceBar').style.display = 'none';
  const s = document.getElementById('successState');
  s.style.display = 'block';
  document.getElementById('successMsg').textContent = `${_selectedType === 'session' ? '🧠' : _selectedType === 'decision' ? '✓' : _selectedType === 'idea' ? '💡' : '🔧'} Captured!`;
  document.getElementById('successSub').textContent = `"${title.substring(0,50)}" added to ${project}.`;
}

function showError(err) {
  document.getElementById('mainForm').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
  const btn = document.getElementById('captureBtn');
  btn.disabled = false;
  btn.textContent = '⚡ Capture to Storyboard';
}

function resetForm() {
  document.getElementById('successState').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('mainForm').style.display = 'flex';
  if (_pageContext) document.getElementById('sourceBar').style.display = 'flex';
  document.getElementById('titleInput').value = '';
  document.getElementById('notesInput').value = '';
  checkServer();
}

// Start
document.addEventListener('DOMContentLoaded', init);
