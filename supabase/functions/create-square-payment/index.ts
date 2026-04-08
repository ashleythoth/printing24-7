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

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { sourceId, amountCents, idempotencyKey, note } = await req.json();

  const squareAccessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
  if (!squareAccessToken) {
    return new Response(JSON.stringify({ error: "Square not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const squareEnv = Deno.env.get("SQUARE_ENVIRONMENT") ?? "sandbox";
  const squareBaseUrl =
    squareEnv === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

  console.log("[create-square-payment] Creating payment", { amountCents, note, userId: user.id });

  const response = await fetch(`${squareBaseUrl}/v2/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${squareAccessToken}`,
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: amountCents,
        currency: "USD",
      },
      note,
      buyer_email_address: user.email,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("[create-square-payment] Square error", result);
    return new Response(
      JSON.stringify({ error: result.errors?.[0]?.detail ?? "Payment failed" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log("[create-square-payment] Payment success", { paymentId: result.payment?.id });

  return new Response(JSON.stringify({ paymentId: result.payment?.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});