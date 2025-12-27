/**
 * LARMAH ENTERPRISE | assets/js/app.js (COMPLETE — UPDATED)
 * ✅ Supabase client singleton (window.supabaseClient + LARMAH.supabase)
 * ✅ WhatsApp builder + request logging
 * ✅ Auth helpers + role-based redirect:
 *    - Admin (profiles.role='admin' AND email matches ADMIN_EMAIL) => admin.html
 *    - Non-admin => dashboard.html
 * ✅ Realtime subscribe/unsubscribe (filter/match supported)
 * ✅ Generic Edge function helper
 *
 * ✅ INSIGHTS REMOVED:
 * - No Insights page helpers
 * - No RSS sync helpers
 * - No Insights-specific realtime subscriptions
 */

(() => {
  "use strict";

  // ---------- CONFIG ----------
  const ADMIN_EMAIL = "luckymomodu60@gmail.com";

  window.SUPABASE_URL =
    window.SUPABASE_URL || "https://mskbumvopqnrhddfycfd.supabase.co";

  window.SUPABASE_ANON_KEY =
    window.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

  const now = () => Date.now();
  const rand = (len = 10) => Math.random().toString(36).slice(2, 2 + len).toUpperCase();

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
  LARMAH.businessPhone = LARMAH.businessPhone || "2347063080605";
  LARMAH.businessEmail = LARMAH.businessEmail || "business@heylarmah.tech";

  // Compatibility: some pages check LARMAH.supabase
  Object.defineProperty(LARMAH, "supabase", {
    get() { return ensureSupabaseClient(); }
  });

  LARMAH.user = LARMAH.user || null;
  LARMAH.session = LARMAH.session || null;

  LARMAH.__toastTimer = LARMAH.__toastTimer || null;
  LARMAH.__sessionCacheTs = LARMAH.__sessionCacheTs || 0;
  LARMAH.__sessionCacheTtlMs = LARMAH.__sessionCacheTtlMs || 12_000;

  // Exchange cache
  LARMAH.__rates = LARMAH.__rates || [];
  LARMAH.__ratesMap = LARMAH.__ratesMap || {};
  LARMAH.__ratesCacheTs = LARMAH.__ratesCacheTs || 0;
  LARMAH.__ratesCacheTtlMs = LARMAH.__ratesCacheTtlMs || 60_000; // 60s

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
    const url = `${baseUrl}?phone=${encodeURIComponent(LARMAH.businessPhone)}&text=${encodeURIComponent(
      String(text || "")
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  LARMAH.openEmail = function ({ to, subject = "", body = "" } = {}) {
    const emailTo = to || LARMAH.businessEmail || "business@heylarmah.tech";
    const href = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
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

  // ---------- AUTH / ROLE HELPERS ----------
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

  /**
   * ✅ Checks admin using BOTH:
   *  - RPC is_admin() (DB role)
   *  - email must match ADMIN_EMAIL (your requirement)
   */
  LARMAH.isAdmin = async function () {
    const sb = LARMAH.sb();
    if (!sb) return false;

    await LARMAH.getSession();
    const email = (LARMAH.user?.email || "").toLowerCase();
    if (!email) return false;

    if (email !== String(ADMIN_EMAIL).toLowerCase()) return false;

    try {
      const { data, error } = await sb.rpc("is_admin");
      if (error) {
        console.warn("is_admin rpc error:", error.message);
        return false;
      }
      return !!data;
    } catch (e) {
      console.warn("is_admin rpc exception:", e);
      return false;
    }
  };

  /**
   * ✅ Universal redirect after sign-in
   * - admin => admin.html
   * - non-admin => dashboard.html
   */
  LARMAH.redirectAfterLogin = async function ({
    adminUrl = "admin.html",
    userUrl = "dashboard.html",
    fallbackUrl = "auth.html"
  } = {}) {
    try {
      const sb = LARMAH.sb();
      if (!sb) {
        window.location.href = fallbackUrl;
        return;
      }
      await LARMAH.getSession({ force: true });
      if (!LARMAH.session) {
        window.location.href = fallbackUrl;
        return;
      }
      const admin = await LARMAH.isAdmin();
      window.location.href = admin ? adminUrl : userUrl;
    } catch (e) {
      console.warn("redirectAfterLogin:", e);
      window.location.href = fallbackUrl;
    }
  };

  LARMAH.updateHeaderAuthUI = async function () {
    const el = document.querySelector(".header-actions");
    if (!el) return;
    const session = await LARMAH.getSession();
    el.style.display = session ? "flex" : "none";
  };

  LARMAH.signOut = async function (redirect = "auth.html") {
    const sb = LARMAH.sb();
    if (!sb) return;
    try { await sb.auth.signOut(); } catch (e) { console.warn("signOut:", e); }
    LARMAH.user = null;
    LARMAH.session = null;
    LARMAH.__sessionCacheTs = now();
    if (LARMAH.realtime) LARMAH.realtime.unsubscribeAll();
    if (redirect) window.location.href = redirect;
  };

  function initAuthListener() {
    const sb = LARMAH.sb();
    if (!sb || !sb.auth || typeof sb.auth.onAuthStateChange !== "function") return;

    sb.auth.onAuthStateChange((_event, session) => {
      LARMAH.session = session || null;
      LARMAH.user = session?.user || null;
      LARMAH.__sessionCacheTs = now();
      try { LARMAH.updateHeaderAuthUI(); } catch {}
    });
  }

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

  // ---------- RATES (Exchange) ----------
  function normalizePair(s) {
    return String(s || "").trim().toUpperCase();
  }

  function pickRateValue(r) {
    // Prefer mid if you use it; otherwise sell; otherwise buy.
    const mid = r.mid ?? r.rate ?? null; // tolerate older schemas
    const sell = r.sell ?? null;
    const buy = r.buy ?? null;
    const v = (mid !== null && mid !== undefined && mid !== "") ? mid : (sell ?? buy);
    const n = Number(v);
    return isFinite(n) ? n : null;
  }

  function buildRatesMap(list) {
    const map = {};
    for (const r of list || []) {
      const key = normalizePair(r.asset || r.pair || (r.base && r.quote ? `${r.base}/${r.quote}` : ""));
      if (!key) continue;
      map[key] = r;
    }
    return map;
  }

  /**
   * getRates({ force=false })
   * - Reads from public.rates (status='active')
   * - Caches for 60 seconds (configurable)
   */
  LARMAH.getRates = async function ({ force = false } = {}) {
    const sb = LARMAH.sb();
    if (!sb) return [];

    if (!force && LARMAH.__ratesCacheTs && (now() - LARMAH.__ratesCacheTs) < LARMAH.__ratesCacheTtlMs) {
      return LARMAH.__rates;
    }

    try {
      const { data, error } = await sb
        .from("rates")
        .select("id,asset,buy,sell,status,created_at,updated_at,icon_url,icon_path,base,quote,pair")
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const rows = data || [];
      LARMAH.__rates = rows;
      LARMAH.__ratesMap = buildRatesMap(rows);
      LARMAH.__ratesCacheTs = now();

      // expose for pages that check window.__rates
      window.__rates = rows;

      return rows;
    } catch (e) {
      console.warn("getRates failed:", e?.message || e);
      return LARMAH.__rates || [];
    }
  };

  /**
   * getRate("USD/NGN") => number or null
   */
  LARMAH.getRate = function (pair) {
    const key = normalizePair(pair);
    const r = LARMAH.__ratesMap?.[key];
    if (!r) return null;
    return pickRateValue(r);
  };

  /**
   * convert({ amount, from, to }) using available rates:
   * - If from/to are the same => amount
   * - If we have from/to => amount * rate
   * - Else if we have inverse => amount / rate
   */
  LARMAH.convert = function ({ amount, from, to }) {
    const amt = Number(amount);
    if (!isFinite(amt)) return null;
    const A = normalizePair(from);
    const B = normalizePair(to);
    if (!A || !B) return null;
    if (A === B) return amt;

    const directKey = `${A}/${B}`;
    const invKey = `${B}/${A}`;

    const direct = LARMAH.__ratesMap?.[directKey];
    if (direct) {
      const v = pickRateValue(direct);
      return v === null ? null : (amt * v);
    }

    const inv = LARMAH.__ratesMap?.[invKey];
    if (inv) {
      const v = pickRateValue(inv);
      return v === null ? null : (amt / v);
    }

    return null;
  };

  // ---------- EDGE FUNCTIONS (Generic) ----------
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
  function initOverlayClose() {
    const overlay = document.getElementById("mobileNavOverlay");
    if (!overlay) return;

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) LARMAH.toggleMenu(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const isOpen = document.body.classList.contains("nav-open");
        if (isOpen) LARMAH.toggleMenu(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    ensureSupabaseClient();
    initAuthListener();
    initOverlayClose();

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    try { LARMAH.updateHeaderAuthUI(); } catch {}

    // Preload rates quietly for exchange/home pages (won't crash if table missing)
    try { await LARMAH.getRates({ force: false }); } catch {}
  });
})();
