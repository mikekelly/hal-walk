import { createServer } from 'http';
import { loadSession } from '../session.js';
import { Session } from '../types.js';

function buildHtml(session: Session): string {
  const sessionJson = JSON.stringify(session);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>hal-walk session viewer</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; display: flex; flex-direction: column; height: 100vh; }
  header { background: #16213e; padding: 12px 20px; border-bottom: 1px solid #0f3460; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 16px; font-weight: 600; color: #e94560; }
  header .meta { font-size: 13px; color: #8892b0; }
  .container { display: flex; flex: 1; overflow: hidden; }
  .graph-panel { flex: 1; overflow: auto; padding: 20px; display: flex; justify-content: center; }
  .graph-panel svg { max-width: 100%; height: auto; }
  .detail-panel { width: 420px; background: #16213e; border-left: 1px solid #0f3460; overflow-y: auto; display: flex; flex-direction: column; }
  .detail-panel.empty { justify-content: center; align-items: center; color: #8892b0; font-size: 14px; }
  .detail-header { padding: 14px 16px; border-bottom: 1px solid #0f3460; }
  .detail-header h2 { font-size: 14px; color: #e94560; margin-bottom: 4px; }
  .detail-header .subtitle { font-size: 12px; color: #8892b0; }
  .detail-section { padding: 12px 16px; border-bottom: 1px solid #0f3460; }
  .detail-section h3 { font-size: 12px; text-transform: uppercase; color: #8892b0; margin-bottom: 8px; letter-spacing: 0.5px; }
  .detail-section .note-text { font-size: 13px; color: #ccd6f6; font-style: italic; line-height: 1.4; }
  pre { background: #0a0a1a; border-radius: 6px; padding: 12px; font-size: 12px; line-height: 1.5; overflow-x: auto; color: #ccd6f6; white-space: pre-wrap; word-break: break-word; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-get { background: #1a3a2a; color: #4ade80; }
  .badge-post { background: #3a2a1a; color: #fbbf24; }
  .badge-put { background: #1a2a3a; color: #60a5fa; }
  .badge-delete { background: #3a1a1a; color: #f87171; }
  .badge-status { background: #1a1a3a; color: #a78bfa; }
  .kv { display: flex; gap: 8px; margin-bottom: 4px; font-size: 13px; }
  .kv .label { color: #8892b0; min-width: 80px; }
  .kv .value { color: #ccd6f6; }
  .node { cursor: pointer; }
  .edgePath { cursor: pointer; }
  .edgeLabel { cursor: pointer; }
</style>
</head>
<body>
<header>
  <h1>hal-walk</h1>
  <span class="meta" id="session-meta"></span>
</header>
<div class="container">
  <div class="graph-panel" id="graph"></div>
  <div class="detail-panel empty" id="detail">
    <span>Click a node or edge to inspect</span>
  </div>
</div>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

const session = ${sessionJson};

// Meta
document.getElementById('session-meta').textContent =
  'base: ' + session.entryPoint + '  ·  positions: ' + Object.keys(session.positions).length +
  '  ·  transitions: ' + session.transitions.length;

// Build mermaid graph
const lines = ['graph LR'];
for (const [id, pos] of Object.entries(session.positions)) {
  const urlPath = new URL(pos.url).pathname || '/';
  const label = urlPath + '\\n(' + id + ')';
  if (id === session.currentPosition) {
    lines.push('  ' + id + '["' + label + '"]:::current');
  } else {
    lines.push('  ' + id + '["' + label + '"]');
  }
}
for (const t of session.transitions) {
  const note = t.note ? '\\n' + truncate(t.note, 30) : '';
  const label = t.relation + '\\n' + t.method + note;
  lines.push('  ' + t.from + ' -->|"' + label + '"| ' + t.to);
}
lines.push('');
lines.push('  classDef current fill:#e94560,stroke:#fff,stroke-width:2px,color:#fff');

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '...' : s; }

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
const { svg } = await mermaid.render('mermaid-graph', lines.join('\\n'));
document.getElementById('graph').innerHTML = svg;

// Make nodes clickable
const svgEl = document.querySelector('#graph svg');
svgEl.querySelectorAll('.node').forEach(node => {
  node.addEventListener('click', () => {
    const id = node.id.replace(/^flowchart-/, '').replace(/-\\d+$/, '');
    showPosition(id);
  });
});

// Make edges clickable
svgEl.querySelectorAll('.edgePath, .edgeLabel').forEach((el, i) => {
  if (i < session.transitions.length) {
    el.addEventListener('click', () => showTransition(session.transitions[i]));
  }
});

function badge(method) {
  const cls = 'badge badge-' + method.toLowerCase();
  return '<span class="' + cls + '">' + method + '</span>';
}

function statusBadge(code) {
  return '<span class="badge badge-status">' + code + '</span>';
}

function jsonBlock(obj) {
  if (obj === undefined || obj === null) return '';
  return '<pre>' + escapeHtml(JSON.stringify(obj, null, 2)) + '</pre>';
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showPosition(id) {
  const pos = session.positions[id];
  if (!pos) return;
  const panel = document.getElementById('detail');
  panel.className = 'detail-panel';
  let html = '<div class="detail-header"><h2>Position ' + id + '</h2>' +
    '<div class="subtitle">' + badge(pos.method) + ' ' + statusBadge(pos.statusCode) + ' ' + pos.url + '</div></div>';
  html += '<div class="detail-section"><h3>Response</h3>' + jsonBlock(pos.response) + '</div>';
  panel.innerHTML = html;
}

function showTransition(t) {
  const panel = document.getElementById('detail');
  panel.className = 'detail-panel';
  let html = '<div class="detail-header"><h2>Transition ' + t.id + '</h2>' +
    '<div class="subtitle">' + badge(t.method) + ' ' + t.relation + ' (' + t.from + ' → ' + t.to + ')</div></div>';
  if (t.note) {
    html += '<div class="detail-section"><h3>Note</h3><div class="note-text">' + escapeHtml(t.note) + '</div></div>';
  }
  if (t.uriTemplateValues) {
    html += '<div class="detail-section"><h3>URI Template Values</h3>' + jsonBlock(t.uriTemplateValues) + '</div>';
  }
  if (t.bodySchema) {
    html += '<div class="detail-section"><h3>Body Schema</h3>' + jsonBlock(t.bodySchema) + '</div>';
  }
  if (t.body !== undefined) {
    html += '<div class="detail-section"><h3>Body</h3>' + jsonBlock(t.body) + '</div>';
  }
  if (t.headerSchema) {
    html += '<div class="detail-section"><h3>Header Schema</h3>' + jsonBlock(t.headerSchema) + '</div>';
  }
  if (t.headers) {
    html += '<div class="detail-section"><h3>Headers</h3>' + jsonBlock(t.headers) + '</div>';
  }
  panel.innerHTML = html;
}
</script>
</body>
</html>`;
}

export function sessionViewerCommand(
  sessionFile: string,
): void {
  const session = loadSession(sessionFile);
  const html = buildHtml(session);

  const server = createServer((req, res) => {
    if (req.url === '/api/session') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session, null, 2));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });

  server.listen(0, () => {
    const addr = server.address();
    if (addr && typeof addr === 'object') {
      console.error(`Session viewer running at http://localhost:${addr.port}`);
      console.error('Press Ctrl+C to stop');
    }
  });
}
