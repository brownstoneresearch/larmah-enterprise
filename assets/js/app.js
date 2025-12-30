/* assets/js/app.js
   Larmah Enterprise — shared client utilities

   Includes:
   - Supabase client bootstrap
   - WhatsApp helpers + message builder
   - Toast UI
   - Request submission (real-estate/logistics/premium)
   - Realtime subscriptions (listings)
   - Premium gate helpers:
       * isPremium()
       * premium.claim()  (binds verified premium payment to logged-in user)
       * premium.verifyPaystack(reference) (server-side verification via Edge Function)
*/

(function () {
  "use strict";

  // =========================
  // CONFIG (EDIT THESE)
  // =========================
  const SUPABASE_URL =
    window.LARMAH_SUPABASE_URL ||
    "https://mskbumvopqnrhddfycfd.supabase.co";

  // ✅ Paste your REAL anon key here (safe in frontend)
  const SUPABASE_ANON_KEY =
    window.LARMAH_SUPABASE_ANON_KEY ||
    "REPLACE_WITH_YOUR_SUPABASE_ANON_KEY";

  // WhatsApp number (international, no +)
  const WHATSAPP_NUMBER = "2347063080605";

  // Tables
  const REQUESTS_TABLE = "requests";
  const PREMIUM_SUBSCRIBERS_TABLE = "premium_subscribers";

  // Edge Function names
  const FN_PAYSTACK_VERIFY = "paystack-verify";
  const FN_PREMIUM_CLAIM = "premium-claim";

  // =========================
  // INTERNAL STATE
  // =========================
  let __sb = null;
  const __channels = new Map();
  const __debouncers = new Map();

  // =========================
  // HELPERS
  // =========================
  const nowISO = () => new Date().toISOString();
  const uid = () => {
    const t = Date.now().toString().slice(-8);
    const r = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `${t}-${r}`;
  };

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => {
      return (
        {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        }[m] || m
      );
    });
  }

  function prefersReduceMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function debounce(key, fn, wait = 700) {
    clearTimeout(__debouncers.get(key));
    __debouncers.set(
      key,
      setTimeout(() => {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      }, wait)
    );
  }

  function ensureToastEl() {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(msg, type = "info") {
    const el = ensureToastEl();
    el.textContent = msg;
    el.classList.add("show");
    el.dataset.type = type;
    clearTimeout(window.__larmahToastT);
    window.__larmahToastT = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function buildMessage(title, data) {
    const lines = [title, ""];
    const obj = data || {};
    for (const [k, v] of Object.entries(obj)) {
      const val = (v ?? "").toString().trim();
      if (val) lines.push(`${k}: ${val}`);
    }
    return lines.join("\n");
  }

  function openWhatsApp(text) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      text || ""
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // =========================
  // SUPABASE
  // =========================
  function ensureSupabaseClient() {
    if (__sb) return __sb;

    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      SUPABASE_ANON_KEY.includes("REPLACE_WITH")
    ) {
      console.warn(
        "[LARMAH] Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in assets/js/app.js"
      );
      return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.warn(
        "[LARMAH] Supabase JS not loaded. Ensure you have: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
      );
      return null;
    }

    __sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    });

    window.supabaseClient = __sb;
    return __sb;
  }

  async function getSession() {
    const sb = ensureSupabaseClient();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function getUser() {
    const sb = ensureSupabaseClient();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  }

  // =========================
  // PREMIUM GATE (Premium-only accounts)
  // =========================
  async function isPremium() {
    const sb = ensureSupabaseClient();
    if (!sb) return false;

    const user = await getUser();
    if (!user?.id) return false;

    const { data, error } = await sb
      .from(PREMIUM_SUBSCRIBERS_TABLE)
      .select("active,tier,end_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[LARMAH] isPremium() error:", error.message);
      return false;
    }
    if (!data?.active) return false;
    if (data.end_at && new Date(data.end_at) <= new Date()) return false;
    return true;
  }

  // =========================
  // EDGE FUNCTION CALLER
  // =========================
  async function callFunction(name, body, { useAuth = true } = {}) {
    const sb = ensureSupabaseClient();
    if (!sb) throw new Error("Supabase not initialized");

    const url = `${SUPABASE_URL}/functions/v1/${name}`;

    const headers = {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    };

    if (useAuth) {
      const session = await getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {}),
    });

    const txt = await res.text();
    let json = null;
    try {
      json = txt ? JSON.parse(txt) : null;
    } catch {
      // ignore
    }

    if (!res.ok) {
      const msg = json?.error || json?.message || txt || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json;
  }

  // Verify Paystack reference server-side (does not create account)
  async function verifyPaystack(reference) {
    if (!reference) throw new Error("Missing reference");
    return callFunction(
      FN_PAYSTACK_VERIFY,
      { reference },
      { useAuth: false }
    );
  }

  // Claim Premium for logged-in user
  // This binds a paid premium_payment (by email/ref) -> auth user_id and activates premium_subscribers
  async function claimPremium({ reference = null } = {}) {
    return callFunction(FN_PREMIUM_CLAIM, { reference }, { useAuth: true });
  }

  // =========================
  // REALTIME
  // =========================
  function realtimeSubscribe(table, onChange, key = "default", opts = {}) {
    const sb = ensureSupabaseClient();
    if (!sb) return null;

    const {
      schema = "public",
      debounceMs = 800,
      statusElId = null,
      filter = null,
    } = opts;

    const channelKey = `${table}:${key}`;

    if (__channels.has(channelKey)) {
      try {
        sb.removeChannel(__channels.get(channelKey));
      } catch {}
      __channels.delete(channelKey);
    }

    const statusEl = statusElId ? document.getElementById(statusElId) : null;

    const ch = sb
      .channel(channelKey)
      .on("postgres_changes", { event: "*", schema, table }, (payload) => {
        if (typeof filter === "function") {
          try {
            if (!filter(payload)) return;
          } catch (e) {
            console.error(e);
          }
        }
        debounce(channelKey, onChange, debounceMs);
      })
      .subscribe((status) => {
        if (!statusEl) return;
        if (status === "SUBSCRIBED") {
          statusEl.innerHTML =
            `<i class="fa-solid fa-circle" style="font-size:9px"></i> Live updates enabled`;
        } else {
          statusEl.innerHTML =
            `<i class="fa-solid fa-circle" style="font-size:9px"></i> Live: ${escapeHtml(status)}`;
        }
      });

    __channels.set(channelKey, ch);
    return ch;
  }

  // =========================
  // REQUEST SUBMISSION
  // =========================
  function makeRequestRef(prefix = "REQ") {
    return `${prefix}-${uid()}`.toUpperCase();
  }

  async function submitRequest({
    header = "New Request",
    category = "general",
    fields = {},
    refPrefix = "REQ",
    page = window.location.pathname,
    source = "web",
  } = {}) {
    const sb = ensureSupabaseClient();
    const ref = makeRequestRef(refPrefix);

    const waMsg = buildMessage(header, {
      Ref: ref,
      Category: category,
      ...fields,
      Page: page,
      Time: nowISO(),
    });

    // If Supabase not ready, just WhatsApp
    if (!sb) {
      openWhatsApp(waMsg);
      return { ok: false, ref, fallback: "whatsapp" };
    }

    try {
      const user = await getUser();
      const payload = {
        ref,
        category,
        header,
        fields,
        source,
        status: "new",
        user_id: user?.id || null,
        page,
        user_agent: navigator.userAgent || null,
      };

      // NOTE: You should allow public inserts to requests (or authenticated-only) via RLS.
      const { error } = await sb.from(REQUESTS_TABLE).insert(payload);
      if (error) throw error;

      toast("Request submitted. Opening WhatsApp…", "success");
      openWhatsApp(waMsg);
      return { ok: true, ref };
    } catch (e) {
      console.error(e);
      toast("Could not log request. Opening WhatsApp…", "error");
      openWhatsApp(waMsg);
      return { ok: false, ref, fallback: "whatsapp" };
    }
  }

  // =========================
  // HEADER AUTH UI (Premium-gated)
  // =========================
  async function updateHeaderAuthUI() {
    const sb = ensureSupabaseClient();
    if (!sb) return;

    // Default hide premium-only controls until proven premium
    document
      .querySelectorAll("[data-premium='true']")
      .forEach((el) => (el.style.display = "none"));

    try {
      const session = await getSession();
      const authed = !!session;

      // Only show "guest" elements if NOT authed
      document
        .querySelectorAll("[data-auth='guest']")
        .forEach((el) => (el.style.display = authed ? "none" : ""));

      // Only show "authed" elements if authed (still not premium)
      document
        .querySelectorAll("[data-auth='authed']")
        .forEach((el) => (el.style.display = authed ? "" : "none"));

      // Premium gate: only show premium-only UI if premium is active
      if (authed) {
        const ok = await isPremium();
        document
          .querySelectorAll("[data-premium='true']")
          .forEach((el) => (el.style.display = ok ? "" : "none"));
      }
    } catch (e) {
      console.error(e);
    }
  }

  // =========================
  // EXPORT GLOBAL API
  // =========================
  window.ensureSupabaseClient = ensureSupabaseClient;
  window.supabaseClient = window.supabaseClient || null;

  window.LARMAH = window.LARMAH || {};
  window.LARMAH.escapeHtml = escapeHtml;
  window.LARMAH.toast = toast;
  window.LARMAH.buildMessage = buildMessage;
  window.LARMAH.openWhatsApp = openWhatsApp;
  window.LARMAH.submitRequest = submitRequest;

  window.LARMAH.realtime = window.LARMAH.realtime || {};
  window.LARMAH.realtime.subscribe = realtimeSubscribe;

  window.LARMAH.premium = window.LARMAH.premium || {};
  window.LARMAH.premium.isPremium = isPremium;
  window.LARMAH.premium.verifyPaystack = verifyPaystack;
  window.LARMAH.premium.claim = claimPremium;

  window.LARMAH.updateHeaderAuthUI = updateHeaderAuthUI;
  window.LARMAH.buildRef = makeRequestRef;

  // =========================
  // BOOT
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    ensureSupabaseClient();
    updateHeaderAuthUI();
  });
})();
