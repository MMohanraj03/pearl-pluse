/**
 * Pearl — Web Application Integration & Telemetry Lab
 * Implements Pearl/Sentry SDK v8 initialization, error simulations, breadcrumbs, tags, and live tracing.
 */

// Default placeholder DSN (can be overridden by user in the UI)
const DEFAULT_DSN = 'https://7a8e52c8a14b4369a834279bdf91e3e5@o0.ingest.sentry.io/0';

class PearlApp {
  constructor() {
    this.dsn = localStorage.getItem('pearl_dsn') || DEFAULT_DSN;
    this.eventCount = 0;
    this.terminalEl = document.getElementById('terminal-events');
    this.eventCountEl = document.getElementById('stat-events-count');
    this.dsnInput = document.getElementById('dsn-input');
    this.toastEl = document.getElementById('pearl-toast');
    
    // Alias Sentry as Pearl on the global window object
    if (window.Sentry && !window.Pearl) {
      window.Pearl = window.Sentry;
    }

    this.initSDK();
    this.bindEvents();
    this.updateCodeSnippets();
  }

  showToast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add('visible');
    setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, 2800);
  }

  initSDK() {
    if (this.dsnInput) {
      this.dsnInput.value = this.dsn;
    }

    try {
      if (window.Sentry) {
        window.Sentry.init({
          dsn: this.dsn,
          environment: 'production',
          release: 'pearl@1.0.0',
          tracesSampleRate: 1.0,
          sendDefaultPii: true,
          beforeSend: (event, hint) => {
            this.logEventToTerminal(event, 'error');
            // If demo DSN (o0.ingest.sentry.io/0), return null to avoid unnecessary 403s on invalid dummy accounts
            if (this.dsn.includes('o0.ingest.sentry.io/0')) {
              return null;
            }
            return event;
          },
          beforeSendTransaction: (transaction) => {
            this.logEventToTerminal(transaction, 'transaction');
            if (this.dsn.includes('o0.ingest.sentry.io/0')) {
              return null;
            }
            return transaction;
          }
        });

        // Set initial default context
        window.Sentry.setTag('app_name', 'pearl');
        window.Sentry.setTag('app_version', '1.0.0');
        window.Sentry.setTag('telemetry_mode', 'observatory');
        window.Sentry.setUser({
          id: 'usr_8892',
          email: 'developer@example.com',
          username: 'pearl_dev',
          role: 'administrator'
        });

        // Expose Pearl alias
        window.Pearl = window.Sentry;

        console.log('[Pearl] SDK Initialized with DSN:', this.dsn);
      }
    } catch (err) {
      console.error('[Pearl] Initialization Error:', err);
    }
  }

  bindEvents() {
    // DSN Save
    document.getElementById('btn-save-dsn')?.addEventListener('click', () => {
      const val = this.dsnInput.value.trim();
      if (!val) {
        this.showToast('Please enter a valid DSN URL');
        return;
      }
      this.dsn = val;
      localStorage.setItem('pearl_dsn', val);
      this.initSDK();
      this.updateCodeSnippets();
      this.showToast('Pearl DSN Saved & Connected!');
    });

    // DSN Reset
    document.getElementById('btn-reset-dsn')?.addEventListener('click', () => {
      this.dsn = DEFAULT_DSN;
      localStorage.setItem('pearl_dsn', DEFAULT_DSN);
      if (this.dsnInput) this.dsnInput.value = DEFAULT_DSN;
      this.initSDK();
      this.updateCodeSnippets();
      this.showToast('Reset to Pearl Demo Mode');
    });

    // 1. Uncaught Error
    document.getElementById('btn-sim-uncaught')?.addEventListener('click', () => {
      this.showToast('Triggering Uncaught TypeError...');
      setTimeout(() => {
        // Deliberate uncaught TypeError
        const dummy = null;
        dummy.invokeUndefinedPearlFunction();
      }, 50);
    });

    // 2. Handled Exception
    document.getElementById('btn-sim-handled')?.addEventListener('click', () => {
      try {
        throw new Error('DatabaseConnectionTimeout: Pearl query exceeded 4500ms pool limit');
      } catch (err) {
        if (window.Sentry) {
          window.Sentry.captureException(err, {
            tags: { section: 'payment-gateway', retry_count: '3' },
            extra: { database_node: 'us-east-cluster-04', query_id: 'qry_99182' }
          });
          this.showToast('Handled Exception Captured by Pearl!');
        }
      }
    });

    // 3. Warning Message
    document.getElementById('btn-sim-warning')?.addEventListener('click', () => {
      if (window.Sentry) {
        window.Sentry.captureMessage('High Memory Consumption: Pearl Buffer utilization reached 89%', 'warning');
        this.showToast('Pearl Warning Message Dispatched!');
      }
    });

    // 4. Fatal Message
    document.getElementById('btn-sim-fatal')?.addEventListener('click', () => {
      if (window.Sentry) {
        window.Sentry.captureMessage('Critical Cluster Failure: All Pearl primary replica nodes unreachable', 'fatal');
        this.showToast('Pearl Fatal Alert Dispatched!');
      }
    });

    // 5. Unhandled Promise
    document.getElementById('btn-sim-promise')?.addEventListener('click', () => {
      this.showToast('Triggering Unhandled Promise Rejection...');
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('AsyncAuthFailure: Pearl token validation expired in background worker'));
        }, 100);
      });
    });

    // 6. Network Error
    document.getElementById('btn-sim-network')?.addEventListener('click', async () => {
      this.showToast('Simulating Failed Network Request...');
      try {
        if (window.Sentry) {
          window.Sentry.addBreadcrumb({
            category: 'network',
            message: 'Initiating fetch to https://api.pearl.local/v1/checkout',
            level: 'info'
          });
        }
        const res = await fetch('https://httpstat.us/500');
        if (!res.ok) {
          throw new Error(`Pearl Network Request failed with status: ${res.status} Internal Server Error`);
        }
      } catch (err) {
        if (window.Sentry) {
          window.Sentry.captureException(err, {
            tags: { endpoint: '/v1/checkout', method: 'POST' }
          });
        }
      }
    });

    // User Context
    document.getElementById('btn-apply-user')?.addEventListener('click', () => {
      const id = document.getElementById('user-id').value.trim();
      const email = document.getElementById('user-email').value.trim();
      const username = document.getElementById('user-name').value.trim();
      const role = document.getElementById('user-role').value.trim();

      if (window.Sentry) {
        window.Sentry.setUser({ id, email, username, role });
        this.showToast(`Pearl User Context Set: ${username} (${email})`);

        this.appendTerminalLog({
          type: 'USER CONTEXT',
          time: new Date().toLocaleTimeString(),
          message: `User context updated to [${username}] (ID: ${id})`,
          details: JSON.stringify({ id, email, username, role }, null, 2),
          badgeClass: 'cyan'
        });
      }
    });

    // Custom Tag
    document.getElementById('btn-apply-tag')?.addEventListener('click', () => {
      const key = document.getElementById('tag-key').value.trim();
      const val = document.getElementById('tag-val').value.trim();
      if (!key || !val) {
        this.showToast('Please enter both Tag Key and Value');
        return;
      }
      if (window.Sentry) {
        window.Sentry.setTag(key, val);
        this.showToast(`Pearl Tag Set: ${key} = ${val}`);

        this.appendTerminalLog({
          type: 'TAG SET',
          time: new Date().toLocaleTimeString(),
          message: `Custom Tag recorded: ${key} = ${val}`,
          details: `Global telemetry events will now carry tag "${key}"="${val}"`,
          badgeClass: 'info'
        });
      }
    });

    // Breadcrumb
    document.getElementById('btn-add-breadcrumb')?.addEventListener('click', () => {
      const category = document.getElementById('bc-category').value.trim() || 'ui.click';
      const message = document.getElementById('bc-message').value.trim() || 'User interaction recorded';

      if (window.Sentry) {
        window.Sentry.addBreadcrumb({
          category,
          message,
          level: 'info',
          timestamp: Date.now() / 1000
        });
        this.showToast('Pearl Breadcrumb Attached!');

        this.appendTerminalLog({
          type: 'BREADCRUMB',
          time: new Date().toLocaleTimeString(),
          message: `Breadcrumb [${category}]: ${message}`,
          details: 'Attached to subsequent error reports for root cause analysis.',
          badgeClass: 'warning'
        });
      }
    });

    // APM Tracing Span
    document.getElementById('btn-run-span')?.addEventListener('click', () => {
      this.showToast('Executing Pearl Distributed Tracing Span...');
      if (window.Sentry && typeof window.Sentry.startSpan === 'function') {
        window.Sentry.startSpan({
          name: 'Pearl Task: Process Data Pipeline',
          op: 'task.pipeline'
        }, (span) => {
          // Simulate latency
          setTimeout(() => {
            span.setAttribute('items_processed', 1420);
            span.setAttribute('cache_hit_rate', '94.2%');
            this.showToast('Pearl Tracing Span Finished (350ms)');
          }, 350);
        });
      } else {
        this.showToast('Tracing Span executed');
      }
    });

    // Crash Feedback Dialog
    document.getElementById('btn-show-feedback')?.addEventListener('click', () => {
      if (window.Sentry && typeof window.Sentry.showReportDialog === 'function') {
        window.Sentry.showReportDialog({
          eventId: 'pearl-dummy-event-id-' + Math.floor(Math.random() * 100000),
          title: 'Pearl Crash Feedback',
          subtitle: 'Our engineering team has been notified. Let us know what happened.',
          subtitle2: 'If you want to help, let us know what happened below.',
          labelComments: 'What were you doing when the issue occurred?'
        });
      } else {
        this.showToast('Crash report dialog triggered');
      }
    });

    // Clear Terminal
    document.getElementById('btn-clear-terminal')?.addEventListener('click', () => {
      if (this.terminalEl) {
        this.terminalEl.innerHTML = '';
        this.showToast('Terminal Cleared');
      }
    });

    // Code Snippet Tabs
    const tabs = document.querySelectorAll('.code-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderSnippet(tab.getAttribute('data-lang'));
      });
    });

    // Copy Code Button
    document.getElementById('btn-copy-snippet')?.addEventListener('click', () => {
      const codeEl = document.getElementById('snippet-code');
      if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          this.showToast('Code Snippet Copied to Clipboard!');
        });
      }
    });
  }

  logEventToTerminal(event, category) {
    this.eventCount++;
    if (this.eventCountEl) {
      this.eventCountEl.textContent = `${this.eventCount} Captured`;
    }

    const eventId = event.event_id || ('ev_' + Math.random().toString(36).substring(2, 9));
    const level = (event.level || (category === 'transaction' ? 'span' : 'error')).toUpperCase();
    const time = new Date().toLocaleTimeString();

    let title = 'Pearl Event Captured';
    let details = '';

    if (event.exception && event.exception.values && event.exception.values.length > 0) {
      const ex = event.exception.values[0];
      title = `${ex.type || 'Error'}: ${ex.value || 'Unknown Exception'}`;
      if (ex.stacktrace && ex.stacktrace.frames) {
        details = ex.stacktrace.frames
          .slice(-3)
          .map(f => `  at ${f.function || '?'} (${f.filename || 'unknown'}:${f.lineno || '?'})`)
          .join('\n');
      }
    } else if (event.message) {
      title = `Message: ${event.message}`;
      details = `Severity Level: ${event.level || 'info'}`;
    } else if (event.type === 'transaction') {
      title = `Transaction: ${event.transaction || 'Unnamed APM Transaction'}`;
      details = `Duration: ${event.timestamp && event.start_timestamp ? ((event.timestamp - event.start_timestamp) * 1000).toFixed(1) + 'ms' : 'active'}`;
    }

    let badgeClass = 'danger';
    if (level === 'WARNING') badgeClass = 'warning';
    if (level === 'SPAN' || category === 'transaction') badgeClass = 'success';
    if (level === 'INFO') badgeClass = 'info';

    this.appendTerminalLog({
      type: level,
      time: `${time} • ID: ${eventId.substring(0, 8)}`,
      message: title,
      details: details || JSON.stringify(event.tags || {}, null, 2),
      badgeClass
    });
  }

  appendTerminalLog({ type, time, message, details, badgeClass }) {
    if (!this.terminalEl) return;

    const card = document.createElement('div');
    card.className = `event-card ${badgeClass || 'info'}`;

    card.innerHTML = `
      <div class="event-card-header">
        <span class="event-tag ${badgeClass || 'info'}">${this.escapeHTML(type)}</span>
        <span class="event-time">${this.escapeHTML(time)}</span>
      </div>
      <div class="event-message">${this.escapeHTML(message)}</div>
      ${details ? `<div class="event-details">${this.escapeHTML(details)}</div>` : ''}
    `;

    this.terminalEl.insertBefore(card, this.terminalEl.firstChild);

    // Limit card count to keep DOM lean
    while (this.terminalEl.children.length > 50) {
      this.terminalEl.removeChild(this.terminalEl.lastChild);
    }
  }

  escapeHTML(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  updateCodeSnippets() {
    const activeTab = document.querySelector('.code-tab.active');
    const lang = activeTab ? activeTab.getAttribute('data-lang') : 'html';
    this.renderSnippet(lang);
  }

  renderSnippet(lang) {
    const codePre = document.getElementById('snippet-code');
    if (!codePre) return;

    const dsn = this.dsn;

    const snippets = {
      html: `<!-- 1. Include Pearl / Sentry SDK CDN Bundle -->
<script src="https://browser.sentry-cdn.com/8.55.0/bundle.tracing.min.js" crossorigin="anonymous"></script>

<!-- 2. Initialize Pearl SDK -->
<script>
  window.Pearl = window.Sentry;

  Pearl.init({
    dsn: "${dsn}",
    environment: "production",
    release: "pearl@1.0.0",
    tracesSampleRate: 1.0,
  });

  // Track User & Tags
  Pearl.setUser({ id: "usr_123", email: "user@example.com" });
  Pearl.setTag("tier", "enterprise");

  // Add Breadcrumb
  Pearl.addBreadcrumb({ category: "auth", message: "User logged in" });

  // Capture Exception
  try {
    throw new Error("Example Pearl Error");
  } catch (err) {
    Pearl.captureException(err);
  }
</script>`,

      react: `// 1. Install SDK: npm install @sentry/react
import React from "react";
import * as Pearl from "@sentry/react";

// 2. Initialize Pearl early in your entrypoint (index.tsx / main.tsx)
Pearl.init({
  dsn: "${dsn}",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [Pearl.browserTracingIntegration()],
});

// 3. Wrap root with ErrorBoundary
export default function App() {
  return (
    <Pearl.ErrorBoundary fallback={<p>An unexpected error occurred in Pearl.</p>}>
      <MainComponent />
    </Pearl.ErrorBoundary>
  );
}`,

      node: `// 1. Install SDK: npm install @sentry/node
const Pearl = require("@sentry/node");

// 2. Initialize Pearl before any require/import calls
Pearl.init({
  dsn: "${dsn}",
  environment: process.env.NODE_ENV || "production",
  tracesSampleRate: 1.0,
});

// Express.js Middleware Integration:
const express = require("express");
const app = express();

// Pearl request and error handlers
app.get("/api/test", (req, res) => {
  throw new Error("Pearl API Route Failure");
});

Pearl.setupExpressErrorHandler(app);

app.listen(3000, () => console.log("Server listening on port 3000"));`,

      python: `# 1. Install SDK: pip install sentry-sdk
import sentry_sdk as pearl

pearl.init(
    dsn="${dsn}",
    environment="production",
    traces_sample_rate=1.0,
    send_default_pii=True
)

# Set custom tags and user context
pearl.set_user({"id": "usr_991", "email": "dev@company.com"})
pearl.set_tag("service", "billing-worker")

try:
    1 / 0
except ZeroDivisionError as e:
    pearl.capture_exception(e)
`
    };

    codePre.textContent = snippets[lang] || snippets.html;
  }
}

// Instantiate Pearl Application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PearlApp();
});
