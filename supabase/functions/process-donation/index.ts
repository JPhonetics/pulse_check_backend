import Stripe from "npm:stripe@17";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return jsonResponse({ error: "Missing STRIPE_SECRET_KEY" }, 500);

  let body: { amount?: unknown; user_id?: unknown; guest_token?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { amount, user_id, guest_token } = body;

  if ((!user_id && !guest_token) || (user_id && guest_token)) {
    return jsonResponse({ error: "Provide exactly one of user_id or guest_token" }, 400);
  }

  if (!Number.isInteger(amount) || (amount as number) <= 0 || (amount as number) > 1_000_000) {
    return jsonResponse({ error: "amount must be a positive integer ≤ 1000000" }, 400);
  }

  try {
    const stripe = new Stripe(stripeKey as string, { apiVersion: "2024-12-18.acacia" as never });
    const intent = await stripe.paymentIntents.create({
      amount: amount as number,
      currency: "usd",
      metadata: user_id ? { user_id: user_id as string } : { guest_token: guest_token as string },
    });
    return jsonResponse({ client_secret: intent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return jsonResponse({ error: message }, 500);
  }
});
