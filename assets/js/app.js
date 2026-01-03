/* =========================
   Larmah Enterprise - app.js (FULL + DB-admin check)
========================= */
(function () {
  "use strict";

  const SUPABASE_URL =
    window.__SUPABASE_URL || "https://mskbumvopqnrhddfycfd.supabase.co";

  const SUPABASE_ANON_KEY =
    window.__SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

  const WHATSAPP_PHONE = "2347063080605";

  const ADMIN_EMAILS = (window.__LARMAH_ADMIN_EMAILS || [
    // "luckymomodu60@gmail.com",
  ]).map((e) => String(e).toLowerCase().trim());

  const THEME_KEY = "larmah_theme_v6";

  let supabaseClient = null;

  function ensureSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase || !window.supabase.createClient) return null;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.supabaseClient = supabaseClient;
    return supabaseClient;
  }

  async function waitForSupabase({ tries = 20, delay = 250 } = {}) {
    for (let i = 0; i < tries; i++) {
      const sb = ensureSupabaseClient();
      if (sb) return sb;
      await new Promise((r) => setTimeout(r, delay));
    }
    return null;
  }

  function escapeHtml(s) {
    return (s ?? "").toString().replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function buildMessage(title, data) {
    const lines = [title, ""];
    for (const [k, v] of Object.entries(data || {})) {
      const val = (v ?? "").toString().trim();
      if (val) lines.push(`${k}: ${val}`);
    }
    return lines.join("\n");
  }

  function openWhatsApp(text) {
    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text || "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function functionsBase() {
    return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;
  }

  function lowerEmail(e) {
    return String(e || "").toLowerCase().trim();
  }

  // Toast
  function toast(message, type = "info") {
    const id = "__larmah_toast";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.minWidth = "220px";
      el.style.maxWidth = "min(560px, calc(100vw - 28px))";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "14px";
      el.style.border = "1px solid rgba(255,255,255,.12)";
      el.style.background = "rgba(5,8,16,.92)";
      el.style.color = "#fff";
      el.style.boxShadow = "0 12px 34px rgba(0,0,0,.30)";
      el.style.zIndex = "99999";
      el.style.display = "none";
      el.style.fontWeight = "850";
      el.style.backdropFilter = "blur(8px)";
      document.body.appendChild(el);
    }
    const prefix =
      type === "success" ? "✅ " :
      type === "error" ? "⛔ " :
      type === "warn" ? "⚠️ " : "";
    el.textContent = `${prefix}${message || ""}`;
    el.style.display = "block";
    clearTimeout(window.__larmahToastT);
    window.__larmahToastT = setTimeout(() => (el.style.display = "none"), 2600);
  }

  // Theme
  function setTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", t === "light" ? "#F7F7FB" : "#070A12");
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  }
  function initTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return setTheme(saved);
    } catch {}
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark");
  }

  // Menu helper
  function toggleMenu(open) {
    const ids = ["overlay", "mobileNavOverlay"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const isOpen = open === undefined ? !el.classList.contains("open") : !!open;
      el.classList.toggle("open", isOpen);
      el.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  }

  // Session + premium
  async function getSession() {
    const sb = await waitForSupabase();
    if (!sb) return { session: null, user: null };
    const { data } = await sb.auth.getSession();
    return { session: data?.session || null, user: data?.session?.user || null };
  }

  async function signOutSilently() {
    const sb = await waitForSupabase();
    if (!sb) return;
    try { await sb.auth.signOut(); } catch {}
  }

  async function getMyMembership() {
    const sb = await waitForSupabase();
    if (!sb) return { ok: false, error: "Supabase not ready" };

    const { data: sess } = await sb.auth.getSession();
    const user = sess?.session?.user;
    const email = lowerEmail(user?.email);

    if (!user || !email) return { ok: false, error: "Not authenticated" };

    const { data, error } = await sb
      .from("premium_members")
      .select("email,tier,active,started_at,paystack_ref")
      .eq("email", email)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, member: null };
    return { ok: true, member: data };
  }

  async function requirePremium({ redirectTo = "premium.html", onFail } = {}) {
    const m = await getMyMembership();
    if (!m.ok) {
      if (typeof onFail === "function") onFail(m);
      return false;
    }
    if (!m.member || m.member.active !== true) {
      await signOutSilently();
      if (typeof onFail === "function") onFail({ ok: true, member: null });
      if (redirectTo) window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  // ✅ DB admin check (matches RLS via is_admin())
  async function isAdminDB() {
    const sb = await waitForSupabase();
    if (!sb) return false;
    try {
      const { data, error } = await sb.rpc("is_admin");
      if (error) return false;
      return data === true;
    } catch {
      return false;
    }
  }

  async function requireAdmin({ redirectTo = "auth.html", onFail } = {}) {
    const { user } = await getSession();
    const email = lowerEmail(user?.email);

    if (!email) {
      if (typeof onFail === "function") onFail({ reason: "no-session" });
      if (redirectTo) window.location.href = redirectTo;
      return false;
    }

    const premiumOk = await requirePremium({ redirectTo: "premium.html" });
    if (!premiumOk) return false;

    // pass if either JS allowlist OR DB allowlist
    const allowByJs = ADMIN_EMAILS.length ? ADMIN_EMAILS.includes(email) : false;
    const allowByDb = await isAdminDB();

    if (!allowByJs && !allowByDb) {
      if (typeof onFail === "function") onFail({ reason: "not-admin" });
      window.location.href = "index.html";
      return false;
    }

    return true;
  }

  // Realtime helper
  const realtime = {
    _subs: {},
    subscribe(table, callback, key = "default", opts = {}) {
      const sb = ensureSupabaseClient();
      if (!sb) return null;

      const debounceMs = opts.debounceMs ?? 500;
      let t = null;

      const channelKey = `${table}:${key}`;
      if (this._subs[channelKey]) {
        try { sb.removeChannel(this._subs[channelKey]); } catch {}
        delete this._subs[channelKey];
      }

      const ch = sb
        .channel(channelKey)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          clearTimeout(t);
          t = setTimeout(() => callback(), debounceMs);
        })
        .subscribe();

      this._subs[channelKey] = ch;
      return ch;
    }
  };

  async function submitRequest(payload) {
    openWhatsApp(buildMessage(payload?.header || "New Request", payload?.fields || payload || {}));
  }

  // Expose
  window.ensureSupabaseClient = ensureSupabaseClient;
  window.supabaseClient = supabaseClient;

  window.LARMAH = window.LARMAH || {};
  window.LARMAH.supabase = { ensure: ensureSupabaseClient, wait: waitForSupabase };

  window.LARMAH.openWhatsApp = openWhatsApp;
  window.LARMAH.buildMessage = buildMessage;
  window.LARMAH.functionsBase = functionsBase();

  window.LARMAH.realtime = realtime;
  window.LARMAH.submitRequest = submitRequest;

  window.LARMAH.requirePremium = requirePremium;
  window.LARMAH.requireAdmin = requireAdmin;

  window.LARMAH.escapeHtml = escapeHtml;
  window.LARMAH.toast = toast;

  window.LARMAH.toggleTheme = toggleTheme;
  window.LARMAH.setTheme = setTheme;
  window.LARMAH.toggleMenu = toggleMenu;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }
})();
