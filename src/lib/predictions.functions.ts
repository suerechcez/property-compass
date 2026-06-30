import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";

export const predictSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const o = input as { commissionerId?: string };
    return { commissionerId: o?.commissionerId };
  })
  .handler(async ({ data, context }) => {
    const targetId = data.commissionerId ?? context.userId;
    // Developers can request any commissioner; others only themselves
    if (targetId !== context.userId) {
      const { data: dev } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "developer",
      });
      if (!dev) throw new Error("Forbidden");
    }

    const { data: sales } = await context.supabase
      .from("sales")
      .select("amount, commission, sale_date")
      .eq("commissioner_id", targetId)
      .order("sale_date", { ascending: true });

    const rows = sales ?? [];
    if (rows.length < 2) {
      return {
        summary:
          "Not enough sales data yet. Log at least 2 sales to receive an AI forecast and recommendations.",
        forecast: [] as { month: string; projected: number }[],
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const compact = rows
      .map((r) => `${r.sale_date}: amount=${r.amount}, commission=${r.commission}`)
      .join("\n");

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt: `You are a real-estate sales analyst for the 1HP Portal. Given this commissioner's sales log, write a concise 3-paragraph analysis with: 1) recent trend in volume and commission, 2) a projection for the next 3 months in plain numbers (USD), 3) two specific recommendations to improve sales velocity. Be concrete and avoid filler.\n\nSales log:\n${compact}`,
    });

    // Simple linear projection for chart
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      const m = r.sale_date.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + Number(r.amount));
    }
    const months = [...byMonth.entries()].sort();
    const vals = months.map(([, v]) => v);
    const n = vals.length;
    const meanX = (n - 1) / 2;
    const meanY = vals.reduce((a, b) => a + b, 0) / n;
    let num = 0,
      den = 0;
    vals.forEach((y, x) => {
      num += (x - meanX) * (y - meanY);
      den += (x - meanX) ** 2;
    });
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;
    const lastMonth = months[months.length - 1][0];
    const [ly, lm] = lastMonth.split("-").map(Number);
    const forecast: { month: string; projected: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(ly, lm - 1 + i, 1);
      const mLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      forecast.push({
        month: mLabel,
        projected: Math.max(0, Math.round(intercept + slope * (n - 1 + i))),
      });
    }

    return { summary: text, forecast };
  });
