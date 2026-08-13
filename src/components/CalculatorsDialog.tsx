import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/property-types";
import { Calculator } from "lucide-react";

type CalcTab = "mortgage" | "rent";

export function CalculatorsDialog({
  open,
  onOpenChange,
  initialTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab: CalcTab;
}) {
  const [tab, setTab] = useState<CalcTab>(initialTab);
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />Calculators
          </DialogTitle>
          <DialogDescription>Quick estimates — not a loan or rental offer.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as CalcTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mortgage">Mortgage</TabsTrigger>
            <TabsTrigger value="rent">Rent</TabsTrigger>
          </TabsList>
          <TabsContent value="mortgage"><MortgageCalculator /></TabsContent>
          <TabsContent value="rent"><RentCalculator /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MortgageCalculator() {
  const [price, setPrice] = useState(3_000_000);
  const [downPct, setDownPct] = useState(20);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(6.5);

  const { loanAmount, monthly, totalPayment, totalInterest } = useMemo(() => {
    const down = price * (downPct / 100);
    const loan = Math.max(0, price - down);
    const n = years * 12;
    const r = rate / 100 / 12;
    const m = r === 0 ? loan / n : (loan * r * (1 + r) ** n) / ((1 + r) ** n - 1);
    return {
      loanAmount: loan,
      monthly: Number.isFinite(m) ? m : 0,
      totalPayment: (Number.isFinite(m) ? m : 0) * n,
      totalInterest: (Number.isFinite(m) ? m : 0) * n - loan,
    };
  }, [price, downPct, years, rate]);

  return (
    <div className="space-y-5 pt-2">
      <div>
        <Label htmlFor="mc-price">Home price</Label>
        <Input
          id="mc-price"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1.5"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Down payment</Label>
          <span className="text-sm font-medium text-foreground">{downPct}% · {formatPrice(price * (downPct / 100))}</span>
        </div>
        <Slider className="mt-2.5" min={0} max={50} step={1} value={[downPct]} onValueChange={([v]) => setDownPct(v)} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Loan term</Label>
          <span className="text-sm font-medium text-foreground">{years} years</span>
        </div>
        <Slider className="mt-2.5" min={5} max={30} step={5} value={[years]} onValueChange={([v]) => setYears(v)} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Interest rate</Label>
          <span className="text-sm font-medium text-foreground">{rate.toFixed(1)}%</span>
        </div>
        <Slider className="mt-2.5" min={2} max={15} step={0.1} value={[rate]} onValueChange={([v]) => setRate(v)} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimated monthly payment</p>
        <p className="mt-1 font-display text-3xl font-semibold text-primary">{formatPrice(monthly)}<span className="text-base font-normal text-muted-foreground"> /mo</span></p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Loan amount</p>
            <p className="font-medium">{formatPrice(loanAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total interest</p>
            <p className="font-medium">{formatPrice(totalInterest)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="font-medium">{formatPrice(totalPayment)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RentCalculator() {
  const [income, setIncome] = useState(50_000);
  const [debts, setDebts] = useState(0);
  const [desiredRent, setDesiredRent] = useState<string>("");

  const { maxRecommended, comfortableLow, availableAfterDebts } = useMemo(() => {
    const available = Math.max(0, income - debts);
    return {
      maxRecommended: available * 0.3,
      comfortableLow: available * 0.25,
      availableAfterDebts: available,
    };
  }, [income, debts]);

  const desiredNum = Number(desiredRent) || 0;
  const desiredPct = income > 0 && desiredNum > 0 ? (desiredNum / income) * 100 : null;
  const status =
    desiredPct === null ? null : desiredPct <= 30 ? "comfortable" : desiredPct <= 40 ? "stretching" : "too-high";
  const statusLabel = status === "comfortable" ? "Comfortable" : status === "stretching" ? "A stretch" : status === "too-high" ? "Likely too high" : null;
  const statusClass =
    status === "comfortable"
      ? "bg-green-100 text-green-800"
      : status === "stretching"
      ? "bg-yellow-100 text-yellow-800"
      : status === "too-high"
      ? "bg-red-100 text-red-800"
      : "";

  return (
    <div className="space-y-5 pt-2">
      <div>
        <Label htmlFor="rc-income">Monthly gross income</Label>
        <Input
          id="rc-income"
          type="number"
          min={0}
          value={income}
          onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="rc-debts">Other monthly debts (optional)</Label>
        <Input
          id="rc-debts"
          type="number"
          min={0}
          value={debts}
          onChange={(e) => setDebts(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="rc-desired">Desired monthly rent (optional)</Label>
        <Input
          id="rc-desired"
          type="number"
          min={0}
          value={desiredRent}
          onChange={(e) => setDesiredRent(e.target.value)}
          placeholder="See how it compares to your income"
          className="mt-1.5"
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Recommended rent budget</p>
        <p className="mt-1 font-display text-3xl font-semibold text-primary">
          {formatPrice(comfortableLow)}–{formatPrice(maxRecommended)}<span className="text-base font-normal text-muted-foreground"> /mo</span>
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">Based on the common 25–30% of income guideline, after your other monthly debts.</p>

        {statusLabel && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-card p-3">
            <div>
              <p className="text-sm font-medium">{formatPrice(desiredNum)} /mo is {desiredPct!.toFixed(0)}% of income</p>
              <p className="text-xs text-muted-foreground">Available after debts: {formatPrice(availableAfterDebts)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
