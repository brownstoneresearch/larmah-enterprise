/**
 * LARMAH ENTERPRISE | assets/js/app.js (UPGRADED — FULL)
 * ✅ Supabase client singleton (window.supabaseClient + LARMAH.supabase)
 * ✅ WhatsApp builder + request logging
 * ✅ Auth UI helper
 * ✅ Realtime subscribe/unsubscribe (filter/match supported)
 * ✅ Edge function helper (for RSS sync)
 */

(() => {
  "use strict";

  window.SUPABASE_URL =
    window.SUPABASE_URL || "https://mskbumvopqnrhddfycfd.supabase.co";

  window.SUPABASE_ANON_KEY =
    window.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

  const now = () => Date.now();
  const rand = (len = 10) => Math.random().toString(36).slice(2, 2 + len).toUpperCase();

  function ensureSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase library missing. Ensure the CDN script loads before app.js.");
      return null;
    }

    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    return window.supabaseClient;
  }

  window.ensureSupabaseClient = window.ensureSupabaseClient || ensureSupabaseClient;

  const LARMAH = (window.LARMAH = window.LARMAH || {});
  LARMAH.businessPhone = LARMAH.businessPhone || "2347063080605";

  // Compatibility: some pages check LARMAH.supabase
  Object.defineProperty(LARMAH, "supabase", {
    get() { return ensureSupabaseClient(); }
  });

  LARMAH.user = LARMAH.user || null;
  LARMAH.session = LARMAH.session || null;

  LARMAH.__toastTimer = LARMAH.__toastTimer || null;
  LARMAH.__sessionCacheTs = LARMAH.__sessionCacheTs || 0;
  LARMAH.__sessionCacheTtlMs = LARMAH.__sessionCacheTtlMs || 12000;

  LARMAH.sb = function () { return ensureSupabaseClient(); };

  LARMAH.escapeHtml = function (str) {
    if (str === null || str === undefined) return "";
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
  };

  LARMAH.toast = function (msg, type = "info") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = String(msg || "");
    t.className = `toast show ${type}`;
    clearTimeout(LARMAH.__toastTimer);
    LARMAH.__toastTimer = setTimeout(() => (t.className = "toast"), 4000);
  };

  LARMAH.toggleMenu = function (forceOpen = null) {
    const isOpen = document.body.classList.contains("nav-open");
    const next = forceOpen === null ? !isOpen : !!forceOpen;

    document.body.classList.toggle("nav-open", next);
    const overlay = document.getElementById("mobileNavOverlay");
    if (overlay) overlay.classList.toggle("active", next);
    if (overlay) overlay.setAttribute("aria-hidden", next ? "false" : "true");
  };

  LARMAH.openWhatsApp = function (text) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const url = `${baseUrl}?phone=${encodeURIComponent(LARMAH.businessPhone)}&text=${encodeURIComponent(String(text || ""))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  LARMAH.buildRef = function (prefix = "WEB") {
    return `${String(prefix || "WEB").toUpperCase()}-${rand(8)}`;
  };

  LARMAH.buildMessage = function (header, fields = {}, ref = null) {
    const rid = ref || LARMAH.buildRef("WEB");
    let msg = `*LARMAH ENTERPRISE | ${String(header || "").toUpperCase()}*\n`;
    msg += `------------------------------\n`;
    for (const [k, v] of Object.entries(fields || {})) {
      const val = String(v ?? "").trim();
      if (val) msg += `*${k}:* ${val}\n`;
    }
    msg += `------------------------------\n`;
    msg += `_Sent via heylarmah.tech_\n`;
    msg += `_Ref: ${rid}_`;
    return msg;
  };

  // ---------- AUTH ----------
  LARMAH.getSession = async function ({ force = false } = {}) {
    const sb = LARMAH.sb();
    if (!sb) return null;

    if (!force && LARMAH.__sessionCacheTs && (now() - LARMAH.__sessionCacheTs) < LARMAH.__sessionCacheTtlMs) {
      return LARMAH.session;
    }

    try {
      const { data, error } = await sb.auth.getSession();
      if (error) console.warn("getSession:", error.message);
      LARMAH.session = data?.session || null;
      LARMAH.user = data?.session?.user || null;
      LARMAH.__sessionCacheTs = now();
      return LARMAH.session;
    } catch (e) {
      console.warn("getSession exception:", e);
      LARMAH.session = null;
      LARMAH.user = null;
      LARMAH.__sessionCacheTs = now();
      return null;
    }
  };

  LARMAH.updateHeaderAuthUI = async function () {
    const el = document.querySelector(".header-actions");
    if (!el) return;
    const session = await LARMAH.getSession();
    el.style.display = session ? "flex" : "none";
  };

  // ---------- REQUEST LOGGING ----------
  LARMAH.logRequest = async function (category, payload, status = "new") {
    const sb = LARMAH.sb();
    if (!sb) return;

    await LARMAH.getSession();
    if (!LARMAH.user?.id) return;

    try {
      const { error } = await sb.from("requests").insert([{
        category: category || "general",
        payload: payload || {},
        user_id: LARMAH.user.id,
        status: status || "new",
      }]);
      if (error) throw error;
    } catch (e) {
      console.warn("logRequest failed:", e?.message || e);
    }
  };

  LARMAH.submitRequest = async function ({ header, category, fields, refPrefix = "WEB" }) {
    const ref = LARMAH.buildRef(refPrefix);
    const msg = LARMAH.buildMessage(header, fields || {}, ref);
    await LARMAH.logRequest(category || "general", { header, fields, ref }, "new");
    LARMAH.openWhatsApp(msg);
  };

  // ---------- EDGE FUNCTIONS ----------
  LARMAH.callFn = async function (fnName, body = {}, { method = "POST" } = {}) {
    const sb = LARMAH.sb();
    if (!sb) throw new Error("Supabase not ready");
    const { data, error } = await sb.functions.invoke(fnName, { body, method });
    if (error) throw error;
    return data;
  };

  // ---------- REALTIME ----------
  LARMAH.realtime = LARMAH.realtime || {};
  LARMAH.realtime.channels = LARMAH.realtime.channels || new Map();
  LARMAH.realtime.debounceTimers = LARMAH.realtime.debounceTimers || new Map();

  LARMAH.realtime._sb = function () { return ensureSupabaseClient(); };

  LARMAH.realtime.debounce = function (key, fn, wait = 650) {
    const prev = LARMAH.realtime.debounceTimers.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(fn, wait);
    LARMAH.realtime.debounceTimers.set(key, t);
  };

  LARMAH.realtime.statusBadge = function (elId, status) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (status === "SUBSCRIBED") el.innerHTML = `<i class="fa-solid fa-circle fa-beat"></i> Live updates enabled`;
    else el.innerHTML = `<i class="fa-solid fa-circle"></i> Live: ${LARMAH.escapeHtml(status)}`;
  };

  LARMAH.realtime.unsubscribe = function (name) {
    const sb = LARMAH.realtime._sb();
    const ch = LARMAH.realtime.channels.get(name);
    if (!sb || !ch) return;
    try { sb.removeChannel(ch); } catch {}
    LARMAH.realtime.channels.delete(name);
  };

  LARMAH.realtime.unsubscribeAll = function () {
    const sb = LARMAH.realtime._sb();
    if (!sb) return;
    for (const [name, ch] of LARMAH.realtime.channels.entries()) {
      try { sb.removeChannel(ch); } catch {}
      LARMAH.realtime.channels.delete(name);
    }
  };

  /**
   * subscribe(table, onChange, name, options)
   * options: { schema, events, debounceMs, statusElId, filter, match }
   */
  LARMAH.realtime.subscribe = function (table, onChange, name, options = {}) {
    const sb = LARMAH.realtime._sb();
    if (!sb) return null;

    const schema = options.schema || "public";
    const events = options.events || "*";
    const debounceMs = typeof options.debounceMs === "number" ? options.debounceMs : 650;
    if (!name) name = `${schema}-${table}-default`;

    LARMAH.realtime.unsubscribe(name);

    const params = { event: events, schema, table };

    if (options.filter && typeof options.filter === "string") {
      params.filter = options.filter;
    } else if (options.match && typeof options.match === "object") {
      const parts = Object.entries(options.match)
        .filter(([k, v]) => k && v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `${k}=eq.${String(v).replace(/,/g, "\\,")}`);
      if (parts.length) params.filter = parts.join(",");
    }

    const channel = sb
      .channel(name)
      .on("postgres_changes", params, (payload) => {
        LARMAH.realtime.debounce(name, () => {
          try { onChange(payload); } catch (e) { console.warn("realtime onChange error:", e); }
        }, debounceMs);
      })
      .subscribe((status) => {
        if (options.statusElId) LARMAH.realtime.statusBadge(options.statusElId, status);
      });

    LARMAH.realtime.channels.set(name, channel);
    return channel;
  };

  // ---------- BOOT ----------
  document.addEventListener("DOMContentLoaded", () => {
    ensureSupabaseClient();

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const overlay = document.getElementById("mobileNavOverlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) LARMAH.toggleMenu(false);
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const isOpen = document.body.classList.contains("nav-open");
        if (isOpen) LARMAH.toggleMenu(false);
      }
    });

    if (typeof LARMAH.updateHeaderAuthUI === "function") LARMAH.updateHeaderAuthUI();
  });
})();
