import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's quota from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('free_quota_remaining, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning free tier status");
      return new Response(JSON.stringify({ 
        subscribed: false,
        free_quota_remaining: profile?.free_quota_remaining ?? 1,
        subscription_status: profile?.subscription_status || 'inactive'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      logStep("Subscription data", { 
        id: subscription.id, 
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        type: typeof subscription.current_period_end
      });
      
      // Safely convert timestamp to ISO string
      if (subscription.current_period_end) {
        const periodEnd = typeof subscription.current_period_end === 'number' 
          ? subscription.current_period_end 
          : parseInt(String(subscription.current_period_end));
        
        if (!isNaN(periodEnd)) {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
          logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
        } else {
          logStep("Warning: current_period_end is not a valid number", { value: subscription.current_period_end });
        }
      }
      
      // Update profile subscription status
      await supabaseClient
        .from('profiles')
        .update({ subscription_status: 'active' })
        .eq('id', user.id);
    } else {
      logStep("No active subscription found");
      
      // Update profile subscription status
      await supabaseClient
        .from('profiles')
        .update({ subscription_status: 'inactive' })
        .eq('id', user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_end: subscriptionEnd,
      free_quota_remaining: profile?.free_quota_remaining ?? 0,
      subscription_status: hasActiveSub ? 'active' : 'inactive'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
