import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const predictSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const o = input as { commissionerId?: string };
    return { commissionerId: o?.commissionerId };
  })
  .handler(async ({ data, context }) => {
    const targetId = data.commissionerId ?? context.userId;
    if (targetId !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Forbidden");
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
          "Not enough sales data yet. Log at least 2 sales to see a forecast.",
        forecast: [] as { month: string; projected: number }[],
      };
    }

    // Aggregate by month
    const byMonth = new Map<string, { amount: number; commission: number }>();
    for (const r of rows) {
      const m = r.sale_date.slice(0, 7);
      const prev = byMonth.get(m) ?? { amount: 0, commission: 0 };
      byMonth.set(m, {
        amount: prev.amount + Number(r.amount),
        commission: prev.commission + Number(r.commission),
      });
    }
    const months = [...byMonth.entries()].sort();
    const vals = months.map(([, v]) => v.amount);
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

    const total = vals.reduce((a, b) => a + b, 0);
    const avg = total / n;
    const last = vals[vals.length - 1];
    const trend = slope > 0 ? "trending up" : slope < 0 ? "trending down" : "flat";
    const projTotal = forecast.reduce((a, f) => a + f.projected, 0);

    const summary = `Over the last ${n} month${n === 1 ? "" : "s"}, sales totaled ₱${total.toLocaleString()} (average ₱${Math.round(avg).toLocaleString()}/month), with the most recent month at ₱${last.toLocaleString()}. The trend is ${trend}. Projected next 3 months: ₱${projTotal.toLocaleString()} combined, based on a linear fit of your logged sales.`;

    return { summary, forecast };
  });
