/* assets/js/app.js
   Larmah Enterprise — shared client utilities for:
   - Supabase client bootstrap
   - WhatsApp helpers + message builder
   - Toast UI
   - Request submission (real-estate/logistics/premium)
   - Realtime subscriptions (listings)
*/

(function () {
  "use strict";

  // =========================
  // CONFIG (EDIT THESE)
  // =========================
  // ✅ Your Supabase URL + ANON key (public key is OK in frontend)
  // If you already had these in a previous app.js, paste them here.
  const SUPABASE_URL =
    window.LARMAH_SUPABASE_URL ||
    "https://mskbumvopqnrhddfycfd.supabase.co"; // <-- update if different
  const SUPABASE_ANON_KEY =
    window.LARMAH_SUPABASE_ANON_KEY ||
    "REPLACE_WITH_YOUR_SUPABASE_ANON_KEY"; // <-- paste your anon key

  // WhatsApp number (international, no +)
  const WHATSAPP_NUMBER = "2347063080605";

  // Where requests are stored
  const REQUESTS_TABLE = "requests";
  const LISTINGS_TABLE = "listings";
  const PAYMENTS_TABLE = "premium_payments";

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

  function reduceMotion() {
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
    window.__larmahToastT = setTimeout(
      () => el.classList.remove("show"),
      2400
    );
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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("REPLACE_WITH")) {
      console.warn(
        "[LARMAH] Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in assets/js/app.js"
      );
      return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.warn(
        "[LARMAH] Supabase JS not loaded. Ensure <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script> exists."
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
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // expose for pages that look for it
    window.supabaseClient = __sb;

    return __sb;
  }

  async function getAuthedUserId() {
    try {
      const sb = ensureSupabaseClient();
      if (!sb) return null;
      const { data } = await sb.auth.getUser();
      return data?.user?.id || null;
    } catch {
      return null;
    }
  }

  // =========================
  // REALTIME (LISTINGS)
  // =========================
  function realtimeSubscribe(table, onChange, key = "default", opts = {}) {
    const sb = ensureSupabaseClient();
    if (!sb) return null;

    const {
      schema = "public",
      debounceMs = 800,
      statusElId = null,
      filter = null, // optional filter: (payload)=>boolean
    } = opts;

    const channelKey = `${table}:${key}`;

    // clean existing
    if (__channels.has(channelKey)) {
      try {
        sb.removeChannel(__channels.get(channelKey));
      } catch {}
      __channels.delete(channelKey);
    }

    const statusEl = statusElId ? document.getElementById(statusElId) : null;

    const ch = sb
      .channel(channelKey)
      .on(
        "postgres_changes",
        { event: "*", schema, table },
        (payload) => {
          if (typeof filter === "function") {
            try {
              if (!filter(payload)) return;
            } catch (e) {
              console.error(e);
            }
          }
          debounce(channelKey, onChange, debounceMs);
        }
      )
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

    // Always build WA message for fallback or user visibility
    const waMsg = buildMessage(header, {
      Ref: ref,
      Category: category,
      ...fields,
      Page: page,
      Time: nowISO(),
    });

    // If no supabase, fallback to WhatsApp
    if (!sb) {
      openWhatsApp(waMsg);
      return { ok: false, ref, fallback: "whatsapp" };
    }

    try {
      const userId = await getAuthedUserId();
      const payload = {
        ref,
        category,
        header,
        fields,
        source,
        status: "new",
        user_id: userId,
        page,
        user_agent: navigator.userAgent || null,
      };

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
  // OPTIONAL: HEADER AUTH UI (safe no-op)
  // =========================
  async function updateHeaderAuthUI() {
    // This is a lightweight helper; it won’t break pages that don’t use it.
    const sb = ensureSupabaseClient();
    if (!sb) return;

    try {
      const { data } = await sb.auth.getSession();
      const authed = !!data?.session;

      document
        .querySelectorAll("[data-auth='authed']")
        .forEach((el) => (el.style.display = authed ? "" : "none"));

      document
        .querySelectorAll("[data-auth='guest']")
        .forEach((el) => (el.style.display = authed ? "none" : ""));
    } catch (e) {
      console.error(e);
    }
  }

  // =========================
  // EXPORT GLOBAL API
  // =========================
  window.ensureSupabaseClient = ensureSupabaseClient;

  window.LARMAH = window.LARMAH || {};
  window.LARMAH.escapeHtml = escapeHtml;
  window.LARMAH.toast = toast;
  window.LARMAH.buildMessage = buildMessage;
  window.LARMAH.openWhatsApp = openWhatsApp;

  window.LARMAH.submitRequest = submitRequest;

  window.LARMAH.realtime = window.LARMAH.realtime || {};
  window.LARMAH.realtime.subscribe = realtimeSubscribe;

  window.LARMAH.updateHeaderAuthUI = updateHeaderAuthUI;

  // Convenience: quick WA builders
  window.LARMAH.buildRef = makeRequestRef;

  // =========================
  // BOOT
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    ensureSupabaseClient();
    updateHeaderAuthUI();
  });
})();
