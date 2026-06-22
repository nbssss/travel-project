import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RouteCard } from "@/components/RouteCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { routesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const filters = ["Wszystkie", "Łatwe", "Średnie", "Trudne"] as const;

const Dashboard = () => {
  const { userName } = useAuth();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Wszystkie");
  const [q, setQ] = useState("");

  const { data: routes = [], isLoading, isError } = useQuery({
    queryKey: ["my-routes"],
    queryFn: routesApi.mine,
  });

  const filtered = routes.filter((r) => {
    const matchQ = !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.region ?? "").toLowerCase().includes(q.toLowerCase());
    const matchF =
      filter === "Wszystkie" ||
      (filter === "Łatwe" && r.difficulty === "easy") ||
      (filter === "Średnie" && r.difficulty === "moderate") ||
      (filter === "Trudne" && r.difficulty === "hard");
    return matchQ && matchF;
  });

  const totalKm = routes.reduce((s, r) => s + r.distanceKm, 0);
  const totalAscent = routes.reduce((s, r) => s + r.ascentM, 0);

  return (
    <AppShell>
      <div className="container max-w-7xl py-8 md:py-12">
        <div className="flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Witaj, {userName}</div>
          <h1 className="font-display text-4xl font-medium tracking-tight">Twoje trasy</h1>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-hairline md:grid-cols-4" style={{ borderColor: "hsl(var(--hairline))" }}>
          <BigStat n={routes.length} label="zaplanowane" />
          <BigStat n={totalKm.toFixed(1)} unit="km" label="łącznie dystans" />
          <BigStat n={totalAscent.toLocaleString("pl-PL")} unit="m" label="suma podejść" />
          <BigStat n={routes.filter((r) => r.isPublic).length} label="publiczne" />
        </div>

        {/* Filters */}
        <div className="mt-10 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="rounded-full"
              >
                {f}
              </Button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj trasy lub regionu..." className="pl-9" />
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              Ładowanie tras...
            </div>
          )}
          {isError && (
            <div className="col-span-full rounded-xl border border-dashed py-16 text-center text-sm text-destructive">
              Błąd podczas pobierania tras.
            </div>
          )}
          {!isLoading && filtered.map((r) => (<RouteCard key={r.id} route={r} />))}
          {!isLoading && !isError && filtered.length === 0 && routes.length > 0 && (
            <div className="col-span-full rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              Brak tras pasujących do filtrów.
            </div>
          )}
          {!isLoading && !isError && routes.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              Nie masz jeszcze żadnych tras. Utwórz pierwszą w edytorze!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

function BigStat({ n, unit, label }: { n: number | string; unit?: string; label: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-baseline gap-1.5">
        <span className="data-num font-display text-3xl font-medium tracking-tight">{n}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  );
}

export default Dashboard;
