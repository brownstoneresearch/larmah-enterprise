/**
 * LARMAH ENTERPRISE | assets/js/app.js (Unified)
 * - Reliable Supabase client initialization
 * - Global LARMAH namespace for WhatsApp, Auth, and DB logging
 * - Realtime Engine for live updates across all pages
 */

// 1. Configuration
window.SUPABASE_URL = "https://mskbumvopqnrhddfycfd.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

// 2. Client Initialization
function ensureSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase library missing. Ensure the CDN script loads before app.js.");
    return null;
  }

  window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return window.supabaseClient;
}
window.ensureSupabaseClient = ensureSupabaseClient;

// 3. Helper Functions
function __rand(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

// 4. Core Business Logic
window.LARMAH = {
  businessPhone: "2347063080605",
  user: null,
  session: null,
  __toastTimer: null,

  sb() { return ensureSupabaseClient(); },

  toast(msg, type = "info") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(this.__toastTimer);
    this.__toastTimer = setTimeout(() => (t.className = "toast"), 4000);
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
  },

  toggleMenu() {
    document.body.classList.toggle("nav-open");
    const overlay = document.getElementById("mobileNavOverlay");
    if (overlay) overlay.classList.toggle("active");
  },

  openWhatsApp(text) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const url = `${baseUrl}?phone=${this.businessPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  },

  buildRef(prefix = "WEB") {
    return `${prefix}-${__rand(8)}`;
  },

  buildMessage(header, fields = {}, ref = null) {
    const rid = ref || this.buildRef("WEB");
    let msg = `*LARMAH ENTERPRISE | ${String(header || "").toUpperCase()}*\n`;
    msg += `------------------------------\n`;
    for (const [k, v] of Object.entries(fields || {})) {
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        msg += `*${k}:* ${v}\n`;
      }
    }
    msg += `------------------------------\n`;
    msg += `_Sent via heylarmah.tech_\n`;
    msg += `_Ref: ${rid}_`;
    return msg;
  },

  async getSession() {
    const sb = this.sb();
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) console.warn("getSession:", error.message);
      this.session = data?.session || null;
      this.user = data?.session?.user || null;
      return this.session;
    } catch (e) {
      this.session = null;
      this.user = null;
      return null;
    }
  },

  async updateHeaderAuthUI() {
    const el = document.querySelector(".header-actions");
    if (!el) return;
    const session = await this.getSession();
    el.style.display = session ? "flex" : "none";
  },

  async signOut(redirect = "auth.html") {
    const sb = this.sb();
    if (sb) await sb.auth.signOut();
    this.user = null;
    this.session = null;
    if (redirect) window.location.href = redirect;
  },

  async logRequest(category, payload, status = "new") {
    const sb = this.sb();
    if (!sb) return;
    await this.getSession();
    if (!this.user?.id) return;

    try {
      const now = new Date().toISOString();
      const { error } = await sb.from("requests").insert([{
        category: category || "general",
        payload: payload || {},
        user_id: this.user.id,
        status: status || "new",
        created_at: now,
        updated_at: now
      }]);
      if (error) throw error;
    } catch (e) {
      console.warn("logRequest failed:", e?.message || e);
    }
  },

  async submitRequest({ header, category, fields, refPrefix = "WEB" }) {
    const ref = this.buildRef(refPrefix);
    const msg = this.buildMessage(header, fields || {}, ref);
    await this.logRequest(category || "general", { header, fields, ref }, "new");
    this.openWhatsApp(msg);
  },

  // 5. Realtime Engine
  realtime: {
    channels: new Map(),
    debounceTimers: new Map(),

    _sb() { return ensureSupabaseClient(); },

    debounce(key, fn, wait = 650) {
      const prev = this.debounceTimers.get(key);
      if (prev) clearTimeout(prev);
      const t = setTimeout(fn, wait);
      this.debounceTimers.set(key, t);
    },

    statusBadge(elId, status) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.innerHTML = status === "SUBSCRIBED" 
        ? `<i class="fa-solid fa-circle fa-beat"></i> Live updates enabled`
        : `<i class="fa-solid fa-circle"></i> Live: ${status}`;
    },

    unsubscribe(name) {
      const sb = this._sb();
      const ch = this.channels.get(name);
      if (sb && ch) {
        try { sb.removeChannel(ch); } catch {}
        this.channels.delete(name);
      }
    },

    subscribe(table, onChange, name, options = {}) {
      const sb = this._sb();
      if (!sb) return null;

      const schema = options.schema || "public";
      const events = options.events || "*";
      const debounceMs = options.debounceMs ?? 650;
      const channelName = name || `${schema}-${table}-default`;

      this.unsubscribe(channelName);

      const channel = sb.channel(channelName)
        .on("postgres_changes", { event: events, schema, table }, (payload) => {
          this.debounce(channelName, () => onChange(payload), debounceMs);
        })
        .subscribe((status) => {
          if (options.statusElId) this.statusBadge(options.statusElId, status);
        });

      this.channels.set(channelName, channel);
      return channel;
    }
  }
};

// 6. Global Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  ensureSupabaseClient();
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const overlay = document.getElementById("mobileNavOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) window.LARMAH.toggleMenu();
    });
  }
  window.LARMAH.updateHeaderAuthUI();
});
