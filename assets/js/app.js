
// CONFIGURATION

SUPABASE_URL = "https://mskbumvopqnrhddfycfd.supabase.co";


SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";


// Initialize Client
// We check if the SDK is loaded to prevent errors if CDN fails
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!supabase) {
  console.error("Supabase SDK not loaded. Check CDN links in HTML head.");
}

// ==========================================
// 2. GLOBAL APP CONTROLLER
// ==========================================
const LARMAH = {
  user: null,
  profile: null,

  // --- UI UTILITIES ---
  
  /**
   * Displays a pop-up toast notification
   * @param {string} msg - Message to display
   * @param {string} type - 'success' | 'error' | 'info'
   */
  toast: (msg, type = 'info') => {
    const t = document.getElementById('toast');
    if (!t) return;
    
    // Reset classes and set content
    t.className = "toast show";
    t.textContent = msg;
    
    // Style based on type
    if (type === 'error') {
      t.style.borderLeft = '4px solid #ff5a67'; // Red
      t.style.color = '#ff5a67';
    } else if (type === 'success') {
      t.style.borderLeft = '4px solid #00d981'; // Green
      t.style.color = '#00d981';
    } else {
      t.style.borderLeft = '4px solid #D4AF37'; // Gold/Info
      t.style.color = '#fff';
    }

    t.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => { 
        t.style.display = 'none'; 
        t.style.opacity = '1'; 
      }, 300);
    }, 3500);
  },

  /**
   * Sanitizes strings to prevent XSS attacks when rendering HTML
   */
  escapeHtml: (str) => {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  },

  /**
   * Toggles the Mobile Navigation Sheet
   */
  toggleMenu: () => {
    document.body.classList.toggle('nav-open');
    const overlay = document.getElementById('mobileNavOverlay');
    if (overlay) {
      overlay.classList.toggle('active');
    }
  },

  // --- AUTHENTICATION LOGIC ---

  /**
   * Run on page load. Checks if user is logged in and handles redirects.
   */
  async checkSession() {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    this.user = session?.user || null;

    const currentPage = document.body.getAttribute('data-page');

    // 1. If User is Logged In
    if (this.user) {
      // Redirect away from Auth page if already logged in
      if (currentPage === 'auth') {
        window.location.href = 'dashboard.html';
        return;
      }
      // Load extended profile data
      await this.loadProfile();
    } 
    // 2. If User is Logged Out
    else {
      // Protect Dashboard and Admin pages
      if (['dashboard'].includes(currentPage)) {
        window.location.href = 'auth.html';
      }
      // Admin page has its own internal gate script, so we don't redirect here
    }
  },

  /**
   * Fetch extra user details from 'profiles' table
   */
  async loadProfile() {
    if (!this.user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.user.id)
        .single();

      if (data) {
        this.profile = data;
        // Update UI elements if they exist
        const nameDisplay = document.getElementById('user_name_display');
        const idDisplay = document.getElementById('user_id_display');
        
        if (nameDisplay) nameDisplay.textContent = data.full_name || 'User';
        if (idDisplay) idDisplay.textContent = this.user.id.substring(0, 8).toUpperCase();
      }
    } catch (e) {
      console.warn("Profile load error:", e);
    }
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = 'dashboard.html';
  },

  async signup(email, password, fullName) {
    // 1. Sign up auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } } // Stored in auth metadata
    });
    
    if (error) throw error;

    // 2. Create profile entry (if your Supabase triggers aren't set up)
    if (data.user) {
      await supabase.from('profiles').insert([{ 
        id: data.user.id, 
        email: email, 
        full_name: fullName 
      }]);
    }

    this.toast("Account created! Check email for verification.", "success");
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = 'auth.html';
  },

  // --- DATABASE & CATALOG LOGIC ---

  /**
   * Fetches active listings for Real Estate or Logistics
   */
  async fetchCatalog(category) {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('category', category)
        .eq('status', 'active') // Only show active items to public
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Catalog Error:", e);
      return [];
    }
  },

  // --- WHATSAPP COMMUNICATION ENGINE ---

  /**
   * Opens WhatsApp with a pre-filled message
   */
  openWhatsApp(text) {
    const phone = "2347063080605"; // Your business number
    // Detect mobile vs desktop for better UX
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    
    const url = `${baseUrl}?phone=${phone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  /**
   * Constructs a formatted message string from an object
   */
  buildMessage(header, fields) {
    let msg = `*LARMAH | ${header}*\n------------------\n`;
    
    for (const [key, val] of Object.entries(fields)) {
      if (val && String(val).trim() !== "") {
        msg += `*${key}:* ${val}\n`;
      }
    }
    
    // Add timestamp/footer
    msg += `\n_Ref: ${new Date().getTime().toString(36).toUpperCase()}_`;
    msg += `\n_Sent via heylarmah.tech_`;
    return msg;
  },

  // --- IMAGE GALLERY LOGIC ---

  /**
   * Ensures listing images are always returned as an array
   */
  normalizeImageUrls(item) {
    if (!item) return [];
    // If it's a JSON array column in DB
    if (Array.isArray(item.images) && item.images.length > 0) return item.images;
    // If it's a simple text column
    if (item.image_url && typeof item.image_url === 'string') return [item.image_url];
    // Fallback based on logic type
    return [];
  },

  /**
   * Generates HTML for the card gallery (supports swiping logic)
   */
  galleryHtml(urls, title, idPrefix) {
    if (!urls || !urls.length) return '';
    
    const isMulti = urls.length > 1;
    
    // Generate img tags
    const imagesHtml = urls.map((u, i) => `
      <img src="${this.escapeHtml(u)}" 
           class="gallery-img ${i === 0 ? 'active' : ''}" 
           style="${i === 0 ? 'display:block' : 'display:none'}" 
           alt="${this.escapeHtml(title)}" 
           loading="lazy">
    `).join('');

    // Generate dots if multi
    const dotsHtml = isMulti ? `
      <div class="gallery-dots">
        ${urls.map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
      </div>
      <div class="gallery-hint">Tap to view</div>
    ` : '';

    return `
      <div class="gallery ${isMulti ? 'multi' : ''}" id="gal-${idPrefix}">
        ${imagesHtml}
        ${dotsHtml}
      </div>
    `;
  },

  /**
   * Binds click events to galleries to enable "Next Image" functionality
   */
  bindGalleries(container) {
    if (!container) return;
    const gals = container.querySelectorAll('.gallery.multi');
    
    gals.forEach(g => {
      let idx = 0;
      const imgs = g.querySelectorAll('.gallery-img');
      const dots = g.querySelectorAll('.gallery-dot');
      
      // Tap to cycle images
      g.addEventListener('click', (e) => {
        e.preventDefault(); 
        e.stopPropagation(); // Prevent clicking the parent card link
        
        // Hide current
        imgs[idx].style.display = 'none';
        if(dots[idx]) dots[idx].classList.remove('active');
        
        // Increment
        idx = (idx + 1) % imgs.length;
        
        // Show next
        imgs[idx].style.display = 'block';
        if(dots[idx]) dots[idx].classList.add('active');
      });
    });
  },
  
  // --- SUBMISSIONS (Optional DB Logging) ---
  
  async submitRequest(payload) {
    if(!supabase || !this.user) return { ok: false };
    
    // If logged in, we can log the request to a 'requests' table
    try {
        const { error } = await supabase.from('requests').insert([{
            user_id: this.user.id,
            category: payload.category,
            details: payload.details,
            status: 'pending'
        }]);
        return { ok: !error };
    } catch(e) {
        return { ok: false };
    }
  }
};

// ==========================================
// 3. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Check auth state immediately
  LARMAH.checkSession();

  // Close mobile nav when clicking overlay
  const overlay = document.getElementById('mobileNavOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        LARMAH.toggleMenu();
      }
    });
  }
});
