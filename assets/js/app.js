/**
 * LARMAH ENTERPRISE | assets/js/app.js (UPGRADED — FULL)
 * Works seamlessly with: index.html, real-estate.html, logistics.html, insights.html, exchange.html
 *
 * ✅ Guarantees a single Supabase client instance
 * ✅ Exposes window.LARMAH globally for inline onclick handlers
 * ✅ WhatsApp-first support + message builder + safe escaping
 * ✅ Header auth UI helper (shows dashboard pill when logged in)
 * ✅ Request logging when authenticated (best-effort)
 * ✅ Robust realtime engine:
 *    - subscribe(table, onChange, name, { debounceMs, statusElId, schema, events, filter, match })
 *    - unsubscribe(name), unsubscribeAll()
 * ✅ Safer nav overlay close + ESC key close
 * ✅ Session cache + auth state updates
 */

(() => {
  "use strict";

  // ---------- CONFIG ----------
  window.SUPABASE_URL =
    window.SUPABASE_URL || "https://mskbumvopqnrhddfycfd.supabase.co";

  window.SUPABASE_ANON_KEY =
    window.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

  // ---------- HELPERS ----------
  const __now = () => Date.now();

  const __rand = (len = 10) =>
    Math.random().toString(36).slice(2, 2 + len).toUpperCase();

  const __safeStr = (v) => (v === null || v === undefined ? "" : String(v));

  const __escapeHtml = (str) => {
    if (str === null || str === undefined) return "";
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
  };

  const __isMobileUA = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const __open = (url) => window.open(url, "_blank", "noopener,noreferrer");

  // ---------- SUPABASE SINGLETON ----------
  function ensureSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error(
        "Supabase library missing. Ensure <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script> loads before app.js."
      );
      return null;
    }

    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    return window.supabaseClient;
  }

  window.ensureSupabaseClient = window.ensureSupabaseClient || ensureSupabaseClient;

  // ---------- GLOBAL LARMAH ----------
  const LARMAH = (window.LARMAH = window.LARMAH || {});

  // Core state
  LARMAH.businessPhone = LARMAH.businessPhone || "2347063080605";
  LARMAH.user = LARMAH.user || null;
  LARMAH.session = LARMAH.session || null;
  LARMAH.__toastTimer = LARMAH.__toastTimer || null;
  LARMAH.__sessionCacheTs = LARMAH.__sessionCacheTs || 0;
  LARMAH.__sessionCacheTtlMs = LARMAH.__sessionCacheTtlMs || 12_000; // avoid spamming getSession

  // Supabase accessor (used by pages)
  LARMAH.sb = function sb() {
    return ensureSupabaseClient();
  };

  // Escape (used by templates)
  LARMAH.escapeHtml = LARMAH.escapeHtml || __escapeHtml;

  // Toast
  LARMAH.toast = function toast(msg, type = "info") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = __safeStr(msg);
    t.className = `toast show ${type}`;
    clearTimeout(LARMAH.__toastTimer);
    LARMAH.__toastTimer = setTimeout(() => (t.className = "toast"), 4000);
  };

  // Mobile menu
  LARMAH.toggleMenu = function toggleMenu(forceOpen = null) {
    const isOpen = document.body.classList.contains("nav-open");
    const next = forceOpen === null ? !isOpen : !!forceOpen;

    document.body.classList.toggle("nav-open", next);
    const overlay = document.getElementById("mobileNavOverlay");
    if (overlay) overlay.classList.toggle("active", next);

    // a11y marker
    if (overlay) overlay.setAttribute("aria-hidden", next ? "false" : "true");
  };

  // WhatsApp
  LARMAH.openWhatsApp = function openWhatsApp(text) {
    const baseUrl = __isMobileUA()
      ? "https://api.whatsapp.com/send"
      : "https://web.whatsapp.com/send";

    const url = `${baseUrl}?phone=${encodeURIComponent(LARMAH.businessPhone)}&text=${encodeURIComponent(
      __safeStr(text)
    )}`;

    __open(url);
  };

  // Reference builder
  LARMAH.buildRef = function buildRef(prefix = "WEB") {
    return `${__safeStr(prefix).toUpperCase()}-${__rand(8)}`;
  };

  // WhatsApp message builder (uniform across pages)
  LARMAH.buildMessage = function buildMessage(header, fields = {}, ref = null) {
    const rid = ref || LARMAH.buildRef("WEB");
    let msg = `*LARMAH ENTERPRISE | ${__safeStr(header).toUpperCase()}*\n`;
    msg += `------------------------------\n`;

    for (const [k, v] of Object.entries(fields || {})) {
      const val = __safeStr(v).trim();
      if (val) msg += `*${k}:* ${val}\n`;
    }

    msg += `------------------------------\n`;
    msg += `_Sent via heylarmah.tech_\n`;
    msg += `_Ref: ${rid}_`;
    return msg;
  };

  // ---------- AUTH ----------
  LARMAH.getSession = async function getSession({ force = false } = {}) {
    const sb = LARMAH.sb();
    if (!sb) return null;

    // cache
    if (!force && LARMAH.__sessionCacheTs && (__now() - LARMAH.__sessionCacheTs) < LARMAH.__sessionCacheTtlMs) {
      return LARMAH.session;
    }

    try {
      const { data, error } = await sb.auth.getSession();
      if (error) console.warn("getSession:", error.message);

      LARMAH.session = data?.session || null;
      LARMAH.user = data?.session?.user || null;
      LARMAH.__sessionCacheTs = __now();

      return LARMAH.session;
    } catch (e) {
      console.warn("getSession exception:", e);
      LARMAH.session = null;
      LARMAH.user = null;
      LARMAH.__sessionCacheTs = __now();
      return null;
    }
  };

  LARMAH.updateHeaderAuthUI = async function updateHeaderAuthUI() {
    const el = document.querySelector(".header-actions");
    if (!el) return;
    const session = await LARMAH.getSession();
    el.style.display = session ? "flex" : "none";
  };

  LARMAH.signOut = async function signOut(redirect = "auth.html") {
    const sb = LARMAH.sb();
    if (!sb) return;

    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn("signOut:", e);
    }

    LARMAH.user = null;
    LARMAH.session = null;
    LARMAH.__sessionCacheTs = __now();

    // stop realtime when signing out (optional safety)
    if (LARMAH.realtime) LARMAH.realtime.unsubscribeAll();

    if (redirect) window.location.href = redirect;
  };

  // Keep LARMAH.user/session fresh when auth state changes
  function initAuthListener() {
    const sb = LARMAH.sb();
    if (!sb || !sb.auth || typeof sb.auth.onAuthStateChange !== "function") return;

    sb.auth.onAuthStateChange((_event, session) => {
      LARMAH.session = session || null;
      LARMAH.user = session?.user || null;
      LARMAH.__sessionCacheTs = __now();

      // update header instantly
      if (typeof LARMAH.updateHeaderAuthUI === "function") {
        try { LARMAH.updateHeaderAuthUI(); } catch {}
      }
    });
  }

  // ---------- REQUEST LOGGING ----------
  /**
   * DB request logging (best-effort)
   * Requires auth session because requests RLS expects user_id = auth.uid()
   */
  LARMAH.logRequest = async function logRequest(category, payload, status = "new") {
    const sb = LARMAH.sb();
    if (!sb) return;

    await LARMAH.getSession();
    if (!LARMAH.user?.id) return;

    try {
      const { error } = await sb.from("requests").insert([
        {
          category: category || "general",
          payload: payload || {},
          user_id: LARMAH.user.id,
          status: status || "new",
        },
      ]);
      if (error) throw error;
    } catch (e) {
      console.warn("logRequest failed:", e?.message || e);
    }
  };

  /**
   * One-call helper for website forms:
   * - logs request if logged-in (best-effort)
   * - opens WhatsApp always
   */
  LARMAH.submitRequest = async function submitRequest({ header, category, fields, refPrefix = "WEB" }) {
    const ref = LARMAH.buildRef(refPrefix);
    const msg = LARMAH.buildMessage(header, fields || {}, ref);

    await LARMAH.logRequest(category || "general", { header, fields, ref }, "new");
    LARMAH.openWhatsApp(msg);
  };

  // ---------- REALTIME ENGINE ----------
  LARMAH.realtime = LARMAH.realtime || {};
  LARMAH.realtime.channels = LARMAH.realtime.channels || new Map();
  LARMAH.realtime.debounceTimers = LARMAH.realtime.debounceTimers || new Map();

  LARMAH.realtime._sb = function _sb() {
    return ensureSupabaseClient();
  };

  LARMAH.realtime.debounce = function debounce(key, fn, wait = 650) {
    const prev = LARMAH.realtime.debounceTimers.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(fn, wait);
    LARMAH.realtime.debounceTimers.set(key, t);
  };

  LARMAH.realtime.statusBadge = function statusBadge(elId, status) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (status === "SUBSCRIBED") {
      el.innerHTML = `<i class="fa-solid fa-circle fa-beat"></i> Live updates enabled`;
    } else {
      el.innerHTML = `<i class="fa-solid fa-circle"></i> Live: ${__escapeHtml(status)}`;
    }
  };

  LARMAH.realtime.unsubscribe = function unsubscribe(name) {
    const sb = LARMAH.realtime._sb();
    const ch = LARMAH.realtime.channels.get(name);
    if (!sb || !ch) return;
    try { sb.removeChannel(ch); } catch {}
    LARMAH.realtime.channels.delete(name);
  };

  LARMAH.realtime.unsubscribeAll = function unsubscribeAll() {
    const sb = LARMAH.realtime._sb();
    if (!sb) return;
    for (const [name, ch] of LARMAH.realtime.channels.entries()) {
      try { sb.removeChannel(ch); } catch {}
      LARMAH.realtime.channels.delete(name);
    }
  };

  /**
   * subscribe(table, onChange, name, options)
   * options:
   *  - schema: "public"
   *  - events: "*" | "INSERT" | "UPDATE" | "DELETE"
   *  - debounceMs: number
   *  - statusElId: string (badge element id)
   *  - filter: string  (Supabase realtime filter string e.g. "category=eq.real-estate")
   *  - match: object   (alternative to filter: { category: "real-estate" } uses eq matching)
   */
  LARMAH.realtime.subscribe = function subscribe(table, onChange, name, options = {}) {
    const sb = LARMAH.realtime._sb();
    if (!sb) return null;

    const schema = options.schema || "public";
    const events = options.events || "*";
    const debounceMs = typeof options.debounceMs === "number" ? options.debounceMs : 650;

    if (!name) name = `${schema}-${table}-default`;

    // Stop prior channel with same name
    LARMAH.realtime.unsubscribe(name);

    const changeParams = { event: events, schema, table };

    // Optional filters
    if (options.filter && typeof options.filter === "string") {
      changeParams.filter = options.filter;
    } else if (options.match && typeof options.match === "object") {
      // Build a simple AND filter: key=eq.value,key2=eq.value2
      const parts = Object.entries(options.match)
        .filter(([k, v]) => k && v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `${k}=eq.${String(v).replace(/,/g, "\\,")}`);
      if (parts.length) changeParams.filter = parts.join(",");
    }

    const channel = sb
      .channel(name)
      .on("postgres_changes", changeParams, (payload) => {
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

  // ---------- PAGE BOOTSTRAP ----------
  function initYear() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  function initOverlayClose() {
    const overlay = document.getElementById("mobileNavOverlay");
    if (!overlay) return;

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) LARMAH.toggleMenu(false);
    });

    // ESC closes menu
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const isOpen = document.body.classList.contains("nav-open");
        if (isOpen) LARMAH.toggleMenu(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureSupabaseClient();
    initAuthListener();
    initYear();
    initOverlayClose();

    // Keep header in sync
    if (typeof LARMAH.updateHeaderAuthUI === "function") {
      try { LARMAH.updateHeaderAuthUI(); } catch {}
    }
  });
})();
