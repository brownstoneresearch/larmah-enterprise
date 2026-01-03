(function () {
  "use strict";

  // ====== CONFIG (Replace if needed) ======
  // You can override via window.__SUPABASE_URL / window.__SUPABASE_ANON_KEY before app.js loads.
  const SUPABASE_URL =
    window.__SUPABASE_URL || "https://mskbumvopqnrhddfycfd.supabase.co";
  const SUPABASE_ANON_KEY =
    window.__SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4"; // keep anon key here (ok). NEVER use service role in frontend.

  // WhatsApp support number
  const WHATSAPP_PHONE = "2347063080605";

  // Admin allowlist — set your real admin emails here (lowercase).
  // Example: ["business@heylarmah.tech"]
  const ADMIN_EMAILS = (window.__LARMAH_ADMIN_EMAILS || [
    // "business@heylarmah.tech",
  ]).map((e) => String(e).toLowerCase().trim());

  // ====== Supabase client ======
  let supabaseClient = null;

  function ensureSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("Supabase SDK not loaded yet.");
      return null;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("REPLACE_WITH")) {
      console.warn("Supabase URL/ANON KEY missing. Set them in app.js or window.__SUPABASE_* overrides.");
      return null;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
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

  // ====== Helpers ======
  const esc = (s) =>
    (s ?? "")
      .toString()
      .replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

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
    // Supabase Edge Functions base
    // https://<project-ref>.supabase.co/functions/v1
    return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;
  }

  function lowerEmail(e) {
    return String(e || "").toLowerCase().trim();
  }

  // ====== Premium membership checks ======
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
    // Requires authenticated session.
    const sb = await waitForSupabase();
    if (!sb) return { ok: false, error: "Supabase not ready" };

    const { data: sess } = await sb.auth.getSession();
    const user = sess?.session?.user;
    const email = lowerEmail(user?.email);

    if (!user || !email) return { ok: false, error: "Not authenticated" };

    // RLS policy should allow authenticated users to read their own membership row.
    const { data, error } = await sb
      .from("premium_members")
      .select("email,tier,active,started_at,paystack_ref")
      .eq("email", email)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, member: null }; // not premium
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

  async function requireAdmin({ redirectTo = "auth.html", onFail } = {}) {
    const { user } = await getSession();
    const email = lowerEmail(user?.email);
    if (!email) {
      if (typeof onFail === "function") onFail({ reason: "no-session" });
      if (redirectTo) window.location.href = redirectTo;
      return false;
    }
    // Must also be premium (your rule), then admin allowlist
    const premiumOk = await requirePremium({ redirectTo: "premium.html" });
    if (!premiumOk) return false;

    if (!ADMIN_EMAILS.includes(email)) {
      if (typeof onFail === "function") onFail({ reason: "not-admin" });
      window.location.href = "index.html";
      return false;
    }
    return true;
  }

  // ====== Realtime helper (optional) ======
  const realtime = {
    _subs: {},
    subscribe(table, callback, key = "default", opts = {}) {
      // Only works if your project has realtime enabled; keeps consistent API for your pages.
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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            clearTimeout(t);
            t = setTimeout(() => callback(), debounceMs);
          }
        )
        .subscribe();

      this._subs[channelKey] = ch;
      return ch;
    }
  };

  // ====== Optional request logger (if you want)
  // You can implement submitRequest in Edge Function later. Kept here to match earlier references.
  async function submitRequest(payload) {
    // Example: call your own Edge Function if you have it
    // const res = await fetch(`${functionsBase()}/submit-request`, { ... })
    // For now, fallback: WhatsApp message.
    openWhatsApp(buildMessage(payload?.header || "New Request", payload?.fields || payload || {}));
  }

  // ====== Expose global LARMAH object ======
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
})();
