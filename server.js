// ============================================================================
// VeloceExpress Local Development & Testing Server
// Zero-dependency Node.js HTTP Server with Real-Time SSE & REST Sync
// ============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// In-Memory & On-Disk Persistent State for Multi-Window & VPS Real-Time Sync
const DB_FILE = path.join(BASE_DIR, 'data_store.json');
let sharedDatabase = [];
let sharedLogs = [];
let sseClients = [];

function loadPersistedData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      sharedDatabase = Array.isArray(parsed.db) ? parsed.db : [];
      sharedLogs = Array.isArray(parsed.logs) ? parsed.logs : [];
      console.log(`📦 Datos cargados de disco: ${sharedDatabase.length} registros persistidos.`);
    }
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar datos previos:', err.message);
  }
}

function persistDataToDisk() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({ db: sharedDatabase, logs: sharedLogs }, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ Error guardando datos en disco:', err.message);
  }
}

loadPersistedData();

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

const server = http.createServer((req, res) => {
  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Real-Time SSE Stream Endpoint
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('retry: 1000\n\n');

    const clientId = Date.now() + Math.random();
    sseClients.push({ id: clientId, res });

    // Send initial snapshot
    res.write(`data: ${JSON.stringify({ type: 'SNAPSHOT', db: sharedDatabase, logs: sharedLogs })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
    return;
  }

  // 2. REST Sync Endpoint: GET (read) & POST (update)
  if (pathname === '/api/sync') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ db: sharedDatabase, logs: sharedLogs }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (payload.action === 'UPDATE_DB' && Array.isArray(payload.db)) {
            sharedDatabase = payload.db;
          }
          if (payload.action === 'UPDATE_LOGS' && Array.isArray(payload.logs)) {
            sharedLogs = payload.logs;
          }
          if (payload.action === 'LIVE_INPUT') {
            const rec = sharedDatabase.find((r) => r.id === payload.regId);
            if (rec) {
              rec.liveUserInput = payload.input;
              rec.updatedAt = new Date().toLocaleTimeString('es-MX', { hour12: false });
            }
          }
          if (payload.action === 'CLEAR_ALL') {
            sharedDatabase = [];
            sharedLogs = [];
          }

          // Save changes to disk for VPS persistence
          persistDataToDisk();

          // Broadcast change to all connected tabs
          broadcastSSE({
            type: 'UPDATE',
            action: payload.action,
            db: sharedDatabase,
            logs: sharedLogs,
            regId: payload.regId,
            input: payload.input
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: sharedDatabase.length }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // 3. Static File Serving
  let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security check: ensure path is within BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 VeloceExpress Server activo en: http://${HOST}:${PORT}`);
  console.log(`📱 Página Pública:  http://localhost:${PORT}/index.html`);
  console.log(`🛡️ Panel de Control: http://localhost:${PORT}/panel.html`);
  console.log(`======================================================\n`);
});
