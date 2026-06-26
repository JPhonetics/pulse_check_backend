import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey     = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl   = Deno.env.get("SUPABASE_URL");
  const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !stripeKey || !supabaseUrl || !serviceKey) {
    return new Response("Missing secrets", { status: 500 });
  }

  const sig  = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as never });
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const HANDLED = ["payment_intent.succeeded", "payment_intent.payment_failed"];
  if (!HANDLED.includes(event.type)) return new Response("ok", { status: 200 });

  const intent = event.data.object as Stripe.PaymentIntent;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: existing } = await supabase
    .from("donations")
    .select("id")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("donations").insert({
      stripe_payment_intent_id: intent.id,
      amount:      intent.amount,
      status:      event.type === "payment_intent.succeeded" ? "succeeded" : "failed",
      user_id:     intent.metadata?.user_id     ?? null,
      guest_token: intent.metadata?.guest_token ?? null,
    });
  }

  return new Response("ok", { status: 200 });
});
