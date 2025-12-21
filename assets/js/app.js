// assets/js/app.js (FULL — mobile drop-down sheet to 50vh + black overlay; closes ONLY by X)

(() => {
  const LARMAH = (window.LARMAH = window.LARMAH || {});

  // CONFIG
  LARMAH.WHATSAPP_NUMBER = "2347063080605";
  LARMAH.SUPABASE_URL = "https://drchjifufpsvvlzgpaiy.supabase.co";
  LARMAH.SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY2hqaWZ1ZnBzdnZsemdwYWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTMwNDEsImV4cCI6MjA4MTY2OTA0MX0.MLr1iCF4gjz0wnT1IFISCV9eJtnbq96_W_i7wAMOSbY";

  // Utils
  LARMAH.escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));

  LARMAH.toast = (msg, ms = 2400) => {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(window.__larmahToast);
    window.__larmahToast = setTimeout(() => (t.style.display = "none"), ms);
  };

  // WhatsApp
  LARMAH.buildMessage = (title, fields = {}) => {
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

  LARMAH.openWhatsApp = (message) => {
    const url = "https://wa.me/" + LARMAH.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(String(message || ""));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Supabase
  LARMAH.sb = null;
  LARMAH.initSupabase = async () => {
    if (!window.supabase) return null;
    if (LARMAH.sb) return LARMAH.sb;
    LARMAH.sb = window.supabase.createClient(LARMAH.SUPABASE_URL, LARMAH.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    try { LARMAH.sb.auth.onAuthStateChange(() => LARMAH.renderAuthPill()); } catch (_) {}
    return LARMAH.sb;
  };

  LARMAH.getSession = async () => {
    const sb = await LARMAH.initSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  };

  LARMAH.signOut = async () => {
    const sb = await LARMAH.initSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    LARMAH.toast("Signed out");
    setTimeout(() => (location.href = "index.html"), 600);
  };

  LARMAH.renderAuthPill = async () => {
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

  // Data helpers (used by pages)
  LARMAH.fetchCatalog = async (category) => {
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

  LARMAH.submitRequest = async (payload) => {
    const sb = await LARMAH.initSupabase();
    if (!sb) return { ok:false, error:"Supabase not configured" };

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

    if (error && /column "user_id".*does not exist/i.test(error.message)) {
      const record2 = { ...record }; delete record2.user_id;
      const r2 = await sb.from("requests").insert([record2]);
      error = r2.error;
    }

    if (error) { console.error(error); return { ok:false, error:error.message }; }
    return { ok:true };
  };

  // Insights
  LARMAH.fetchInsights = async (limit = 12) => {
    const sb = await LARMAH.initSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from("insights_posts")
      .select("id,title,body,pinned,created_at")
      .order("pinned", { ascending:false })
      .order("created_at", { ascending:false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
  };

  LARMAH.renderInsights = async (mountId) => {
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

  LARMAH.subscribeInsights = async (mountId) => {
    const sb = await LARMAH.initSupabase();
    if (!sb) return;
    if (LARMAH.__insightsChan) return;

    LARMAH.__insightsChan = sb
      .channel("insights_posts_changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"insights_posts" }, async () => {
        await LARMAH.renderInsights(mountId);
      })
      .subscribe();
  };

  // Exchange rates
  LARMAH.fetchExchangeRates = async () => {
    const sb = await LARMAH.initSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from("exchange_rates")
      .select("code,name,buy_ngn,sell_ngn,fee_rate,min_amount,max_amount,updated_at")
      .order("code", { ascending:true });
    if (error) { console.error(error); return []; }
    return data || [];
  };

  LARMAH.subscribeExchangeRates = async (onChange) => {
    const sb = await LARMAH.initSupabase();
    if (!sb) return;
    if (LARMAH.__exchangeChan) return;

    LARMAH.__exchangeChan = sb
      .channel("exchange_rates_changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"exchange_rates" }, () => {
        if (typeof onChange === "function") onChange();
      })
      .subscribe();
  };

  // Active nav (desktop)
  LARMAH.setActiveNav = () => {
    const links = Array.from(document.querySelectorAll(".nav-link"));
    if (!links.length) return;
    const page = (document.body.getAttribute("data-page") || "").trim();
    links.forEach(a => a.classList.toggle("active", (a.dataset?.link || "") === page));
  };

  // ==========================
  // MOBILE SHEET MENU (CLOSE ONLY WITH X)
  // ==========================
  function isMobile(){
    return window.matchMedia && window.matchMedia("(max-width: 980px)").matches;
  }

  function ensureSheet(){
    if (document.getElementById("mobileNavOverlay")) return;

    const nav = document.getElementById("nav");
    const linkEls = nav ? Array.from(nav.querySelectorAll("a.nav-link")) : [];
    const uniq = new Map();
    linkEls.forEach(a => {
      const href = (a.getAttribute("href") || "").trim();
      const text = (a.textContent || "").trim();
      if (!href || href.startsWith("#")) return;
      if (!uniq.has(href)) uniq.set(href, { href, text, dataLink: a.dataset?.link || "" });
    });

    const logo = document.querySelector(".brand img");
    const logoSrc = logo ? logo.getAttribute("src") : "assets/images/larmah-header.jpeg";

    const overlay = document.createElement("div");
    overlay.id = "mobileNavOverlay";
    overlay.innerHTML = `
      <div class="msheet" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="msheet-head">
          <div class="msheet-brand">
            <img src="${logoSrc}" alt="Larmah Enterprise">
          </div>
          <button class="msheet-close" type="button" aria-label="Close menu">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="msheet-body">
          <div class="msheet-links">
            ${Array.from(uniq.values()).map(item => `
              <a class="msheet-link" href="${item.href}" data-link="${item.dataLink}">
                <span>${LARMAH.escapeHtml(item.text)}</span>
                <i class="fa-solid fa-chevron-right" style="opacity:.55"></i>
              </a>
            `).join("")}
          </div>

          <div class="msheet-footer">
            <div class="msheet-hint">Menu closes only by tapping the X.</div>
            <a class="btn solid" href="premium.html"><i class="fa-solid fa-star"></i> Premium</a>
            <button class="btn" type="button" data-whatsapp>
              <i class="fa-brands fa-whatsapp"></i> WhatsApp Support
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // CLOSE ONLY WITH X
    overlay.querySelector(".msheet-close").addEventListener("click", () => LARMAH.closeMenu());

    // Links do NOT auto-close (since you requested close only with X).
    // But you can enable auto-close by uncommenting:
    // overlay.querySelectorAll(".msheet-link").forEach(a => a.addEventListener("click", () => LARMAH.closeMenu()));

    // WhatsApp button
    const wa = overlay.querySelector("[data-whatsapp]");
    wa && wa.addEventListener("click", () => {
      LARMAH.openWhatsApp(LARMAH.buildMessage("Quick Help", { Name:"", Phone:"", Message:"Hello Larmah, I need help." }));
    });
  }

  LARMAH.openMenu = () => {
    if (!isMobile()) return;
    ensureSheet();
    const overlay = document.getElementById("mobileNavOverlay");
    if (!overlay) return;

    overlay.style.display = "block";
    overlay.classList.add("active");
    document.body.classList.add("nav-open");

    // set active in sheet
    const page = (document.body.getAttribute("data-page") || "").trim();
    overlay.querySelectorAll(".msheet-link").forEach(a => {
      a.classList.toggle("active", (a.getAttribute("data-link") || "") === page);
    });

    // focus close
    const closeBtn = overlay.querySelector(".msheet-close");
    closeBtn && closeBtn.focus();
  };

  LARMAH.closeMenu = () => {
    const overlay = document.getElementById("mobileNavOverlay");
    if (overlay){
      overlay.classList.remove("active");
      overlay.style.display = "none";
    }
    document.body.classList.remove("nav-open");
  };

  LARMAH.toggleMenu = () => {
    if (!isMobile()) return;
    ensureSheet();
    const overlay = document.getElementById("mobileNavOverlay");
    if (!overlay) return;
    if (overlay.classList.contains("active")) LARMAH.closeMenu();
    else LARMAH.openMenu();
  };

  // Boot
  document.addEventListener("DOMContentLoaded", async () => {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    LARMAH.setActiveNav();
    await LARMAH.initSupabase();
    await LARMAH.renderAuthPill();

    // If you want ESC to close, uncomment (currently not requested):
    // document.addEventListener("keydown", (e) => { if (e.key === "Escape") LARMAH.closeMenu(); });

    window.addEventListener("resize", () => {
      if (!isMobile()) LARMAH.closeMenu();
    });
  });
})();
