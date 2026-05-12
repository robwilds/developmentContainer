const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const COMPOSE_FILE = path.join(PROJECT_ROOT, 'docker-compose.yml');
const CONTAINER_NAME = 'dev';

function ensureDeps(cb) {
  const nodeModules = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModules)) return cb();
  console.log('Installing dependencies...');
  const child = spawn('npm', ['install', '--cache', '/tmp/npm-cache'], { cwd: __dirname, stdio: 'inherit' });
  child.on('close', code => {
    if (code === 0) { console.log('Dependencies installed.'); cb(); }
    else { console.error('npm install failed.'); process.exit(1); }
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  exec(`docker inspect -f '{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null || echo 'not_found'`, (err, stdout) => {
    let status = stdout ? stdout.toString().trim() : 'not_found';
    if (!status || status.includes('Error') || status.includes('{{')) status = 'not_found';
    res.json({ status });
  });
});

app.post('/api/docker/:action', (req, res) => {
  const { action } = req.params;
  const actions = { start: ['up', '-d'], stop: ['down'], restart: ['restart'] };
  if (!actions[action]) return res.status(400).json({ error: 'Invalid action' });

  const child = spawn('docker', ['compose', '-f', COMPOSE_FILE, ...actions[action]], { cwd: PROJECT_ROOT });
  let output = '';
  child.stdout.on('data', d => output += d.toString());
  child.stderr.on('data', d => output += d.toString());
  child.on('close', code => {
    if (code === 0) return res.json({ success: true, output });
    res.status(500).json({ error: output || `Command failed with code ${code}` });
  });
});

app.get('/api/browse', (req, res) => {
  const dirPath = req.query.path || '/';

  fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
    if (err) return res.status(400).json({ error: `Cannot read: ${err.message}` });

    const dirs = entries
      .filter(e => e.isDirectory())
      .map(e => ({ name: e.name, path: path.join(dirPath, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      current: dirPath,
      parent: dirPath === '/' ? null : path.dirname(dirPath),
      entries: dirs
    });
  });
});

function findVolumeLines(content) {
  const lines = content.split('\n');
  const volumeIndices = [];
  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'volumes:') {
      startIdx = i;
      for (let j = i + 1; j < lines.length; j++) {
        const indent = (lines[j].match(/^\s*/) || [''])[0].length;
        const trimmed = lines[j].trim();
        if (trimmed.startsWith('- ')) {
          volumeIndices.push(j);
        } else if (trimmed !== '' && !trimmed.startsWith('#') && indent <= 4) {
          endIdx = j;
          break;
        }
      }
      if (endIdx === -1) endIdx = lines.length;
      break;
    }
  }
  return { startIdx, endIdx, volumeIndices };
}

function runComposeUp() {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d'], { cwd: PROJECT_ROOT });
    let out = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => out += d.toString());
    child.on('close', code => {
      if (code === 0) resolve(out);
      else reject(new Error(out || `Exit code ${code}`));
    });
  });
}

app.get('/api/volumes', (req, res) => {
  try {
    const content = fs.readFileSync(COMPOSE_FILE, 'utf8');
    const { volumeIndices } = findVolumeLines(content);
    const lines = content.split('\n');
    const volumes = volumeIndices.map((li, i) => {
      const raw = lines[li].trim().replace(/^- /, '');
      const left = raw.split(':')[0];
      const isNamed = !left.includes('/') && !left.startsWith('.');
      return { index: i, raw, isNamed };
    });
    res.json({ volumes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/volumes', async (req, res) => {
  const { hostPath, containerPath } = req.body;
  if (!hostPath || !containerPath) return res.status(400).json({ error: 'hostPath and containerPath required' });

  const resolvedHost = hostPath.replace(/^~/, require('os').homedir());
  if (!fs.existsSync(resolvedHost)) return res.status(400).json({ error: `Path does not exist: ${hostPath}` });

  const backup = fs.readFileSync(COMPOSE_FILE, 'utf8');

  try {
    let content = fs.readFileSync(COMPOSE_FILE, 'utf8');
    const { volumeIndices, endIdx } = findVolumeLines(content);
    let lines = content.split('\n');

    const insertAt = volumeIndices.length > 0 ? volumeIndices[volumeIndices.length - 1] + 1 : (endIdx > 0 ? endIdx - 1 : lines.length);
    lines.splice(insertAt, 0, `      - ${resolvedHost}:${containerPath}`);
    fs.writeFileSync(COMPOSE_FILE, lines.join('\n'));

    await runComposeUp();
    res.json({ success: true });
  } catch (err) {
    fs.writeFileSync(COMPOSE_FILE, backup);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/volumes/remove', async (req, res) => {
  const { index } = req.body;
  if (index === undefined || index === null) return res.status(400).json({ error: 'index required' });

  const backup = fs.readFileSync(COMPOSE_FILE, 'utf8');

  try {
    let content = fs.readFileSync(COMPOSE_FILE, 'utf8');
    const { volumeIndices } = findVolumeLines(content);
    if (index < 0 || index >= volumeIndices.length) return res.status(400).json({ error: 'Invalid index' });

    let lines = content.split('\n');
    lines.splice(volumeIndices[index], 1);
    fs.writeFileSync(COMPOSE_FILE, lines.join('\n'));

    await runComposeUp();
    res.json({ success: true });
  } catch (err) {
    fs.writeFileSync(COMPOSE_FILE, backup);
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  socket.on('execute', ({ command }) => {
    if (!command || !command.trim()) return;

    const child = spawn('docker', [
      'exec', '-i', CONTAINER_NAME,
      'bash', '-c',
      `source /usr/local/nvm/nvm.sh 2>/dev/null; ${command}`
    ]);

    child.stdout.on('data', d => socket.emit('output', d.toString()));
    child.stderr.on('data', d => socket.emit('error-output', d.toString()));
    child.on('close', code => socket.emit('command-end', code));
    child.on('error', err => {
      socket.emit('error-output', `Failed: ${err.message}\n`);
      socket.emit('command-end', -1);
    });
  });
});

ensureDeps(() => {
  server.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });
});
