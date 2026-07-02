import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "heylarmahtech@outlook.com").toLowerCase();

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Missing Supabase function secrets" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: adminData, error: adminError } = await userClient.auth.getUser();
    const signedInAdmin = adminData?.user;
    if (adminError || !signedInAdmin || signedInAdmin.email?.toLowerCase() !== adminEmail) {
      return json({ error: "Admin access required" }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = clean(body.action || "list_users");

    if (action === "list_users") {
      const page = Math.max(1, Number(body.page || 1));
      const perPage = Math.min(100, Math.max(1, Number(body.per_page || body.perPage || 40)));
      const search = clean(body.search).toLowerCase();

      const { data: list, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const authUsers = list?.users ?? [];
      const ids = authUsers.map((user) => user.id);
      const profilesById = new Map<string, Record<string, unknown>>();
      if (ids.length) {
        const { data: profiles, error: profileError } = await adminClient
          .from("profiles")
          .select("*")
          .in("id", ids);
        if (profileError) throw profileError;
        for (const profile of profiles ?? []) profilesById.set(String(profile.id), profile as Record<string, unknown>);
      }

      let users = authUsers.map((user) => ({
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          user_metadata: user.user_metadata ?? {},
        },
        profile: profilesById.get(user.id) ?? { id: user.id, email: user.email },
      }));

      if (search) {
        users = users.filter((record) => {
          const profile = record.profile as Record<string, unknown>;
          const haystack = [record.user.email, profile.full_name, profile.phone, profile.company, profile.role, profile.account_status]
            .map((x) => clean(x).toLowerCase())
            .join(" ");
          return haystack.includes(search);
        });
      }

      return json({ ok: true, users, page, perPage, total: users.length });
    }

    const userId = clean(body.user_id || body.id);
    if (!userId) return json({ error: "User ID is required" }, 400);

    const { data: userLookup, error: lookupError } = await adminClient.auth.admin.getUserById(userId);
    if (lookupError) throw lookupError;
    const targetUser = userLookup.user;
    if (!targetUser) return json({ error: "User not found" }, 404);

    if (action === "verify_user") {
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: {
          ...(targetUser.user_metadata ?? {}),
          account_type: "premium",
          account_status: "verified",
          verified_by_admin: true,
        },
      } as any);
      if (authError) throw authError;

      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: userId,
          email: targetUser.email,
          role: "premium",
          account_status: "verified",
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: signedInAdmin.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" })
        .select("*")
        .single();
      if (profileError) throw profileError;
      return json({ ok: true, user_id: userId, profile });
    }

    if (action === "update_user") {
      let role = ["user", "premium", "admin"].includes(clean(body.role)) ? clean(body.role) : "premium";
      if (role === "admin" && targetUser.email?.toLowerCase() !== adminEmail) role = "premium";
      const accountStatus = ["pending", "verified", "suspended"].includes(clean(body.account_status)) ? clean(body.account_status) : "pending";
      const isVerified = Boolean(body.is_verified) || accountStatus === "verified";
      const fullName = clean(body.full_name);
      const phone = clean(body.phone);
      const company = clean(body.company);
      const note = clean(body.admin_note);

      const authMetadata = {
        ...(targetUser.user_metadata ?? {}),
        full_name: fullName,
        phone,
        company,
        account_type: role,
        account_status: accountStatus,
        verified_by_admin: isVerified,
      };

      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: authMetadata,
        ...(isVerified ? { email_confirm: true } : {}),
      } as any);
      if (authError) throw authError;

      const profilePatch = {
        id: userId,
        email: targetUser.email,
        full_name: fullName,
        phone,
        company,
        role,
        account_status: accountStatus,
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? signedInAdmin.id : null,
        last_admin_note: note,
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .upsert(profilePatch, { onConflict: "id" })
        .select("*")
        .single();
      if (profileError) throw profileError;
      return json({ ok: true, user_id: userId, profile });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: error?.message ?? "Admin user operation failed" }, 400);
  }
});
