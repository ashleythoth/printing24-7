import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const squareAccessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
  if (!squareAccessToken) {
    return new Response(JSON.stringify({ error: "Square not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { cardId } = await req.json();

  const squareEnv = Deno.env.get("SQUARE_ENVIRONMENT") ?? "sandbox";
  const baseUrl = squareEnv === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  console.log("[remove-square-card] Disabling card", { cardId, userId: user.id });

  // Disable the card in Square
  const res = await fetch(`${baseUrl}/v2/cards/${cardId}/disable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${squareAccessToken}`,
      "Square-Version": "2024-01-18",
    },
  });

  if (!res.ok) {
    const data = await res.json();
    console.error("[remove-square-card] Failed to disable card", data);
    return new Response(JSON.stringify({ error: data.errors?.[0]?.detail ?? "Failed to remove card" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[remove-square-card] Card disabled, clearing profile");

  // Clear card info from profile
  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await serviceSupabase.from("profiles").update({
    square_card_id: null,
    card_brand: null,
    card_last4: null,
    card_exp_month: null,
    card_exp_year: null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
