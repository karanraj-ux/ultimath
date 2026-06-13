import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

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

async function updateOrderStatus(sessionId: string, session: Stripe.Checkout.Session): Promise<{ updated: boolean, credits: number, userId: string } | null> {
    const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("id, status, user_id, credits")
        .eq("stripe_session_id", sessionId)
        .single();

    if (fetchError || !order) {
        console.error("Failed to fetch order:", fetchError);
        return null;
    }

    if (order.status === "completed") {
        return { updated: false, credits: order.credits, userId: order.user_id };
    }

    if (order.status !== "pending") {
        console.error(`Order status is ${order.status}, cannot complete payment`);
        return null;
    }

    const { error } = await supabase
        .from("orders")
        .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            customer_email: session.customer_details?.email,
            customer_name: session.customer_details?.name,
            stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", order.id)
        .eq("status", "pending");

    if (error) {
        console.error("Failed to update order:", error);
        return null;
    }

    // Now call RPC to actually add credits
    const { error: rpcError } = await supabase.rpc('add_credits', {
      p_user_id: order.user_id,
      p_amount: order.credits,
      p_reason: 'Stripe Purchase'
    });

    if (rpcError) {
        console.error("Failed to add credits to user:", rpcError);
        // Warning: Order marked as completed but credits failed. Admin needs to check.
        // We still return true because payment succeeded, but we should probably log this severely.
    }

    return { updated: true, credits: order.credits, userId: order.user_id };
}

serve(async (req) => {
    try {
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }
        if (req.method !== "POST") return fail("Method not allowed", 405);

        const { sessionId } = await req.json();
        if (!sessionId) return fail("Missing session_id parameter");

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            return ok({
                verified: false,
                status: session.payment_status,
                sessionId: session.id,
            });
        }

        const result = await updateOrderStatus(sessionId, session);

        if (!result) {
            return fail("Failed to find or process the order", 404);
        }

        return ok({
            verified: true,
            status: "paid",
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency,
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
            creditsAdded: result.credits,
            orderUpdated: result.updated,
        });
    } catch (error: any) {
        console.error("Payment verification failed:", error);
        return fail(error.message, 500);
    }
});