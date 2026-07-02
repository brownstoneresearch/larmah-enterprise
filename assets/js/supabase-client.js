(function(){
  "use strict";

  const config = {
    supabaseUrl: "https://ipohjsdhakjbetyievmv.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwb2hqc2RoYWtqYmV0eWlldm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjUwMTYsImV4cCI6MjA5ODUwMTAxNn0.qdcQ4bFpUmvWJstWMGnfrFwY9DBBVEqBo0mV6mGxcz4",
    whatsappNumber: "2347063080605",
    adminEmail: "heylarmahtech@outlook.com",
    storageBucket: "larmah-media",
    defaultRedirect: "auth.html",
    premiumRedirect: "dashboard.html",
    socials: {
      instagram: "https://www.instagram.com/heylarmah_ltd/",
      x: "https://x.com/heylarmah_ltd",
      tiktok: "https://www.tiktok.com/@heylarmah_ltd"
    }
  };


  const STORAGE_KEY = "hey_larmah_supabase_session";
  const client = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "implicit"
        },
        global: { headers: { "x-application-name": "hey-larmah-enterprise" } }
      })
    : null;

  function absoluteUrl(path){
    try{ return new URL(path || config.defaultRedirect, window.location.href).href; }
    catch{ return path || config.defaultRedirect; }
  }
  function authRedirect(path){ return absoluteUrl(path || config.defaultRedirect); }
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
      const message = (data && (data.message || data.error_description || data.error || data.msg)) || `Supabase request failed with ${response.status}`;
      const err = new Error(message); err.status = response.status; err.data = data; throw err;
    }
    return data;
  }
  function getSession(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }catch{ return null; } }
  function setSession(session){
    try{
      if(session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    }catch{}
  }
  function currentAccessToken(){ const s = getSession(); return s && s.access_token ? s.access_token : null; }
  function setSessionFromData(data){
    if(!data) return data;
    const session = data.session || (data.access_token ? data : null);
    if(session) setSession(session);
    return data;
  }
  async function syncSession(){
    if(!client) return getSession();
    try{
      const { data } = await client.auth.getSession();
      if(data && data.session) setSession(data.session);
      return data ? data.session : getSession();
    }catch{
      return getSession();
    }
  }
  const ready = syncSession();
  if(client && client.auth && client.auth.onAuthStateChange){
    client.auth.onAuthStateChange((_event, session)=>{ setSession(session || null); });
  }

  async function insert(table, payload, options){
    const prefer = (options && options.returning === false) ? "return=minimal" : "return=representation";
    return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}`, { method:"POST", headers:{ Prefer: prefer }, token: currentAccessToken(), body: JSON.stringify(payload) });
  }
  async function update(table, query, payload, options){
    const prefer = (options && options.returning === false) ? "return=minimal" : "return=representation";
    return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}${query || ""}`, { method:"PATCH", headers:{ Prefer: prefer }, token: currentAccessToken(), body: JSON.stringify(payload) });
  }
  async function select(table, query, options){
    return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}${query || ""}`, { method:"GET", token: options && options.token ? options.token : currentAccessToken() });
  }

  async function signUp(email, password, metadata){
    const redirectTo = authRedirect("auth.html?registered=1&confirmed=1");
    if(client){
      const { data, error } = await client.auth.signUp({ email, password, options:{ emailRedirectTo: redirectTo, data: metadata || {} } });
      if(error) throw error;
      return setSessionFromData(data);
    }
    return setSessionFromData(await supabaseFetch(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, { method:"POST", body: JSON.stringify({ email, password, data: metadata || {} }) }));
  }
  async function signIn(email, password){
    if(client){
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if(error) throw error;
      return setSessionFromData(data);
    }
    return setSessionFromData(await supabaseFetch("/auth/v1/token?grant_type=password", { method:"POST", body: JSON.stringify({ email, password }) }));
  }
  async function signOut(){
    if(client){ try{ await client.auth.signOut(); }catch{} }
    const token = currentAccessToken();
    if(token && !client){ try{ await supabaseFetch("/auth/v1/logout", { method:"POST", token }); }catch{} }
    setSession(null);
  }
  async function getCurrentUser(){
    await ready.catch(()=>{});
    if(client){
      const { data, error } = await client.auth.getUser();
      if(error) throw error;
      return data && data.user ? data.user : null;
    }
    const token = currentAccessToken(); if(!token) return null;
    return supabaseFetch("/auth/v1/user", { method:"GET", token });
  }
  async function getProfile(){ const rows = await select("profiles", "?select=*&limit=1"); return Array.isArray(rows) ? rows[0] : null; }
  function isAdminEmail(email){ return String(email || "").toLowerCase() === String(config.adminEmail).toLowerCase(); }
  async function resendConfirmation(email, type){
    const redirectTo = authRedirect(type === "email_change" ? "dashboard.html?email-change=1" : "auth.html?confirmed=1");
    if(client){
      const { data, error } = await client.auth.resend({ type: type || "signup", email, options:{ emailRedirectTo: redirectTo } });
      if(error) throw error; return data;
    }
    return supabaseFetch("/auth/v1/resend", { method:"POST", body: JSON.stringify({ type: type || "signup", email, options:{ email_redirect_to: redirectTo } }) });
  }
  async function resetPassword(email){
    const redirectTo = authRedirect("reset-password.html?type=recovery");
    if(client){
      const { data, error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if(error) throw error; return data;
    }
    return supabaseFetch(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method:"POST", body: JSON.stringify({ email }) });
  }
  async function updateUser(attributes){
    await ready.catch(()=>{});
    if(client){
      const { data, error } = await client.auth.updateUser(attributes);
      if(error) throw error; return setSessionFromData(data);
    }
    return setSessionFromData(await supabaseFetch("/auth/v1/user", { method:"PUT", token: currentAccessToken(), body: JSON.stringify(attributes) }));
  }
  async function changeEmail(email){ return updateUser({ email }); }
  async function updatePassword(password){ return updateUser({ password }); }
  async function signInWithGoogle(redirectPath){
    const redirectTo = authRedirect(redirectPath || "dashboard.html");
    if(client){
      const { data, error } = await client.auth.signInWithOAuth({ provider:"google", options:{ redirectTo } });
      if(error) throw error; return data;
    }
    window.location.href = `${config.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  }
  async function inviteUser(email, metadata){
    await ready.catch(()=>{});
    if(client && client.functions){
      const { data, error } = await client.functions.invoke("invite-user", { body:{ email, metadata: metadata || {}, redirectTo: authRedirect("auth.html?invited=1") } });
      if(error) throw error; return data;
    }
    return supabaseFetch("/functions/v1/invite-user", { method:"POST", token: currentAccessToken(), body: JSON.stringify({ email, metadata: metadata || {}, redirectTo: authRedirect("auth.html?invited=1") }) });
  }

  async function invokeFunction(name, body){
    await ready.catch(()=>{});
    if(client && client.functions){
      const { data, error } = await client.functions.invoke(name, { body: body || {} });
      if(error) throw error;
      return data;
    }
    return supabaseFetch(`/functions/v1/${name}`, { method:"POST", token: currentAccessToken(), body: JSON.stringify(body || {}) });
  }

  async function requireAdminSession(){
    await ready.catch(()=>{});
    const user = await getCurrentUser();
    if(!user || !isAdminEmail(user.email)){
      throw new Error("Approved admin session required. Sign in with heylarmahtech@outlook.com.");
    }
    return user;
  }

  function normalizedProfileUser(row){
    const profile = row || {};
    return {
      user: {
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        last_sign_in_at: profile.last_sign_in_at || "Profile record",
        email_confirmed_at: profile.email_confirmed_at || null,
        user_metadata: {
          full_name: profile.full_name || "",
          phone: profile.phone || "",
          company: profile.company || "",
          account_type: profile.role || "premium",
          account_status: profile.account_status || "pending"
        }
      },
      profile
    };
  }

  async function adminUsersDirect(action, payload){
    const admin = await requireAdminSession();
    const body = payload || {};
    const now = new Date().toISOString();

    if(action === "list_users"){
      const rows = await select("profiles", "?select=*&order=created_at.desc&limit=150", { token: currentAccessToken() });
      const search = String(body.search || "").trim().toLowerCase();
      let profiles = Array.isArray(rows) ? rows : [];
      if(search){
        profiles = profiles.filter((profile)=>{
          return [profile.email, profile.full_name, profile.phone, profile.company, profile.role, profile.account_status, profile.last_admin_note]
            .map((value)=>String(value || "").toLowerCase())
            .join(" ")
            .includes(search);
        });
      }
      return { ok:true, source:"profiles-direct", users: profiles.map(normalizedProfileUser), total: profiles.length };
    }

    const userId = String(body.user_id || body.id || "").trim();
    if(!userId) throw new Error("User ID is required.");

    const lookup = await select("profiles", `?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`, { token: currentAccessToken() });
    const existing = Array.isArray(lookup) ? lookup[0] : null;
    if(!existing) throw new Error("User profile was not found. Ask the user to register first, then refresh the admin dashboard.");

    if(action === "verify_user"){
      const patch = {
        role: existing.email && isAdminEmail(existing.email) ? "admin" : "premium",
        account_status: "verified",
        is_verified: true,
        verified_at: now,
        verified_by: admin.id,
        updated_at: now
      };
      const updated = await update("profiles", `?id=eq.${encodeURIComponent(userId)}`, patch);
      return { ok:true, source:"profiles-direct", user_id:userId, profile: Array.isArray(updated) ? updated[0] : patch };
    }

    if(action === "update_user"){
      const wantedRole = String(body.role || existing.role || "premium").trim();
      const role = (wantedRole === "admin" && isAdminEmail(existing.email)) ? "admin" : (["user","premium"].includes(wantedRole) ? wantedRole : "premium");
      const wantedStatus = String(body.account_status || existing.account_status || "pending").trim();
      const account_status = ["pending","verified","suspended"].includes(wantedStatus) ? wantedStatus : "pending";
      const is_verified = Boolean(body.is_verified) || account_status === "verified";
      const patch = {
        full_name: String(body.full_name || "").trim(),
        phone: String(body.phone || "").trim(),
        company: String(body.company || "").trim(),
        role,
        account_status,
        is_verified,
        verified_at: is_verified ? (existing.verified_at || now) : null,
        verified_by: is_verified ? (existing.verified_by || admin.id) : null,
        last_admin_note: String(body.admin_note || "").trim(),
        updated_at: now
      };
      const updated = await update("profiles", `?id=eq.${encodeURIComponent(userId)}`, patch);
      return { ok:true, source:"profiles-direct", user_id:userId, profile: Array.isArray(updated) ? updated[0] : Object.assign({}, existing, patch) };
    }

    throw new Error("Unsupported user management action.");
  }

  async function adminUsers(action, payload){
    await ready.catch(()=>{});
    const body = Object.assign({ action }, payload || {});
    try{
      return await invokeFunction("admin-users", body);
    }catch(edgeError){
      try{
        return await adminUsersDirect(action, payload || {});
      }catch(directError){
        const message = directError && directError.message ? directError.message : (edgeError && edgeError.message ? edgeError.message : "User management failed.");
        const err = new Error(message);
        err.edgeError = edgeError;
        err.directError = directError;
        throw err;
      }
    }
  }

  function publicUrl(path){ return `${config.supabaseUrl}/storage/v1/object/public/${config.storageBucket}/${path}`; }
  function mediaKindFromMime(mime, name){
    const value = String(mime || name || "").toLowerCase();
    if(value.startsWith("video/") || /\.(mp4|webm|mov|m4v|mpeg|mpg)$/i.test(value)) return "video";
    if(value.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(value)) return "image";
    return "external";
  }
  async function uploadMediaObject(file, folder){
    if(!file) return null;
    const originalName = file.name || "upload.bin";
    const safeName = originalName.toLowerCase().replace(/[^a-z0-9.]+/g,"-").replace(/^-+|-+$/g,"") || "upload.bin";
    const ext = safeName.includes('.') ? safeName.split('.').pop() : 'bin';
    const key = `${folder || 'uploads'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = file.type || "application/octet-stream";
    if(client){
      const { error } = await client.storage.from(config.storageBucket).upload(key, file, { upsert:true, contentType });
      if(error) throw error;
      const { data } = client.storage.from(config.storageBucket).getPublicUrl(key);
      return { url:data.publicUrl, path:key, media_type:mediaKindFromMime(contentType, originalName), mime_type:contentType, file_name:originalName, size:file.size || 0 };
    }
    await supabaseFetch(`/storage/v1/object/${config.storageBucket}/${key}`, { method:"POST", token: currentAccessToken(), contentType:false, headers:{ "Content-Type": contentType, "x-upsert":"true" }, body:file });
    return { url:publicUrl(key), path:key, media_type:mediaKindFromMime(contentType, originalName), mime_type:contentType, file_name:originalName, size:file.size || 0 };
  }
  async function uploadMedia(file, folder){
    const uploaded = await uploadMediaObject(file, folder);
    return uploaded ? uploaded.url : "";
  }

  window.HL_CONFIG = config;
  window.HLDatabase = {
    config, client, ready, request:supabaseFetch, insert, update, select,
    signUp, signIn, signOut, resendConfirmation, resetPassword,
    updateUser, changeEmail, updatePassword, signInWithGoogle, inviteUser, adminUsers,
    getSession, setSession, currentAccessToken, getCurrentUser, getProfile, isAdminEmail,
    uploadMedia, uploadMediaObject, publicUrl, syncSession, authRedirect
  };
})();
