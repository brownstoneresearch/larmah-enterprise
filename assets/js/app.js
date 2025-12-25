/**
 * LARMAH ENTERPRISE | app.js (Clean Start — header/footer preserved in HTML)
 * - Keeps Supabase library as window.supabase (CDN)
 * - Creates client as window.supabaseClient
 * - Exposes LARMAH globally for inline onclick handlers
 */

/* ---------------------------
   1) SUPABASE CONFIG
---------------------------- */
window.SUPABASE_URL = "https://mskbumvopqnrhddfycfd.supabase.co";
window.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

function ensureSupabaseClient() {
  // Supabase CDN exposes window.supabase (library)
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase library missing. Ensure CDN <script> loads before app.js");
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

/* ---------------------------
   2) LARMAH GLOBAL
---------------------------- */
window.LARMAH = {
  businessPhone: "2347063080605",
  user: null,

  sb() {
    return ensureSupabaseClient();
  },

  // UI Toast
  toast(msg, type = "info") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(this.__toastTimer);
    this.__toastTimer = setTimeout(() => (t.className = "toast"), 4000);
  },

  // Escape HTML for rendering
  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
  },

  // Mobile menu
  toggleMenu() {
    document.body.classList.toggle("nav-open");
    const overlay = document.getElementById("mobileNavOverlay");
    if (overlay) overlay.classList.toggle("active");
  },

  // WhatsApp
  openWhatsApp(text) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const url = `${baseUrl}?phone=${this.businessPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  },

  // Build WhatsApp message
  buildMessage(header, fields = {}) {
    const ref = `WEB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    let msg = `*LARMAH ENTERPRISE | ${String(header || "").toUpperCase()}*\n`;
    msg += `------------------------------\n`;
    for (const [k, v] of Object.entries(fields)) {
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        msg += `*${k}:* ${v}\n`;
      }
    }
    msg += `------------------------------\n`;
    msg += `_Sent via heylarmah.tech_\n`;
    msg += `_Ref: ${ref}_`;
    return msg;
  },

  // Auth session (for header dashboard button)
  async getSession() {
    const sb = this.sb();
    if (!sb) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) console.warn("getSession error:", error.message);
    this.user = data?.session?.user || null;
    return data?.session || null;
  },

  // Show/Hide header dashboard button safely
  async updateHeaderAuthUI() {
    const el = document.querySelector(".header-actions");
    if (!el) return;
    const session = await this.getSession();
    el.style.display = session ? "flex" : "none";
  },

  // Best-effort logging to Supabase "requests" table (optional)
  async logRequest(category, payload) {
    const sb = this.sb();
    if (!sb) return;
    // expects table: requests(category text, payload jsonb, created_at timestamp, user_id uuid nullable)
    try {
      await sb.from("requests").insert([
        {
          category: category || "general",
          payload: payload || {},
          user_id: this.user?.id || null,
          created_at: new Date().toISOString(),
          status: "new",
        },
      ]);
    } catch (e) {
      // silent fail (WhatsApp should still open)
      console.warn("Request logging failed:", e?.message || e);
    }
  },

  // One call: log request + open WhatsApp
  async submitRequest({ header, category, fields }) {
    const msg = this.buildMessage(header, fields);
    await this.logRequest(category, { header, fields, message: msg });
    this.openWhatsApp(msg);
  },

  /* -------- Optional gallery helpers (safe to keep) -------- */
  normalizeImageUrls(item) {
    const out = [];
    if (!item) return out;
    if (Array.isArray(item.image_urls)) out.push(...item.image_urls);
    if (Array.isArray(item.images)) out.push(...item.images);
    if (item.image_url) out.push(item.image_url);
    if (item.image) out.push(item.image);
    return out
      .map((u) => String(u || "").trim())
      .filter((u) => u && !/^javascript:/i.test(u));
  },
};

/* ---------------------------
   3) INIT
---------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  ensureSupabaseClient();

  // close menu when clicking outside sheet
  const overlay = document.getElementById("mobileNavOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) window.LARMAH.toggleMenu();
    });
  }

  // footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // header auth ui (dashboard button)
  window.LARMAH.updateHeaderAuthUI();
});
