/**
 * LARMAH ENTERPRISE | Unified Application Controller
 * Combines Core Functionality with Admin Command Center Sync
 */

// ==========================================
// 1. CONFIGURATION & INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://mskbumvopqnrhddfycfd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4";

// Business Configuration
const BUSINESS_CONFIG = {
    phone: "2347063080605",
    whatsAppUrl: (text) => `https://wa.me/${this.phone}?text=${encodeURIComponent(text)}`,
    brandName: "LARMAH"
};

// Initialize Supabase Client
let supabase;
try {
    supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    if (!supabase) console.warn("Supabase SDK not loaded. Some features may be limited.");
} catch (e) {
    console.error("Supabase initialization error:", e);
}

// ==========================================
// 2. GLOBAL APP CONTROLLER
// ==========================================
const LARMAH = {
    user: null,
    profile: null,
    businessPhone: BUSINESS_CONFIG.phone,

    // ============ UI UTILITIES ============
    
    /**
     * Displays toast notification with type-based styling
     * @param {string} msg - Message to display
     * @param {string} type - 'success' | 'error' | 'info' (default)
     */
    toast: function(msg, type = 'info') {
        const t = document.getElementById('toast');
        if (!t) return;
        
        // Reset and apply type-specific styling
        t.className = `toast show ${type}`;
        t.textContent = msg;
        
        // Auto-hide with smooth transition
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => { 
                t.className = "toast";
                t.style.opacity = '1';
            }, 300);
        }, 4000);
    },

    /**
     * Toggles mobile navigation menu
     */
    toggleMenu: function() {
        const overlay = document.getElementById('mobileNavOverlay');
        document.body.classList.toggle('nav-open');
        if (overlay) overlay.classList.toggle('active');
    },

    /**
     * Sanitizes strings to prevent XSS attacks
     */
    escapeHtml: function(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    },

    // ============ AUTHENTICATION ============
    
    /**
     * Checks authentication state and handles page redirections
     */
    async checkSession() {
        if (!supabase) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            this.user = session?.user || null;
            const currentPage = document.body.getAttribute('data-page');

            // Handle logged-in state
            if (this.user) {
                // Redirect from auth page if already logged in
                if (currentPage === 'auth') {
                    window.location.href = 'dashboard.html';
                    return;
                }
                // Load extended profile
                await this.loadProfile();
                // Show dashboard button
                const authKey = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`;
                if (localStorage.getItem(authKey)) {
                    const actions = document.querySelector('.header-actions');
                    if (actions) actions.style.display = 'flex';
                }
            } 
            // Handle logged-out state
            else {
                // Protect dashboard pages
                if (['dashboard'].includes(currentPage)) {
                    window.location.href = 'auth.html';
                }
            }
        } catch (error) {
            console.error("Session check error:", error);
        }
    },

    /**
     * Loads user profile from database
     */
    async loadProfile() {
        if (!this.user || !supabase) return;
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (data) {
                this.profile = data;
                // Update UI if elements exist
                const nameDisplay = document.getElementById('user_name_display');
                const idDisplay = document.getElementById('user_id_display');
                
                if (nameDisplay) nameDisplay.textContent = data.full_name || 'User';
                if (idDisplay) idDisplay.textContent = this.user.id.substring(0, 8).toUpperCase();
            }
        } catch (e) {
            console.warn("Profile load error:", e);
        }
    },

    /**
     * Login with email and password
     */
    async login(email, password) {
        if (!supabase) throw new Error("Supabase not initialized");
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        this.toast("Login successful!", "success");
        setTimeout(() => window.location.href = 'dashboard.html', 500);
    },

    /**
     * Signup with email, password, and name
     */
    async signup(email, password, fullName) {
        if (!supabase) throw new Error("Supabase not initialized");
        
        // Create auth user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        
        if (error) throw error;

        // Create profile entry
        if (data.user) {
            await supabase.from('profiles').insert([{ 
                id: data.user.id, 
                email: email, 
                full_name: fullName 
            }]);
        }

        this.toast("Account created! Check email for verification.", "success");
    },

    /**
     * Logout current user
     */
    async logout() {
        if (!supabase) return;
        
        await supabase.auth.signOut();
        this.toast("Logged out successfully", "info");
        setTimeout(() => window.location.href = 'auth.html', 500);
    },

    // ============ WHATSAPP ENGINE ============
    
    /**
     * Opens WhatsApp with pre-filled message
     * @param {string} text - Message to send
     */
    openWhatsApp: function(text) {
        // Detect device for optimal WhatsApp URL
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
        const url = `${baseUrl}?phone=${this.businessPhone}&text=${encodeURIComponent(text)}`;
        
        window.open(url, '_blank');
    },

    /**
     * Constructs formatted WhatsApp message
     * @param {string} header - Message header/title
     * @param {Object} fields - Key-value pairs for message body
     * @returns {string} Formatted message
     */
    buildMessage: function(header, fields) {
        let msg = `*${BUSINESS_CONFIG.brandName} | ${header.toUpperCase()}*\n`;
        msg += `────────────────────────────\n`;
        
        for (const [key, val] of Object.entries(fields)) {
            if (val && String(val).trim() !== "") {
                msg += `*${key}:* ${val}\n`;
            }
        }
        
        msg += `────────────────────────────\n`;
        msg += `_Ref: ${Math.random().toString(36).substr(2, 6).toUpperCase()}_\n`;
        msg += `_Sent via heylarmah.tech_`;
        
        return msg;
    },

    // ============ DATABASE OPERATIONS ============
    
    /**
     * Dual action: Logs to Supabase and opens WhatsApp
     * @param {string} category - Request category
     * @param {Object} details - Request details
     */
    async submitBooking(category, details) {
        this.toast("Processing request...", "info");

        // 1. Log to database for admin tracking
        if (supabase) {
            try {
                await supabase.from('requests').insert([{
                    category: category.toLowerCase().replace(" ", "-"),
                    name: details.Name || 'Guest',
                    phone: details.Phone || 'N/A',
                    message: Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(" | "),
                    status: 'new',
                    user_id: this.user?.id || null
                }]);
            } catch (e) { 
                console.warn("DB logging skipped:", e);
            }
        }

        // 2. Build and send WhatsApp message
        const msg = this.buildMessage(`${category} Booking`, details);
        this.openWhatsApp(msg);
        
        this.toast("Success! WhatsApp opened.", "success");
    },

    /**
     * Fetches active listings by category
     * @param {string} category - Category to filter by
     * @returns {Array} List of active listings
     */
    async fetchCatalog(category) {
        if (!supabase) return [];
        
        try {
            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('category', category)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Catalog fetch error:", error);
                return [];
            }
            return data || [];
        } catch (e) {
            console.error("Catalog operation error:", e);
            return [];
        }
    },

    // ============ IMAGE GALLERY ============
    
    /**
     * Normalizes image URLs from various formats to array
     * @param {Object} item - Item containing image data
     * @returns {Array} Array of image URLs
     */
    normalizeImageUrls: function(item) {
        const arr = [];
        
        // Handle single image URL
        if (item.image_url) arr.push(item.image_url);
        
        // Handle array of image URLs
        if (Array.isArray(item.image_urls)) {
            item.image_urls.forEach(u => {
                if (u && !arr.includes(u)) arr.push(u);
            });
        }
        
        // Handle 'images' array field
        if (Array.isArray(item.images)) {
            item.images.forEach(u => {
                if (u && !arr.includes(u)) arr.push(u);
            });
        }
        
        return arr.slice(0, 3); // Limit to first 3 images
    },

    /**
     * Generates HTML for image gallery with swipe functionality
     * @param {Array} urls - Array of image URLs
     * @param {string} title - Alt text for images
     * @param {string} idPrefix - Unique ID prefix for gallery
     * @returns {string} Gallery HTML
     */
    galleryHtml: function(urls, title, idPrefix) {
        if (!urls || !urls.length) return '';
        
        const isMulti = urls.length > 1;
        const galleryId = `gal-${idPrefix || Math.random().toString(36).substr(2, 9)}`;
        
        // Generate image tags
        const imagesHtml = urls.map((url, i) => `
            <img src="${this.escapeHtml(url)}" 
                 class="gallery-img ${i === 0 ? 'active' : ''}" 
                 style="${i === 0 ? 'display:block' : 'display:none'}" 
                 alt="${this.escapeHtml(title)}" 
                 loading="lazy">
        `).join('');
        
        // Generate navigation dots for multi-image galleries
        const dotsHtml = isMulti ? `
            <div class="gallery-dots">
                ${urls.map((_, i) => `
                    <div class="gallery-dot ${i === 0 ? 'active' : ''}" 
                         data-index="${i}"></div>
                `).join('')}
            </div>
            <div class="gallery-hint">Tap to view next</div>
        ` : '';
        
        return `
            <div class="gallery ${isMulti ? 'multi' : ''}" id="${galleryId}">
                ${imagesHtml}
                ${dotsHtml}
            </div>
        `;
    },

    /**
     * Binds interaction events to galleries
     * @param {HTMLElement} container - Container element containing galleries
     */
    bindGalleries: function(container) {
        if (!container) return;
        
        const galleries = container.querySelectorAll('.gallery.multi');
        
        galleries.forEach(gallery => {
            let currentIndex = 0;
            const images = gallery.querySelectorAll('.gallery-img');
            const dots = gallery.querySelectorAll('.gallery-dot');
            
            gallery.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Hide current image
                if (images[currentIndex]) {
                    images[currentIndex].style.display = 'none';
                }
                if (dots[currentIndex]) {
                    dots[currentIndex].classList.remove('active');
                }
                
                // Calculate next index
                currentIndex = (currentIndex + 1) % images.length;
                
                // Show next image
                if (images[currentIndex]) {
                    images[currentIndex].style.display = 'block';
                }
                if (dots[currentIndex]) {
                    dots[currentIndex].classList.add('active');
                }
            });
            
            // Optional: Add keyboard navigation
            gallery.setAttribute('tabindex', '0');
            gallery.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    gallery.click();
                }
            });
        });
    },

    // ============ GENERAL SUBMISSION ============
    
    /**
     * Generic submission handler with optional DB logging
     * @param {Object} payload - Submission data
     * @returns {Object} Result of submission
     */
    async submitRequest(payload) {
        if (!supabase || !this.user) {
            return { ok: false, message: "Authentication required" };
        }
        
        try {
            const { error } = await supabase.from('requests').insert([{
                user_id: this.user.id,
                category: payload.category,
                details: payload.details,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);
            
            return { ok: !error, error };
        } catch (e) {
            console.error("Submission error:", e);
            return { ok: false, error: e };
        }
    }
};

// ==========================================
// 3. INITIALIZATION & EVENT BINDING
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
    
    // Initialize authentication state
    LARMAH.checkSession();
    
    // Setup mobile navigation overlay
    const overlay = document.getElementById('mobileNavOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                LARMAH.toggleMenu();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
                LARMAH.toggleMenu();
            }
        });
    }
    
    // Add global click handler for gallery initialization
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-init-galleries]')) {
            LARMAH.bindGalleries(e.target.closest('[data-init-galleries]'));
        }
    });
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LARMAH, BUSINESS_CONFIG };
}
