# Pearl — Error Tracking & Telemetry Observatory

An interactive, production-ready Web Application demonstrating full **Pearl** error tracking, breadcrumbs, user profiling, and distributed telemetry.

---

## 🚀 Quick Start

### 1. Launch the Server
```bash
cd sentry-app
node server.js
```
Or via npm:
```bash
npm start
```

### 2. Open the Dashboard
Navigate to:
```
http://localhost:4000
```

---

## ⚡ Features & Capabilities

1. **Pearl DSN Configuration & Inspection**:
   - Pre-configured with a local inspection mode that lets you test error capture, view raw JSON payloads, and see breadcrumbs immediately without needing an active cloud account.
   - Enter your real Ingest DSN (`https://publicKey@o0.ingest.sentry.io/projectID`) to stream live errors and metrics straight into your dashboard.

2. **Pearl Error Simulator Lab**:
   - 💥 **Uncaught Crash**: Triggers an unhandled `window.onerror` runtime `TypeError`.
   - 🛑 **Handled Exception**: Tests `Pearl.captureException()` with custom tags (`payment_gateway: stripe`) and extra payloads.
   - ⚠️ **Pool Warning**: Sends warning-level messages (`captureMessage`).
   - 💀 **Fatal Outage**: Sends fatal severity events for critical service failures.
   - ⏳ **Unhandled Promise**: Tests async `Promise.reject()` capture.
   - 🌐 **Network API Error**: Captures failed HTTP fetch requests with attached breadcrumbs.

3. **User & Context Enrichment**:
   - `Pearl.setUser()`: Attach active user ID, email, username, and role to all subsequent crash reports.
   - `Pearl.setTag()`: Add queryable custom tags (e.g. `subscription_tier: enterprise`).

4. **Breadcrumbs & Tracing**:
   - `Pearl.addBreadcrumb()`: Record custom timeline events prior to crashes.
   - `Pearl.startSpan()`: Measure distributed APM transaction latency across mock database queries and API calls.
   - 💬 **User Feedback Dialog**: Demonstrates crash report feedback dialogs to gather user comments after errors.

5. **Live Telemetry Stream**:
   - Terminal displaying every intercepted Pearl event in real time.
   - Expand any event card to view the complete raw JSON event payload.

6. **Ready-to-Use Snippets**:
   - Auto-generated, copy-pasteable integration snippets for **HTML / CDN**, **React / Next.js**, **Node.js / Express**, and **Python (Flask / Django / FastAPI)**.
