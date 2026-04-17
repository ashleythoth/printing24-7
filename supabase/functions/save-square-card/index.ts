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

  const squareEnv = Deno.env.get("SQUARE_ENVIRONMENT") ?? "sandbox";
  const baseUrl = squareEnv === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  const { sourceId, existingCustomerId } = await req.json();

  console.log("[save-square-card] Saving card for user", { userId: user.id, existingCustomerId });

  let customerId = existingCustomerId;

  // Create Square customer if they don't have one yet
  if (!customerId) {
    console.log("[save-square-card] Creating new Square customer");
    const custRes = await fetch(`${baseUrl}/v2/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${squareAccessToken}`,
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        email_address: user.email,
        given_name: user.user_metadata?.first_name ?? "",
        family_name: user.user_metadata?.last_name ?? "",
        reference_id: user.id,
      }),
    });
    const custData = await custRes.json();
    if (!custRes.ok) {
      console.error("[save-square-card] Failed to create customer", custData);
      return new Response(JSON.stringify({ error: custData.errors?.[0]?.detail ?? "Failed to create customer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    customerId = custData.customer.id;
    console.log("[save-square-card] Created customer", { customerId });
  }

  // Save card on file
  const cardRes = await fetch(`${baseUrl}/v2/cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${squareAccessToken}`,
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      source_id: sourceId,
      card: { customer_id: customerId },
    }),
  });

  const cardData = await cardRes.json();
  if (!cardRes.ok) {
    console.error("[save-square-card] Failed to save card", cardData);
    return new Response(JSON.stringify({ error: cardData.errors?.[0]?.detail ?? "Failed to save card" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const card = cardData.card;
  console.log("[save-square-card] Card saved", { cardId: card.id, brand: card.card_brand, last4: card.last_4 });

  // Update profile with Square customer + card info
  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .update({
      square_customer_id: customerId,
      square_card_id: card.id,
      card_brand: card.card_brand,
      card_last4: card.last_4,
      card_exp_month: card.exp_month,
      card_exp_year: card.exp_year,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("[save-square-card] Failed to update profile", profileError);
    return new Response(JSON.stringify({ error: "Failed to save card to profile" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    customerId,
    cardId: card.id,
    brand: card.card_brand,
    last4: card.last_4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
