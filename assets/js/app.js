(() => {
  const LARMAH = (window.LARMAH = window.LARMAH || {});

  // CONFIG
  LARMAH.WHATSAPP_NUMBER = "2347063080605";
  LARMAH.SUPABASE_URL = "https://drchjifufpsvvlzgpaiy.supabase.co";
  LARMAH.SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY2hqaWZ1ZnBzdnZsemdwYWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTMwNDEsImV4cCI6MjA4MTY2OTA0MX0.MLr1iCF4gjz0wnT1IFISCV9eJtnbq96_W_i7wAMOSbY";

  LARMAH.PAYSTACK_PUBLIC_KEY = "PUT_YOUR_PAYSTACK_PUBLIC_KEY_HERE";

  // State for scroll lock
  let scrollPosition = 0;
  let scrollLockEnabled = false;

  // Helpers to find nav element (supports nav#nav OR .mobile-nav)
  function getNavEl() {
    return document.getElementById("nav") || document.querySelector(".mobile-nav");
  }
  function getNavPanel(nav) {
    return nav ? nav.querySelector(".nav-panel") : null;
  }

  // Scroll lock functions
  LARMAH.lockScroll = function () {
    if (scrollLockEnabled) return;
    
    scrollPosition = window.pageYOffset;
    const body = document.body;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    body.style.position = "fixed";
    body.style.top = `-${scrollPosition}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";
    body.style.paddingRight = `${scrollbarWidth}px`;
    
    // Also fix any fixed elements that might shift
    document.querySelectorAll("header").forEach(el => {
      el.style.paddingRight = `${scrollbarWidth}px`;
    });
    
    scrollLockEnabled = true;
  };

  LARMAH.unlockScroll = function () {
    if (!scrollLockEnabled) return;
    
    const body = document.body;
    
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.overflow = "";
    body.style.paddingRight = "";
    
    // Reset header padding
    document.querySelectorAll("header").forEach(el => {
      el.style.paddingRight = "";
    });
    
    window.scrollTo(0, scrollPosition);
    scrollLockEnabled = false;
  };

  // NAV
  LARMAH.toggleMenu = function () {
    const nav = getNavEl();
    if (!nav) return;
    
    const isOpening = !nav.classList.contains("active");
    nav.classList.toggle("active");
    document.body.classList.toggle("nav-open", nav.classList.contains("active"));
    
    if (isOpening) {
      LARMAH.lockScroll();
    } else {
      LARMAH.unlockScroll();
    }
  };

  LARMAH.closeMenu = function () {
    const nav = getNavEl();
    if (!nav || !nav.classList.contains("active")) return;
    
    nav.classList.remove("active");
    document.body.classList.remove("nav-open");
    LARMAH.unlockScroll();
  };

  LARMAH.setActiveNav = function () {
    const links = Array.from(document.querySelectorAll(".nav-link"));
    if (!links.length) return;

    const page = (document.body.getAttribute("data-page") || "").trim();
    const currentFile = (location.pathname.split("/").pop() || "index.html").split("?")[0];

    const anyDataLink = links.some((a) => a.dataset && a.dataset.link);

    if (anyDataLink && page) {
      links.forEach((a) => {
        if (!a.dataset.link) return;
        a.classList.toggle("active", a.dataset.link === page);
      });
      return;
    }

    const matched = links.find((a) => {
      const href = (a.getAttribute("href") || "").split("#")[0].split("?")[0];
      const hrefFile = href.split("/").pop();
      return hrefFile && hrefFile === currentFile;
    });

    if (matched) links.forEach((a) => a.classList.toggle("active", a === matched));
  };

  // UI
  LARMAH.toast = function (msg, ms = 2400) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(window.__larmahToast);
    window.__larmahToast = setTimeout(() => (t.style.display = "none"), ms);
  };

  LARMAH.escapeHtml = function (s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
    });
  };

  // WhatsApp
  LARMAH.buildMessage = function (title, fields = {}) {
    const lines = [];
    lines.push(`LARMAH — ${title}`);
    lines.push(`Time: ${new Date().toLocaleString()}`);
    lines.push("------------------------");
    Object.entries(fields).forEach(([k, v]) => {
      const val = String(v ?? "").trim();
      if (val) lines.push(`${k}: ${val}`);
    });
    lines.push("------------------------");
    lines.push(`Sent from website: ${location.href}`);
    return lines.join("\n");
  };

  LARMAH.openWhatsApp = function (message) {
    const url = "https://wa.me/" + LARMAH.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(String(message || ""));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Supabase
  LARMAH.sb = null;

  LARMAH.initSupabase = async function () {
    if (!window.supabase) {
      console.warn("Supabase SDK not loaded");
      return null;
    }
    if (LARMAH.sb) return LARMAH.sb;

    LARMAH.sb = window.supabase.createClient(LARMAH.SUPABASE_URL, LARMAH.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    try {
      LARMAH.sb.auth.onAuthStateChange(() => LARMAH.renderAuthPill());
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
      '<button class="pill" title="' + LARMAH.escapeHtml(email) + '"><i class="fa-solid fa-user"></i> ' +
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
      .select("id,category,title,description,price,image_url,tags,active,updated_at")
      .eq("category", category)
      .eq("active", true)
      .order("updated_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  };

  // Requests
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

    let { error } = await sb.from("requests").insert([record]);

    // fallback if your requests table doesn't have user_id column
    if (error && /column "user_id".*does not exist/i.test(error.message)) {
      const record2 = { ...record };
      delete record2.user_id;
      const r2 = await sb.from("requests").insert([record2]);
      error = r2.error;
    }

    if (error) { console.error(error); return { ok: false, error: error.message }; }
    return { ok: true };
  };

  // Insights (pinned first) + fallback
  LARMAH.fetchInsights = async function (limit = 12) {
    const sb = await LARMAH.initSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from("insights_posts")
      .select("id,title,body,pinned,created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
  };

  LARMAH.renderInsights = async function (mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = '<div class="notice"><strong>Loading…</strong></div>';

    const posts = await LARMAH.fetchInsights(12);

    if (!posts.length) {
      mount.innerHTML = `
        <div class="grid">
          <div class="card">
            <h3>Welcome to Larmah Insights</h3>
            <p class="small" style="margin-top:8px;opacity:.9">
              Updates will appear here in real time. Use Exchange for rate help, or contact us on WhatsApp.
            </p>
            <div class="actions" style="margin-top:10px">
              <a class="btn solid" href="exchange.html"><i class="fa-solid fa-money-bill-transfer"></i> Exchange</a>
              <button class="btn" onclick="LARMAH.openWhatsApp(LARMAH.buildMessage('Insights Enquiry', { Name:'', Phone:'', Message:'Hello Larmah, I need assistance.' }))">
                <i class="fa-brands fa-whatsapp"></i> WhatsApp
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    mount.innerHTML =
      '<div class="grid">' +
      posts.map(p => `
        <div class="card">
          <h3>${LARMAH.escapeHtml(p.title)} ${p.pinned ? '<span class="small" style="opacity:.7">• Pinned</span>' : ''}</h3>
          <p class="small" style="margin-top:8px;opacity:.92">${LARMAH.escapeHtml(p.body || "")}</p>
          <div class="meta">${new Date(p.created_at).toLocaleString()}</div>
        </div>
      `).join("") +
      '</div>';
  };

  LARMAH.subscribeInsights = async function (mountId) {
    const sb = await LARMAH.initSupabase();
    if (!sb) return;
    if (LARMAH.__insightsChan) return;

    LARMAH.__insightsChan = sb
      .channel("insights_posts_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "insights_posts" }, async () => {
        await LARMAH.renderInsights(mountId);
      })
      .subscribe();
  };

  // Crypto (NGN)
  LARMAH.loadCrypto = async function (mountId) {
    const el = document.getElementById(mountId);
    if (!el) return;

    el.innerHTML = "<strong>Loading…</strong>";

    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=ngn&include_last_updated_at=true",
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Price feed unavailable");
      const data = await res.json();

      const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "-");
      const last = data.bitcoin?.last_updated_at
        ? new Date(data.bitcoin.last_updated_at * 1000).toLocaleTimeString()
        : "";

      el.innerHTML =
        '<div class="grid">' +
        '<div class="card"><h3>BTC (₦)</h3><p class="small">' + fmt(data.bitcoin?.ngn) + "</p></div>" +
        '<div class="card"><h3>ETH (₦)</h3><p class="small">' + fmt(data.ethereum?.ngn) + "</p></div>" +
        '<div class="card"><h3>USDT (₦)</h3><p class="small">' + fmt(data.tether?.ngn) + "</p></div>" +
        "</div>" +
        '<div class="small" style="margin-top:10px;">Updated: ' + (last || "now") + "</div>";
    } catch (e) {
      el.innerHTML = '<div class="notice"><strong>Live prices unavailable.</strong> Please refresh.</div>';
    }
  };

  // Exchange rates (dynamic)
  LARMAH.fetchExchangeRates = async function () {
    const sb = await LARMAH.initSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from("exchange_rates")
      .select("code,name,buy_ngn,sell_ngn,fee_rate,min_amount,max_amount,updated_at")
      .order("code", { ascending: true });
    if (error) { console.error(error); return []; }
    return data || [];
  };

  LARMAH.subscribeExchangeRates = async function (onChange) {
    const sb = await LARMAH.initSupabase();
    if (!sb) return;
    if (LARMAH.__exchangeChan) return;

    LARMAH.__exchangeChan = sb
      .channel("exchange_rates_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () => {
        if (typeof onChange === "function") onChange();
      })
      .subscribe();
  };

  // Boot
  document.addEventListener("DOMContentLoaded", async () => {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    LARMAH.setActiveNav();
    await LARMAH.initSupabase();
    await LARMAH.renderAuthPill();

    // Close menu on any nav link click
    document.querySelectorAll(".nav-link").forEach((a) => {
      a.addEventListener("click", () => LARMAH.closeMenu());
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") LARMAH.closeMenu();
    });

    // Close when clicking outside nav panel
    document.addEventListener("click", (e) => {
      const nav = getNavEl();
      if (!nav || !nav.classList.contains("active")) return;

      const panel = getNavPanel(nav);
      const menuBtn = e.target.closest && e.target.closest(".menu-btn");
      if (menuBtn) return;

      if (panel && !panel.contains(e.target)) LARMAH.closeMenu();
    });

    // Handle window resize - close menu on large screens
    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) {
        LARMAH.closeMenu();
      }
    });

    // Ensure scroll is unlocked if user navigates away
    window.addEventListener("beforeunload", () => {
      LARMAH.unlockScroll();
    });
  });
})();
