import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { corsHeaders, extractUserId } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

const successUrlPath = '/payment-success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrlPath = '/credits?canceled=true';

function ok(data: any): Response {
    return new Response(
        JSON.stringify({ code: "SUCCESS", message: "ok", data }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
}

function fail(msg: string, code = 400): Response {
    return new Response(
        JSON.stringify({ code: "FAIL", message: msg }),
        { status: code, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
}

// Ensure the incoming request maps to one of the allowed plans
const PLAN_MAPPING: Record<string, { price: number; credits: number; name: string }> = {
  'creator_basic': { price: 299, credits: 1000, name: 'Creator Basic' },
  'creator_pro': { price: 799, credits: 5000, name: 'Creator Pro' },
  'creator_ultra': { price: 1999, credits: 20000, name: 'Creator Ultra' },
  'creator_basic_annual': { price: 249 * 12, credits: 1000, name: 'Creator Basic (Annual)' },
  'creator_pro_annual': { price: 699 * 12, credits: 5000, name: 'Creator Pro (Annual)' },
  'creator_ultra_annual': { price: 1799 * 12, credits: 20000, name: 'Creator Ultra (Annual)' },
};

serve(async (req) => {
    try {
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }
        if (req.method !== "POST") return fail("Method not allowed", 405);

        const authResult = extractUserId(req);
        if ('error' in authResult) return authResult.error;
        const { userId } = authResult;

        if (!userId) {
            return fail("Unauthorized. You must be logged in to purchase credits.", 401);
        }

        const request = await req.json();
        const { planId } = request;
        
        if (!planId || !PLAN_MAPPING[planId]) {
            return fail(`Invalid or missing plan ID: ${planId}`);
        }

        const plan = PLAN_MAPPING[planId];
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        // 1. Create a pending order in the database
        const { data: order, error } = await supabase
            .from("orders")
            .insert({
                user_id: userId,
                plan_id: planId,
                credits: plan.credits,
                total_amount: plan.price,
                currency: "inr",
                status: "pending",
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create order: ${error.message}`);

        // 2. Build origin dynamically
        const origin = req.headers.get("origin") || Deno.env.get("VITE_PUBLIC_SITE_URL") || "http://localhost:5173";

        // 3. Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: `Forge ${plan.name} Plan`,
                        description: `${plan.credits.toLocaleString()} credits added to your account`,
                    },
                    unit_amount: plan.price * 100, // Stripe expects the smallest currency unit (paise)
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: `${origin}${successUrlPath}`,
            cancel_url: `${origin}${cancelUrlPath}`,
            customer_email: authResult.userId ? undefined : undefined, // Could fetch user email if needed
            metadata: {
                order_id: order.id,
                user_id: userId,
                plan_id: planId,
                credits: plan.credits.toString()
            },
        });

        // 4. Update the order with session ID
        await supabase
            .from("orders")
            .update({
                stripe_session_id: session.id,
            })
            .eq("id", order.id);

        return ok({
            url: session.url,
            sessionId: session.id,
            orderId: order.id,
        });
    } catch (error: any) {
        console.error("Stripe checkout error:", error);
        return fail(error.message, 500);
    }
});
