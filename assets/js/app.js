// assets/js/app.js
(() => {
  const LARMAH = (window.LARMAH = window.LARMAH || {});

  // CONFIG (edit these)
  LARMAH.WHATSAPP_NUMBER = "2347063080605";
  LARMAH.SUPABASE_URL = "https://drchjifufpsvvlzgpaiy.supabase.co";
  LARMAH.SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY2hqaWZ1ZnBzdnZsemdwYWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTMwNDEsImV4cCI6MjA4MTY2OTA0MX0.MLr1iCF4gjz0wnT1IFISCV9eJtnbq96_W_i7wAMOSbY";
  LARMAH.PAYSTACK_PUBLIC_KEY = "PUT_YOUR_PAYSTACK_PUBLIC_KEY_HERE";

  LARMAH.toggleMenu = function () {
    const nav = document.getElementById("nav");
    if (nav) nav.classList.toggle("active");
  };

  // ✅ FIXED: Works with either data-link OR href matching (won't wipe manual .active incorrectly)
  LARMAH.setActiveNav = function () {
    const links = Array.from(document.querySelectorAll(".nav-link"));
    if (!links.length) return;

    const page = document.body.getAttribute("data-page") || "";
    const currentFile = (location.pathname.split("/").pop() || "index.html").split("?")[0];

    const anyDataLink = links.some((a) => a.dataset && a.dataset.link);

    if (anyDataLink) {
      // Use your data-page + data-link system
      links.forEach((a) => {
        const key = a.dataset.link;
        if (!key) return; // if a nav-link has no data-link, don't touch it
        a.classList.toggle("active", key === page);
      });
      return;
    }

    // Fallback: match current filename to href
    const matches = links.filter((a) => {
      const href = (a.getAttribute("href") || "").split("#")[0].split("?")[0];
      const hrefFile = href.split("/").pop();
      if (!hrefFile) return false;
      // Treat "/" as index.html for local dev
      if (!currentFile || currentFile === "/") return hrefFile === "index.html";
      return hrefFile === currentFile;
    });

    if (matches.length) {
      links.forEach((a) => a.classList.toggle("active", matches.includes(a)));
    }
    // If no matches (eg premium/auth pages), we do nothing (won't break manual styling)
  };

  LARMAH.toast = function (msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(window.__larmahToast);
    window.__larmahToast = setTimeout(() => (t.style.display = "none"), 2400);
  };

  LARMAH.encode = (s) => encodeURIComponent(String(s || ""));

  // ✅ Hardening: noopener/noreferrer
  LARMAH.openWhatsApp = function (message) {
    const url = "https://wa.me/" + LARMAH.WHATSAPP_NUMBER + "?text=" + LARMAH.encode(message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  LARMAH.now = function () {
    const d = new Date();
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  LARMAH.buildMessage = function (title, fields) {
    const lines = [];
    lines.push("LARMAH — " + title);
    lines.push("Time: " + LARMAH.now());
    lines.push("------------------------");
    Object.entries(fields || {}).forEach(([k, v]) => {
      const val = String(v ?? "").trim();
      if (val) lines.push(k + ": " + val);
    });
    lines.push("------------------------");
    lines.push("Sent from website");
    return lines.join("\n");
  };

  LARMAH.escapeHtml = function (s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
    });
  };

  // Supabase client
  LARMAH.sb = null;
  LARMAH.initSupabase = async function () {
    if (!window.supabase) {
      console.warn("Supabase SDK not loaded");
      return null;
    }
    if (LARMAH.sb) return LARMAH.sb;

    // ✅ Better auth defaults for magic links + session persistence
    LARMAH.sb = window.supabase.createClient(LARMAH.SUPABASE_URL, LARMAH.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // Keep the pill synced if auth state changes
    try {
      LARMAH.sb.auth.onAuthStateChange(() => {
        LARMAH.renderAuthPill();
      });
    } catch (_) {}

    return LARMAH.sb;
  };

  LARMAH.getSession = async function () {
    const sb = await LARMAH.initSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  };

  LARMAH.signOut = async function () {
    const sb = await LARMAH.initSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    LARMAH.toast("Signed out");
    setTimeout(() => (location.href = "index.html"), 600);
  };

  LARMAH.renderAuthPill = async function () {
    const mount = document.getElementById("authPill");
    if (!mount) return;

    const sess = await LARMAH.getSession();
    if (!sess) {
      mount.innerHTML =
        '<a class="pill" href="auth.html"><i class="fa-solid fa-right-to-bracket"></i> Sign in</a>' +
        '<a class="pill primary" href="premium.html"><i class="fa-solid fa-star"></i> Premium</a>';
      return;
    }

    const email = sess.user?.email || "Signed in";
    mount.innerHTML =
      '<button class="pill" title="' +
      LARMAH.escapeHtml(email) +
      '"><i class="fa-solid fa-user"></i> ' +
      LARMAH.escapeHtml(email) +
      "</button>" +
      '<button class="pill" onclick="LARMAH.signOut()"><i class="fa-solid fa-right-from-bracket"></i> Sign out</button>';
  };

  // Catalog
  LARMAH.fetchCatalog = async function (category) {
    const sb = await LARMAH.initSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from("catalog_items")
      .select("id,category,title,description,price,image_url,active,updated_at")
      .eq("category", category)
      .eq("active", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  };

  LARMAH.renderCatalog = async function (category, mountId, onEnquire) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    mount.innerHTML = '<div class="notice"><strong>Loading…</strong></div>';

    const items = await LARMAH.fetchCatalog(category);
    if (!items.length) {
      mount.innerHTML =
        '<div class="notice"><strong>No items found.</strong> Admin can add items in Command Center.</div>';
      return;
    }

    mount.innerHTML =
      '<div class="grid">' +
      items
        .map((it) => {
          return (
            '<div class="card">' +
            (it.image_url
              ? '<div class="thumb"><img src="' + LARMAH.escapeHtml(it.image_url) + '" alt=""></div>'
              : "") +
            "<h3>" +
            LARMAH.escapeHtml(it.title) +
            "</h3>" +
            "<p>" +
            LARMAH.escapeHtml(it.description || "") +
            "</p>" +
            (it.price ? '<div class="price">' + LARMAH.escapeHtml(it.price) + "</div>" : "") +
            '<div class="meta">Updated: ' +
            new Date(it.updated_at || Date.now()).toLocaleDateString() +
            '</div>' +
            '<div class="actions"><button class="btn small primary" data-enq="' +
            it.id +
            '">Enquire</button></div>' +
            "</div>"
          );
        })
        .join("") +
      "</div>";

    mount.querySelectorAll("[data-enq]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-enq");
        const item = items.find((x) => String(x.id) === String(id));
        if (onEnquire) onEnquire(item);
      });
    });
  };

  // Requests (Supabase + WhatsApp)
  LARMAH.submitRequest = async function (payload) {
    const sb = await LARMAH.initSupabase();
    if (!sb) return { ok: false, error: "Supabase not configured" };

    const sess = await LARMAH.getSession();
    const user_id = sess?.user?.id || null;

    const record = {
      user_id,
      category: payload.category,
      name: payload.name,
      phone: payload.phone,
      details: payload.details,
      created_at: new Date().toISOString()
    };

    // ✅ Fallback if your table doesn't have user_id yet
    let { error } = await sb.from("requests").insert([record]);
    if (error && /column "user_id".*does not exist/i.test(error.message)) {
      const record2 = { ...record };
      delete record2.user_id;
      const r2 = await sb.from("requests").insert([record2]);
      error = r2.error;
    }

    if (error) {
      console.error(error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  };

  // Insights
  LARMAH.fetchInsights = async function (limit) {
    const sb = await LARMAH.initSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from("insights_posts")
      .select("id,title,body,created_at")
      .order("created_at", { ascending: false })
      .limit(limit || 12);

    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  };

  LARMAH.renderInsights = async function (mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    mount.innerHTML = '<div class="notice"><strong>Loading…</strong></div>';

    const posts = await LARMAH.fetchInsights(12);
    if (!posts.length) {
      mount.innerHTML =
        '<div class="notice"><strong>No posts yet.</strong> Admin can publish in Command Center.</div>';
      return;
    }

    mount.innerHTML =
      '<div class="grid">' +
      posts
        .map((p) => {
          return (
            '<div class="card">' +
            "<h3>" +
            LARMAH.escapeHtml(p.title) +
            "</h3>" +
            "<p>" +
            LARMAH.escapeHtml(p.body || "") +
            "</p>" +
            '<div class="meta">' +
            new Date(p.created_at).toLocaleString() +
            "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  };

  LARMAH.subscribeInsights = async function (mountId) {
    const sb = await LARMAH.initSupabase();
    if (!sb) return;

    // avoid duplicate subscriptions if called twice
    if (LARMAH.__insightsChan) return;

    LARMAH.__insightsChan = sb
      .channel("insights_posts_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "insights_posts" }, async () => {
        await LARMAH.renderInsights(mountId);
      })
      .subscribe();
  };

  // Crypto
  LARMAH.loadCrypto = async function (mountId) {
    const el = document.getElementById(mountId);
    if (!el) return;

    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=ngn&include_last_updated_at=true",
        { cache: "no-store" }
      );
      const data = await res.json();

      const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "-");
      const last = data.bitcoin?.last_updated_at
        ? new Date(data.bitcoin.last_updated_at * 1000).toLocaleTimeString()
        : "";

      el.innerHTML =
        '<div class="grid">' +
        '<div class="card"><h3>BTC (₦)</h3><p class="small">' +
        fmt(data.bitcoin?.ngn) +
        "</p></div>" +
        '<div class="card"><h3>ETH (₦)</h3><p class="small">' +
        fmt(data.ethereum?.ngn) +
        "</p></div>" +
        '<div class="card"><h3>USDT (₦)</h3><p class="small">' +
        fmt(data.tether?.ngn) +
        "</p></div>" +
        "</div>" +
        '<div class="small" style="margin-top:10px;">Updated: ' +
        (last || "now") +
        "</div>";
    } catch (e) {
      el.innerHTML = '<div class="notice"><strong>Live prices unavailable.</strong> Please refresh.</div>';
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    LARMAH.setActiveNav();

    await LARMAH.initSupabase();
    await LARMAH.renderAuthPill();
  });
})();
