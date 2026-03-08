import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const events: Array<{
      event_name: string;
      page?: string;
      referrer?: string;
      screen_w?: number;
      screen_h?: number;
    }> = Array.isArray(body) ? body : [body];

    if (events.length === 0 || events.length > 20) {
      return new Response(JSON.stringify({ error: "1-20 events per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ua = req.headers.get("user-agent") || null;

    const rows = events.map((e) => ({
      event_name: String(e.event_name || "unknown").slice(0, 64),
      page: e.page ? String(e.page).slice(0, 512) : null,
      referrer: e.referrer ? String(e.referrer).slice(0, 512) : null,
      screen_w: e.screen_w ? Math.min(Math.max(0, Number(e.screen_w)), 9999) : null,
      screen_h: e.screen_h ? Math.min(Math.max(0, Number(e.screen_h)), 9999) : null,
      user_agent: ua ? ua.slice(0, 512) : null,
    }));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("ping_analytics").insert(rows);

    if (error) {
      console.error("Analytics insert error:", error);
      return new Response(JSON.stringify({ error: "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
