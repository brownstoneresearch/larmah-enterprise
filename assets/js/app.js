/**
 * LARMAH ENTERPRISE | assets/js/app.js (FULL - Admin workflow compatible)
 * - Creates window.supabaseClient reliably
 * - Exposes window.LARMAH globally for inline onclick handlers
 * - Shows Dashboard button when authenticated
 * - WhatsApp-first support + message builder
 * - Request logging ONLY when authenticated (matches requests RLS: user insert own)
 */

window.SUPABASE_URL = window.SUPABASE_URL || "https://mskbumvopqnrhddfycfd.supabase.co";
window.SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

function ensureSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase library missing. Ensure the CDN script loads before app.js.");
    return null;
  }

  window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return window.supabaseClient;
}

window.ensureSupabaseClient = window.ensureSupabaseClient || ensureSupabaseClient;

function __rand(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

window.LARMAH = window.LARMAH || {
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
      console.warn("getSession exception:", e);
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
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn("signOut:", e);
    }
    this.user = null;
    this.session = null;
    if (redirect) window.location.href = redirect;
  },

  /**
   * DB request logging (best-effort)
   * Requires auth session because requests RLS expects user_id = auth.uid()
   */
  async logRequest(category, payload, status = "new") {
    const sb = this.sb();
    if (!sb) return;

    await this.getSession();
    if (!this.user?.id) return;

    try {
      const now = new Date().toISOString();
      const row = {
        category: category || "general",
        payload: payload || {},
        user_id: this.user.id,
        status: status || "new",
        created_at: now,
        updated_at: now,
      };
      const { error } = await sb.from("requests").insert([row]);
      if (error) throw error;
    } catch (e) {
      // Silent fail: WhatsApp still opens
      console.warn("logRequest failed:", e?.message || e);
    }
  },

  /**
   * One-call helper for website forms:
   * - logs request if logged-in
   * - opens WhatsApp always
   */
  async submitRequest({ header, category, fields, refPrefix = "WEB" }) {
    const ref = this.buildRef(refPrefix);
    const msg = this.buildMessage(header, fields || {}, ref);

    await this.logRequest(category || "general", { header, fields, ref }, "new");
    this.openWhatsApp(msg);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ensureSupabaseClient();

  // Footer year convenience
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Close mobile menu when clicking overlay background
  const overlay = document.getElementById("mobileNavOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && window.LARMAH?.toggleMenu) window.LARMAH.toggleMenu();
    });
  }

  // Show dashboard button when logged in
  if (window.LARMAH?.updateHeaderAuthUI) window.LARMAH.updateHeaderAuthUI();
});
