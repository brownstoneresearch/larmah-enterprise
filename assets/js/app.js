/**
 * LARMAH ENTERPRISE | assets/js/app.js (Updated)
 * - Creates window.supabaseClient
 * - Exposes window.LARMAH for inline onclick handlers
 * - Shows Dashboard button when logged in
 * - WhatsApp-first
 * - Best-effort request logging:
 *    - Only logs to DB when authenticated (matches requests RLS: user insert own)
 */

window.SUPABASE_URL = "https://mskbumvopqnrhddfycfd.supabase.co";
window.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

function ensureSupabaseClient() {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase library missing. Ensure the CDN script loads before app.js");
    return null;
  }
  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  }
  return window.supabaseClient;
}

window.LARMAH = {
  businessPhone: "2347063080605",
  user: null,
  session: null,

  sb() {
    return ensureSupabaseClient();
  },

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
    return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  },

  buildMessage(header, fields = {}, ref = null) {
    const rid = ref || this.buildRef("WEB");
    let msg = `*LARMAH ENTERPRISE | ${String(header || "").toUpperCase()}*\n`;
    msg += `------------------------------\n`;
    for (const [k, v] of Object.entries(fields)) {
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
    const { data, error } = await sb.auth.getSession();
    if (error) console.warn("getSession error:", error.message);
    this.session = data?.session || null;
    this.user = data?.session?.user || null;
    return this.session;
  },

  async updateHeaderAuthUI() {
    const el = document.querySelector(".header-actions");
    if (!el) return;
    const session = await this.getSession();
    el.style.display = session ? "flex" : "none";
  },

  async signOut(redirect = "auth.html") {
    const sb = this.sb();
    if (!sb) return;
    await sb.auth.signOut();
    this.user = null;
    this.session = null;
    if (redirect) window.location.href = redirect;
  },

  /**
   * Requests RLS: user insert own requires user_id = auth.uid()
   * So only log when authenticated.
   */
  async logRequest(category, payload, status = "new") {
    const sb = this.sb();
    if (!sb) return;

    await this.getSession();
    if (!this.user?.id) return; // required by RLS

    try {
      const row = {
        category: category || "general",
        payload: payload || {},
        user_id: this.user.id,
        status,
        created_at: new Date().toISOString(),
      };
      const { error } = await sb.from("requests").insert([row]);
      if (error) throw error;
    } catch (e) {
      console.warn("Request logging failed:", e?.message || e);
    }
  },

  async submitRequest({ header, category, fields, refPrefix = "WEB" }) {
    const ref = this.buildRef(refPrefix);
    const msg = this.buildMessage(header, fields || {}, ref);

    // best-effort log (auth only)
    await this.logRequest(category || "general", { header, fields, ref });

    // always open WhatsApp
    this.openWhatsApp(msg);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ensureSupabaseClient();

  // close menu when clicking overlay background
  const overlay = document.getElementById("mobileNavOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) window.LARMAH.toggleMenu();
    });
  }

  // footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // show dashboard button if logged in
  window.LARMAH.updateHeaderAuthUI();
});
