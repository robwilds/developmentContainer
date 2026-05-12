const socket = io();

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('btn-start');
const stopBtn = document.getElementById('btn-stop');
const restartBtn = document.getElementById('btn-restart');
const terminalBody = document.getElementById('terminal-body');
const cmdInput = document.getElementById('cmd-input');
const quickBtns = document.querySelectorAll('.quick-btn');
const volumeList = document.getElementById('volume-list');
const btnAddVolume = document.getElementById('btn-add-volume');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const formBody = document.getElementById('modal-body-form');
const browserBody = document.getElementById('modal-body-browser');
const hostPath = document.getElementById('host-path');
const containerPath = document.getElementById('container-path');
const btnBrowse = document.getElementById('btn-browse');
const btnCancelVolume = document.getElementById('btn-cancel-volume');
const btnMount = document.getElementById('btn-mount');
const browserCurrent = document.getElementById('browser-current');
const browserList = document.getElementById('browser-list');
const btnBrowserBack = document.getElementById('btn-browser-back');
const btnSelectDir = document.getElementById('btn-select-dir');

let commandHistory = [];
let historyIndex = -1;
let buf = '';
let containerStatus = 'not_found';
let browsePath = '/';
let autoScroll = true;

function isNearBottom() {
  return terminalBody.scrollHeight - terminalBody.scrollTop - terminalBody.clientHeight < 40;
}

function scrollToBottom() {
  terminalBody.scrollTop = terminalBody.scrollHeight;
  autoScroll = true;
}

const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

terminalBody.addEventListener('scroll', () => {
  autoScroll = isNearBottom();
  scrollBottomBtn.classList.toggle('visible', !autoScroll);
});

scrollBottomBtn.addEventListener('click', scrollToBottom);

function setStatus(status) {
  containerStatus = status;
  statusDot.className = 'status-dot ' + status;
  const labels = { running: 'Running', stopped: 'Exited', not_found: 'Not Found' };
  statusText.textContent = labels[status] || status;
  startBtn.disabled = status === 'running';
  stopBtn.disabled = status !== 'running';
  restartBtn.disabled = status !== 'running';
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    setStatus(data.status);
  } catch { setStatus('not_found'); }
}

async function dockerAction(action) {
  try {
    const res = await fetch(`/api/docker/${action}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      appendLine('system', `$ docker compose ${action} — completed`);
      showToast(`${action} successful`, 'success');
    } else {
      appendLine('error', `Error: ${data.error}`);
      showToast(`${action} failed`, 'error');
    }
    setTimeout(fetchStatus, 2000);
  } catch (err) {
    appendLine('error', `Error: ${err.message}`);
    showToast(`${action} failed`, 'error');
  }
}

function appendLine(type, text) {
  const div = document.createElement('div');
  div.className = 'line ' + type;
  div.textContent = text;
  terminalBody.appendChild(div);
  if (autoScroll) terminalBody.scrollTop = terminalBody.scrollHeight;
}

function executeCommand(cmd) {
  if (!cmd.trim()) return;
  appendLine('prompt', `$ ${cmd}`);
  cmdInput.value = '';
  commandHistory.push(cmd);
  historyIndex = commandHistory.length;
  buf = '';

  if (containerStatus !== 'running') {
    appendLine('error', 'Container is not running. Click Start first.');
    appendLine('system', '— exited with code 1');
    return;
  }

  socket.emit('execute', { command: cmd });
}

socket.on('output', (data) => {
  buf = (buf || '') + data;
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) appendLine('output', line);
});

socket.on('error-output', (data) => {
  buf = (buf || '') + data;
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) appendLine('error', line);
});

socket.on('command-end', (code) => {
  if (buf) { appendLine('output', buf); buf = ''; }
  appendLine('system', `— exited with code ${code}`);
});

startBtn.addEventListener('click', () => dockerAction('start'));
stopBtn.addEventListener('click', () => dockerAction('stop'));
restartBtn.addEventListener('click', () => dockerAction('restart'));

cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    executeCommand(cmdInput.value);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      cmdInput.value = commandHistory[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      cmdInput.value = commandHistory[historyIndex];
    } else {
      historyIndex = commandHistory.length;
      cmdInput.value = '';
    }
  }
});

quickBtns.forEach(btn => {
  btn.addEventListener('click', () => executeCommand(btn.dataset.cmd));
});

function showToast(msg, type) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast show ' + (type || '');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Volume Management ---

async function loadVolumes() {
  try {
    const res = await fetch('/api/volumes');
    const data = await res.json();
    if (data.error) { volumeList.innerHTML = `<div class="volume-empty">Error: ${data.error}</div>`; return; }
    renderVolumes(data.volumes);
  } catch (err) {
    volumeList.innerHTML = `<div class="volume-empty">Error: ${err.message}</div>`;
  }
}

function renderVolumes(volumes) {
  if (!volumes || volumes.length === 0) {
    volumeList.innerHTML = '<div class="volume-empty">No custom volumes configured.</div>';
    return;
  }

  volumeList.innerHTML = volumes.map((v, i) => {
    const parts = v.raw.split(':');
    const host = parts[0] || '';
    const container = parts.slice(1).join(':') || '';
    const badge = v.isNamed ? 'named' : 'bind';
    const canDelete = !v.isNamed;
    return `<div class="volume-item">
      <div style="display:flex;align-items:center;flex-wrap:wrap;">
        <span class="vol-host">${escHtml(host)}</span>
        <span class="vol-arrow">&rarr;</span>
        <span class="vol-container">${escHtml(container)}</span>
        <span class="vol-badge">${badge}</span>
      </div>
      <div class="vol-actions">
        ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="removeVolume(${i})">Remove</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function removeVolume(index) {
  try {
    const res = await fetch('/api/volumes/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Volume removed. Container restarted.', 'success');
      loadVolumes();
      setTimeout(fetchStatus, 2000);
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// --- Modal ---

btnAddVolume.addEventListener('click', () => {
  hostPath.value = '';
  containerPath.value = '/';
  formBody.style.display = 'block';
  browserBody.style.display = 'none';
  modalOverlay.classList.add('open');
  setTimeout(() => hostPath.focus(), 100);
});

modalClose.addEventListener('click', () => modalOverlay.classList.remove('open'));
btnCancelVolume.addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});

btnMount.addEventListener('click', async () => {
  const hp = hostPath.value.trim();
  const cp = containerPath.value.trim();
  if (!hp || !cp) { showToast('Both paths are required', 'error'); return; }

  btnMount.disabled = true;
  btnMount.textContent = 'Restarting...';

  try {
    const res = await fetch('/api/volumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPath: hp, containerPath: cp })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Volume mounted. Container restarted.', 'success');
      modalOverlay.classList.remove('open');
      loadVolumes();
      setTimeout(fetchStatus, 2000);
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btnMount.disabled = false;
    btnMount.textContent = 'Mount & Restart';
  }
});

// --- Directory Browser ---

btnBrowse.addEventListener('click', () => {
  browsePath = hostPath.value.trim() || '/';
  formBody.style.display = 'none';
  browserBody.style.display = 'block';
  loadBrowser(browsePath);
});

btnBrowserBack.addEventListener('click', () => {
  formBody.style.display = 'block';
  browserBody.style.display = 'none';
});

btnSelectDir.addEventListener('click', () => {
  hostPath.value = browsePath;
  formBody.style.display = 'block';
  browserBody.style.display = 'none';
});

async function loadBrowser(dir) {
  browserCurrent.textContent = dir;
  browserList.innerHTML = '<div class="browser-entry" style="justify-content:center;color:#484f58;">Loading...</div>';

  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(dir)}`);
    const data = await res.json();

    if (data.error) {
      browserList.innerHTML = `<div class="browser-entry" style="justify-content:center;color:#f85149;">${escHtml(data.error)}</div>`;
      return;
    }

    let html = '';
    if (data.parent !== null) {
      html += `<div class="browser-entry" data-path="${escHtml(data.parent)}">
        <span class="icon">&#x1F7E4;</span>
        <span class="name" style="color:#8b949e;">.. (parent)</span>
      </div>`;
    }
    data.entries.forEach(e => {
      html += `<div class="browser-entry" data-path="${escHtml(e.path)}">
        <span class="icon">&#x1F4C1;</span>
        <span class="name">${escHtml(e.name)}</span>
      </div>`;
    });
    browserList.innerHTML = html;

    browserList.querySelectorAll('.browser-entry').forEach(el => {
      el.addEventListener('click', () => {
        const p = el.dataset.path;
        if (p) { browsePath = p; loadBrowser(p); }
      });
    });
  } catch (err) {
    browserList.innerHTML = `<div class="browser-entry" style="justify-content:center;color:#f85149;">Error: ${escHtml(err.message)}</div>`;
  }
}

loadVolumes();
fetchStatus();
setInterval(fetchStatus, 10000);
