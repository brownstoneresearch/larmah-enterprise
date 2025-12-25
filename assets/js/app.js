/**
 * LARMAH ENTERPRISE | Core Application Controller
 * Domain: https://heylarmah.tech/
 * Powered by Supabase & WhatsApp-First Workflow
 *
 * IMPORTANT:
 * - This file attaches LARMAH to window so inline onclick="" works.
 * - It also exposes a global Supabase CLIENT as window.supabaseClient
 *   (and keeps the Supabase library at window.__supabaseLib).
 */

/* ----------------------------
   1) SUPABASE CONFIG
----------------------------- */
window.SUPABASE_URL = "https://mskbumvopqnrhddfycfd.supabase.co";
window.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

// Preserve the library global (from CDN) before we create the client.
window.__supabaseLib = window.supabase;

// Create (or re-create) a single global client.
function ensureSupabaseClient() {
  if (!window.__supabaseLib || typeof window.__supabaseLib.createClient !== "function") {
    console.error("Supabase library not found. Ensure the CDN script loads before app.js.");
    return null;
  }
  if (!window.supabaseClient) {
    window.supabaseClient = window.__supabaseLib.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  }
  return window.supabaseClient;
}

ensureSupabaseClient();

/* ----------------------------
   2) LARMAH ENGINE
----------------------------- */
window.LARMAH = {
  user: null,
  profile: null,

  // WhatsApp business support line (no +)
  businessPhone: "2347063080605",

  // Used across pages for stable, traceable refs
  ref(prefix = "WEB") {
    return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  },

  // Supabase client getter
  sb() {
    return ensureSupabaseClient();
  },

  /* ----------------------------
     UI UTILITIES
  ----------------------------- */
  toast(msg, type = "info") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    window.clearTimeout(this.__toastTimer);
    this.__toastTimer = window.setTimeout(() => {
      t.className = "toast";
    }, 4000);
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
  },

  // Basic phone normalizer for WhatsApp
  normalizePhone(p) {
    const raw = String(p || "").trim();
    return raw.replace(/[^\d]/g, "");
  },

  openWhatsApp(text) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const url = `${baseUrl}?phone=${this.businessPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  },

  buildMessage(header, fields = {}, ref = null) {
    const rid = ref || this.ref("WEB");
    let msg = `*LARMAH ENTERPRISE | ${String(header || "").toUpperCase()}*\n`;
    msg += `------------------------------\n`;
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        msg += `*${k}:* ${v}\n`;
      }
    });
    msg += `------------------------------\n`;
    msg += `_Sent via heylarmah.tech_\n`;
    msg += `_Ref: ${rid}_`;
    return msg;
  },

  toggleMenu() {
    document.body.classList.toggle("nav-open");
    const overlay = document.getElementById("mobileNavOverlay");
    if (overlay) overlay.classList.toggle("active");
  },

  /* ----------------------------
     AUTH
  ----------------------------- */
  async checkSession() {
    const sb = this.sb();
    if (!sb) return;

    const { data, error } = await sb.auth.getSession();
    if (error) console.warn("Session check error:", error.message);

    this.user = data?.session?.user || null;

    if (this.user) {
      try {
        const { data: prof } = await sb
          .from("profiles")
          .select("*")
          .eq("id", this.user.id)
          .single();
        this.profile = prof || null;
      } catch (e) {
        // profiles table may not exist yet; ignore gracefully
        this.profile = null;
      }
    } else {
      this.profile = null;
    }

    this.applyAuthVisibility();
  },

  applyAuthVisibility() {
    const isAuth = !!this.user;
    document.body.classList.toggle("is-auth", isAuth);

    // Elements that should appear only when logged in
    document.querySelectorAll("[data-auth='show']").forEach((el) => {
      el.style.display = isAuth ? "" : "none";
    });

    // Elements that should appear only when logged out
    document.querySelectorAll("[data-auth='hide']").forEach((el) => {
      el.style.display = isAuth ? "none" : "";
    });
  },

  async login(email, password) {
    const sb = this.sb();
    if (!sb) throw new Error("Supabase not ready.");

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await this.checkSession();
    // redirect to dashboard if present
    window.location.href = "dashboard.html";
    return data;
  },

  async signup(email, password, fullName) {
    const sb = this.sb();
    if (!sb) throw new Error("Supabase not ready.");

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || "" },
      },
    });
    if (error) throw error;

    // Create profile row (optional)
    try {
      if (data?.user?.id) {
        await sb.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName || "",
          created_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      // if table doesn't exist, ignore
    }

    this.toast("Account created. Please sign in.", "success");
    return data;
  },

  async signOut() {
    const sb = this.sb();
    if (!sb) return;
    await sb.auth.signOut();
    this.user = null;
    this.profile = null;
    this.applyAuthVisibility();
    window.location.href = "auth.html";
  },

  /* ----------------------------
     REQUEST LOGGING + WHATSAPP
  ----------------------------- */
  async logRequest(category, payload = {}, status = "new") {
    const sb = this.sb();
    if (!sb) return { ok: false, error: "Supabase not ready" };

    // Expect a 'requests' table:
    // id (uuid or int), created_at, category (text), payload (jsonb), status (text), user_id (uuid nullable)
    const row = {
      category: category || "general",
      payload,
      status,
      user_id: this.user?.id || null,
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await sb.from("requests").insert([row]);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Logging failed" };
    }
  },

  /**
   * Submit request:
   * - Logs to Supabase (if table exists)
   * - Opens WhatsApp support with a formatted message
   */
  async submitRequest({ header, category, fields, refPrefix = "WEB", openWhatsApp = true }) {
    const ref = this.ref(refPrefix);

    // Log to DB first (best-effort)
    const logRes = await this.logRequest(category, { ref, header, fields });

    if (!logRes.ok) {
      console.warn("Request logging failed:", logRes.error);
      // still continue to WhatsApp
    }

    const msg = this.buildMessage(header, { ...fields, Ref: ref }, ref);

    if (openWhatsApp) this.openWhatsApp(msg);
    return { ok: true, ref };
  },

  /* ----------------------------
     GALLERY HELPERS (Fixes missing funcs)
  ----------------------------- */
  normalizeImageUrls(item) {
    const out = [];
    if (!item) return out;

    // support: item.image_urls (array) OR item.images (array) OR item.image_url (string)
    const arr =
      (Array.isArray(item.image_urls) && item.image_urls) ||
      (Array.isArray(item.images) && item.images) ||
      null;

    if (arr) {
      arr.forEach((u) => {
        const s = String(u || "").trim();
        if (s) out.push(s);
      });
    } else {
      const single = String(item.image_url || item.image || "").trim();
      if (single) {
        // allow comma-separated strings
        single.split(",").forEach((u) => {
          const s = String(u || "").trim();
          if (s) out.push(s);
        });
      }
    }

    // final sanitize (no JS urls)
    return out.filter((u) => !/^javascript:/i.test(u));
  },

  galleryHtml(urls, title = "", gid = "") {
    if (!urls || !urls.length) return "";
    const safeTitle = this.escapeHtml(title);
    const id = this.escapeHtml(gid || `g-${Math.random().toString(36).slice(2, 8)}`);
    const first = this.escapeHtml(urls[0]);

    // Minimal gallery: main image + small count badge; click opens lightbox
    return `
      <div class="lg-gallery" data-gallery-id="${id}" data-gallery-title="${safeTitle}" data-gallery-urls="${this.escapeHtml(
      JSON.stringify(urls)
    )}">
        <div style="position:relative;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
          <img src="${first}" alt="${safeTitle}" style="width:100%;height:200px;object-fit:cover;display:block"
               loading="lazy" onerror="this.src='assets/images/larmah-header.jpeg'">
          ${
            urls.length > 1
              ? `<div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
                   padding:6px 10px;border-radius:999px;font-size:.75rem;border:1px solid rgba(255,255,255,0.1);">
                   <i class="fa-regular fa-images"></i> ${urls.length}
                 </div>`
              : ""
          }
        </div>
      </div>
    `;
  },

  bindGalleries(root = document) {
    root.querySelectorAll(".lg-gallery").forEach((node) => {
      if (node.__bound) return;
      node.__bound = true;

      node.addEventListener("click", () => {
        let urls = [];
        try {
          urls = JSON.parse(node.getAttribute("data-gallery-urls") || "[]");
        } catch {
          urls = [];
        }
        const title = node.getAttribute("data-gallery-title") || "";
        if (!urls.length) return;
        this.lightboxOpen(urls, 0, title);
      });
    });
  },

  lightboxOpen(urls, start = 0, title = "") {
    // Create once
    let modal = document.getElementById("lgLightbox");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "lgLightbox";
      modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;";
      modal.innerHTML = `
        <div style="max-width:960px;width:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:12px;">
            <div id="lgLightboxTitle" style="color:#fff;font-weight:800;opacity:.9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
            <button id="lgLightboxClose" class="btn small" style="border-radius:999px"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div style="position:relative;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);background:#000;">
            <img id="lgLightboxImg" src="" alt="" style="width:100%;max-height:75vh;object-fit:contain;display:block;">
            <button id="lgLightboxPrev" class="btn small" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);border-radius:999px"><i class="fa-solid fa-chevron-left"></i></button>
            <button id="lgLightboxNext" class="btn small" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);border-radius:999px"><i class="fa-solid fa-chevron-right"></i></button>
            <div id="lgLightboxCount" style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
                 padding:6px 10px;border-radius:999px;font-size:.8rem;color:#fff;border:1px solid rgba(255,255,255,0.12);"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => {
        modal.style.display = "none";
        document.body.style.overflow = "";
      };

      modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
      });
      modal.querySelector("#lgLightboxClose").addEventListener("click", close);

      // ESC close
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") close();
      });
    }

    let idx = Math.max(0, Math.min(start, urls.length - 1));

    const img = modal.querySelector("#lgLightboxImg");
    const titleEl = modal.querySelector("#lgLightboxTitle");
    const countEl = modal.querySelector("#lgLightboxCount");

    const render = () => {
      img.src = urls[idx];
      img.alt = title || "Gallery image";
      titleEl.textContent = title || "Gallery";
      countEl.textContent = `${idx + 1} / ${urls.length}`;
    };

    modal.querySelector("#lgLightboxPrev").onclick = () => {
      idx = (idx - 1 + urls.length) % urls.length;
      render();
    };
    modal.querySelector("#lgLightboxNext").onclick = () => {
      idx = (idx + 1) % urls.length;
      render();
    };

    render();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  },

  /* ----------------------------
     SHARED LAYOUT (Header/Footer/Mobile Menu)
  ----------------------------- */
  shouldMountLayout() {
    const page = (document.body.getAttribute("data-page") || "").toLowerCase();
    // auth/admin have custom layouts
    if (page === "auth" || page === "admin") return false;
    if (document.body.hasAttribute("data-nolayout")) return false;
    return true;
  },

  mountLayout() {
    if (!this.shouldMountLayout()) return;

    const page = (document.body.getAttribute("data-page") || "").toLowerCase();

    // Mobile overlay
    if (!document.getElementById("mobileNavOverlay")) {
      const overlay = document.createElement("div");
      overlay.id = "mobileNavOverlay";
      overlay.innerHTML = `
        <div class="msheet">
          <div class="msheet-head">
            <div class="msheet-brand">
              <img src="assets/images/larmah-header.jpeg" alt="Larmah Logo">
            </div>
            <button class="msheet-close" onclick="LARMAH.toggleMenu()" aria-label="Close Menu">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="msheet-body">
            <div class="msheet-links">
              <a href="real-estate.html" class="msheet-link ${page === "real-estate" ? "active" : ""}">
                <span><i class="fa-solid fa-house" style="width:24px;color:var(--brand)"></i> Real Estate</span>
                <i class="fa-solid ${page === "real-estate" ? "fa-check" : "fa-chevron-right"}" style="font-size:12px;opacity:.7"></i>
              </a>
              <a href="logistics.html" class="msheet-link ${page === "logistics" ? "active" : ""}">
                <span><i class="fa-solid fa-truck" style="width:24px;color:var(--brand)"></i> Logistics</span>
                <i class="fa-solid ${page === "logistics" ? "fa-check" : "fa-chevron-right"}" style="font-size:12px;opacity:.7"></i>
              </a>
              <a href="insights.html" class="msheet-link ${page === "insights" ? "active" : ""}">
                <span><i class="fa-solid fa-chart-line" style="width:24px;color:var(--brand)"></i> Insights</span>
                <i class="fa-solid ${page === "insights" ? "fa-check" : "fa-chevron-right"}" style="font-size:12px;opacity:.7"></i>
              </a>
              <a href="exchange.html" class="msheet-link ${page === "exchange" ? "active" : ""}">
                <span><i class="fa-solid fa-money-bill-transfer" style="width:24px;color:var(--brand)"></i> Exchange</span>
                <i class="fa-solid ${page === "exchange" ? "fa-check" : "fa-chevron-right"}" style="font-size:12px;opacity:.7"></i>
              </a>
            </div>
            <div class="msheet-footer">
              <div class="msheet-hint">Menu</div>
              <a href="dashboard.html" class="msheet-link" data-auth="show"
                 style="color:var(--accent);border-color:rgba(212,175,55,.2);display:none">
                <span><i class="fa-solid fa-user-shield" style="width:24px"></i> Dashboard</span>
              </a>
              <a href="auth.html" class="msheet-link" data-auth="hide"
                 style="color:var(--muted);border-color:rgba(255,255,255,.08)">
                <span><i class="fa-solid fa-right-to-bracket" style="width:24px"></i> Sign In</span>
              </a>
            </div>
          </div>
        </div>
      `;
      document.body.prepend(overlay);

      // close on overlay click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.toggleMenu();
      });
    }

    // Header
    let header = document.querySelector("header");
    if (!header) {
      header = document.createElement("header");
      document.body.prepend(header);
    }

    if (!header.__mounted) {
      header.__mounted = true;
      header.innerHTML = `
        <div class="container header-inner">
          <a class="brand" href="index.html" aria-label="Larmah Home">
            <img src="assets/images/larmah-header.jpeg" alt="Larmah Enterprise" />
          </a>

          <button class="menu-btn" onclick="LARMAH.toggleMenu()" aria-label="Open menu">
            <i class="fa-solid fa-bars"></i>
          </button>

          <nav id="nav" aria-label="Primary navigation">
            <ul>
              <li><a class="nav-link ${page === "real-estate" ? "active" : ""}" href="real-estate.html">Real Estate</a></li>
              <li><a class="nav-link ${page === "logistics" ? "active" : ""}" href="logistics.html">Logistics</a></li>
              <li><a class="nav-link ${page === "insights" ? "active" : ""}" href="insights.html">Insights</a></li>
              <li><a class="nav-link ${page === "exchange" ? "active" : ""}" href="exchange.html">Exchange</a></li>
            </ul>
          </nav>

          <div class="header-actions" style="margin-left:auto;display:none" data-auth="show">
            <a href="dashboard.html" class="pill primary">Dashboard</a>
          </div>
          <div class="header-actions" style="margin-left:auto;display:none" data-auth="hide">
            <a href="auth.html" class="pill">Sign In</a>
          </div>
        </div>
      `;
    }

    // Footer
    let footer = document.querySelector("footer");
    if (!footer) {
      footer = document.createElement("footer");
      document.body.appendChild(footer);
    }

    if (!footer.__mounted) {
      footer.__mounted = true;
      footer.innerHTML = `
        <div class="container">
          <div class="footer-grid">
            <div>
              <div class="brandline">
                <img src="assets/images/larmah-header.jpeg" alt="Larmah Enterprise" />
                <div>
                  <div style="font-weight:950">Larmah Enterprise</div>
                  <div class="small">Real Estate • Logistics • Insights • Exchange</div>
                </div>
              </div>

              <div class="small" style="margin-top:8px">
                Trust-first commerce for Nigeria — verified listings, trackable enquiries, and WhatsApp-first support.
              </div>

              <div class="social-row" aria-label="Social links">
                <a class="social-btn" href="https://instagram.com/hey_larmah" aria-label="Instagram" title="Instagram"><i class="fa-brands fa-instagram"></i></a>
                <a class="social-btn" href="https://x.com/heylarmah_tech" aria-label="X" title="X (Twitter)"><i class="fa-brands fa-x-twitter"></i></a>
                <a class="social-btn" href="https://t.me/heylarmah_tech" aria-label="Telegram" title="Telegram"><i class="fa-brands fa-telegram"></i></a>
                <a class="social-btn" href="https://youtube.com/@heylarmah" aria-label="YouTube" title="YouTube"><i class="fa-brands fa-youtube"></i></a>
              </div>
            </div>

            <div>
              <b>Navigation</b>
              <div class="small" style="margin-top:10px"><a href="real-estate.html">Real Estate</a></div>
              <div class="small"><a href="logistics.html">Logistics</a></div>
              <div class="small"><a href="insights.html">Insights</a></div>
              <div class="small"><a href="exchange.html">Exchange</a></div>
              <div class="small"><a href="premium.html">Premium</a></div>
            </div>

            <div>
              <b>Contact</b>
              <div class="small" style="margin-top:10px"><i class="fa-brands fa-whatsapp"></i> +234 706 308 0605</div>
              <div class="small"><i class="fa-regular fa-envelope"></i> business@heylarmah.tech</div>
              <div class="small"><i class="fa-solid fa-location-dot"></i> Lagos, Nigeria</div>

              <div class="actions" style="margin-top:12px">
                <button class="btn small" onclick="LARMAH.openWhatsApp(LARMAH.buildMessage('Support', { Name:'', Phone:'', Message:'Hello Larmah, I need help.' }))">
                  <i class="fa-brands fa-whatsapp"></i> WhatsApp Support
                </button>
              </div>

              <div class="small" style="margin-top:10px;opacity:.65">
                <a href="auth.html">Staff Sign-in</a> • <a href="admin.html">Admin</a>
              </div>
            </div>
          </div>

          <div class="small">© <span id="year"></span> Larmah Enterprise. All rights reserved.</div>
        </div>
      `;
    }

    // Year
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  },
};

/* ----------------------------
   3) GLOBAL INIT
----------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  // Mount shared header/footer/mobile menu (except admin/auth)
  window.LARMAH.mountLayout();

  // Session check (also toggles dashboard buttons properly)
  await window.LARMAH.checkSession();

  // Bind galleries if any were rendered
  window.LARMAH.bindGalleries(document);
});
