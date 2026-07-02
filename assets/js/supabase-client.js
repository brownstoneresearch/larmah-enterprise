(function(){
  "use strict";
  const config = {
    supabaseUrl: "https://ipohjsdhakjbetyievmv.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwb2hqc2RoYWtqYmV0eWlldm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjUwMTYsImV4cCI6MjA5ODUwMTAxNn0.qdcQ4bFpUmvWJstWMGnfrFwY9DBBVEqBo0mV6mGxcz4",
    whatsappNumber: "2347063080605",
    adminEmail: "heylarmahtech@outlook.com",
    storageBucket: "larmah-media",
    socials: {
      instagram: "https://www.instagram.com/heylarmah_ltd/",
      x: "https://x.com/heylarmah_ltd",
      tiktok: "https://www.tiktok.com/@heylarmah_ltd"
    }
  };
  const STORAGE_KEY = "hey_larmah_supabase_session";
  function baseHeaders(token, contentType=true){
    const h = { "apikey": config.supabaseAnonKey, "Authorization": `Bearer ${token || config.supabaseAnonKey}` };
    if(contentType) h["Content-Type"] = "application/json";
    return h;
  }
  async function supabaseFetch(path, options){
    const url = `${config.supabaseUrl}${path}`;
    const opts = Object.assign({ method:"GET" }, options || {});
    const contentType = opts.contentType !== false;
    opts.headers = Object.assign({}, baseHeaders(opts.token, contentType), opts.headers || {});
    delete opts.token; delete opts.contentType;
    const response = await fetch(url, opts);
    const text = await response.text();
    let data = null;
    if(text){ try{ data = JSON.parse(text); }catch{ data = text; } }
    if(!response.ok){
      const message = (data && (data.message || data.error_description || data.error)) || `Supabase request failed with ${response.status}`;
      const err = new Error(message); err.status = response.status; err.data = data; throw err;
    }
    return data;
  }
  function getSession(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }catch{ return null; } }
  function setSession(session){ try{ if(session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); else localStorage.removeItem(STORAGE_KEY); }catch{} }
  function currentAccessToken(){ const s = getSession(); return s && s.access_token ? s.access_token : null; }
  async function insert(table, payload, options){
    const prefer = (options && options.returning === false) ? "return=minimal" : "return=representation";
    return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}`, { method:"POST", headers:{ Prefer: prefer }, token: currentAccessToken(), body: JSON.stringify(payload) });
  }
  async function update(table, query, payload, options){
    const prefer = (options && options.returning === false) ? "return=minimal" : "return=representation";
    return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}${query || ""}`, { method:"PATCH", headers:{ Prefer: prefer }, token: currentAccessToken(), body: JSON.stringify(payload) });
  }
  async function select(table, query, options){ return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}${query || ""}`, { method:"GET", token: options && options.token ? options.token : currentAccessToken() }); }
  async function signUp(email, password){
    const data = await supabaseFetch("/auth/v1/signup", { method:"POST", body: JSON.stringify({ email, password }) });
    if(data && data.access_token) setSession(data); return data;
  }
  async function signIn(email, password){
    const data = await supabaseFetch("/auth/v1/token?grant_type=password", { method:"POST", body: JSON.stringify({ email, password }) });
    if(data && data.access_token) setSession(data); return data;
  }
  async function signOut(){ const token = currentAccessToken(); if(token){ try{ await supabaseFetch("/auth/v1/logout", { method:"POST", token }); }catch{} } setSession(null); }
  async function getCurrentUser(){ const token = currentAccessToken(); if(!token) return null; const data = await supabaseFetch("/auth/v1/user", { method:"GET", token }); return data; }
  async function getProfile(){ const rows = await select("profiles", "?select=*&limit=1"); return Array.isArray(rows) ? rows[0] : null; }
  function isAdminEmail(email){ return String(email || "").toLowerCase() === String(config.adminEmail).toLowerCase(); }
  function publicUrl(path){ return `${config.supabaseUrl}/storage/v1/object/public/${config.storageBucket}/${path}`; }
  async function uploadMedia(file, folder){
    if(!file) return "";
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-").replace(/^-+|-+$/g,"");
    const ext = safeName.includes('.') ? safeName.split('.').pop() : 'bin';
    const key = `${folder || 'uploads'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await supabaseFetch(`/storage/v1/object/${config.storageBucket}/${key}`, { method:"POST", token: currentAccessToken(), contentType:false, headers:{ "Content-Type": file.type || "application/octet-stream", "x-upsert":"true" }, body:file });
    return publicUrl(key);
  }
  window.HL_CONFIG = config;
  window.HLDatabase = { config, request:supabaseFetch, insert, update, select, signUp, signIn, signOut, getSession, setSession, currentAccessToken, getCurrentUser, getProfile, isAdminEmail, uploadMedia, publicUrl };
})();
