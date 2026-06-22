import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, Mountain, Route as RouteIcon, Timer, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { routesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { poiKindLabel } from "@/data/mockRoutes";

const RouteDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { userName } = useAuth();

  const { data: route, isLoading, isError } = useQuery({
    queryKey: ["route", slug],
    queryFn: () => routesApi.bySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="container py-24 text-center text-sm text-muted-foreground">Ładowanie trasy...</div>
      </AppShell>
    );
  }

  if (isError || !route) {
    return (
      <AppShell>
        <div className="container py-24 text-center">
          <p className="text-muted-foreground">Nie znaleziono trasy.</p>
          <Button variant="outline" className="mt-4" asChild><Link to="/app">Wróć</Link></Button>
        </div>
      </AppShell>
    );
  }

  const mapRoute = {
    path: route.points.map((p): [number, number] => [p.lat, p.lng]),
    pois: route.points.map((p) => ({
      kind: p.kind as keyof typeof poiKindLabel,
      coords: [p.lat, p.lng] as [number, number],
      name: p.name ?? `Punkt ${p.order + 1}`,
      elevation: p.elevation,
      note: p.note,
    })),
  };

  const isOwner = !!userName && userName === route.ownerUserName;

  return (
    <AppShell>
      <div className="border-b bg-gradient-soft" style={{ borderColor: "hsl(var(--hairline))" }}>
        <div className="container max-w-7xl py-8">
          <Link to="/app" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Moje trasy
          </Link>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {[route.region, route.country].filter(Boolean).join(" · ")}
                </span>
                <DifficultyBadge difficulty={route.difficulty} />
              </div>
              <h1 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl">{route.title}</h1>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-medium">
                  {route.ownerUserName?.[0]?.toUpperCase() ?? "?"}
                </span>
                <span>{route.ownerUserName ?? "—"}</span>
                <span>·</span>
                <span>zaktualizowano {new Date(route.updatedAt).toLocaleDateString("pl-PL")}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <Button variant="default" size="sm" asChild>
                  <Link to={`/app/route/${route.slug}/edit`}>
                    <Edit3 className="h-4 w-4" /> Modyfikuj
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-hairline md:grid-cols-4" style={{ borderColor: "hsl(var(--hairline))" }}>
          <Stat icon={<RouteIcon className="h-4 w-4" />} value={route.distanceKm} unit="km" label="Dystans" />
          <Stat icon={<Mountain className="h-4 w-4" />} value={route.ascentM} unit="m ↑" label="Suma podejść" />
          <Stat icon={<Timer className="h-4 w-4" />} value={route.durationH} unit="h" label="Szac. czas" />
          <Stat icon={<MapPin className="h-4 w-4" />} value={route.points.length} unit="" label="Punktów POI" />
        </div>

        {/* Map + sidebar */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border shadow-soft" style={{ borderColor: "hsl(var(--hairline))" }}>
              <div className="h-[520px]">
                <RouteMap route={mapRoute} height="100%" />
              </div>
            </div>

            {(route.description || (route.tags?.length ?? 0) > 0) && (
              <div className="mt-6 rounded-xl border p-6" style={{ borderColor: "hsl(var(--hairline))" }}>
                <h2 className="font-display text-xl font-medium">Opis</h2>
                {route.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{route.description}</p>
                )}
                {route.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {route.tags.map((t) => (
                      <span key={t} className="rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground" style={{ borderColor: "hsl(var(--hairline))" }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="rounded-xl border" style={{ borderColor: "hsl(var(--hairline))" }}>
            <div className="border-b p-5" style={{ borderColor: "hsl(var(--hairline))" }}>
              <h2 className="font-display text-lg font-medium">Punkty trasy</h2>
              <p className="text-xs text-muted-foreground">Po kolei od startu do mety</p>
            </div>
            {route.points.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Trasa nie ma jeszcze punktów.
              </div>
            ) : (
              <ol className="relative">
                {route.points.map((pt, i) => {
                  const kindKey = pt.kind as keyof typeof poiKindLabel;
                  const isStart = pt.kind === "start";
                  const isEnd = pt.kind === "summit" || pt.kind === "end";
                  return (
                    <li key={i} className="relative flex gap-4 border-b px-5 py-4 last:border-b-0" style={{ borderColor: "hsl(var(--hairline))" }}>
                      <div className="relative flex flex-col items-center">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                          isStart ? "bg-primary text-primary-foreground border-primary" :
                          isEnd ? "bg-card text-foreground" :
                          "bg-card text-foreground"
                        }`} style={{ borderColor: isStart ? undefined : "hsl(var(--hairline))" }}>
                          {i + 1}
                        </span>
                        {i < route.points.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pb-2">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {poiKindLabel[kindKey] ?? pt.kind}
                        </div>
                        <div className="mt-0.5 truncate text-sm font-medium">{pt.name ?? `Punkt ${i + 1}`}</div>
                        {pt.elevation != null && (
                          <div className="text-[11px] text-muted-foreground">{pt.elevation} m n.p.m.</div>
                        )}
                        {pt.note && (
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{pt.note}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
};

function Stat({ icon, value, unit, label }: { icon: React.ReactNode; value: number | string; unit: string; label: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="data-num font-display text-3xl font-medium tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default RouteDetail;
