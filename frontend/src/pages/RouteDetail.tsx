import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Edit3, Mountain, Route as RouteIcon, Share2, Timer, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { getRoute } from "@/data/mockRoutes";

const kindLabel: Record<string, string> = {
  start: "Start",
  end: "Meta",
  viewpoint: "Punkt widokowy",
  shelter: "Schronisko",
  summit: "Szczyt",
  lake: "Jezioro",
  waypoint: "Punkt",
};

const RouteDetail = () => {
  const { slug } = useParams();
  const route = slug ? getRoute(slug) : undefined;

  if (!route) {
    return (
      <AppShell>
        <div className="container py-24 text-center">
          <p className="text-muted-foreground">Nie znaleziono trasy.</p>
          <Button variant="outline" className="mt-4" asChild><Link to="/app">Wróć</Link></Button>
        </div>
      </AppShell>
    );
  }

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
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{route.region} · {route.country}</span>
                <DifficultyBadge difficulty={route.difficulty} />
              </div>
              <h1 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl">{route.title}</h1>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-medium">{route.author.initials}</span>
                <span>{route.author.name}</span>
                <span>·</span>
                <span>zaktualizowano {route.updatedAt}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Share2 className="h-4 w-4" /> Udostępnij</Button>
              <Button variant="outline" size="sm"><Download className="h-4 w-4" /> GPX</Button>
              <Button variant="default" size="sm" asChild>
                <Link to={`/app/route/${route.slug}/edit`}><Edit3 className="h-4 w-4" /> Edytuj</Link>
              </Button>
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
          <Stat icon={<User className="h-4 w-4" />} value={route.pois.length} unit="" label="Punktów POI" />
        </div>

        {/* Map + sidebar */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border shadow-soft" style={{ borderColor: "hsl(var(--hairline))" }}>
              <div className="h-[520px]">
                <RouteMap route={route} height="100%" />
              </div>
            </div>
            <div className="mt-6 rounded-xl border p-6" style={{ borderColor: "hsl(var(--hairline))" }}>
              <h2 className="font-display text-xl font-medium">Opis</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{route.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {route.tags.map((t) => (<span key={t} className="chip">#{t}</span>))}
              </div>
            </div>
          </div>

          <aside className="rounded-xl border" style={{ borderColor: "hsl(var(--hairline))" }}>
            <div className="border-b p-5" style={{ borderColor: "hsl(var(--hairline))" }}>
              <h2 className="font-display text-lg font-medium">Punkty trasy</h2>
              <p className="text-xs text-muted-foreground">Po kolei od startu do mety</p>
            </div>
            <ol className="relative">
              {route.pois.map((poi, i) => (
                <li key={poi.id} className="relative flex gap-4 px-5 py-4 hairline last:border-b-0">
                  <div className="relative flex flex-col items-center">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium ${
                      poi.kind === "start" ? "bg-primary text-primary-foreground border-primary" :
                      poi.kind === "summit" || poi.kind === "end" ? "bg-success/15 text-success border-success/30" :
                      "bg-card text-foreground"
                    }`} style={{ borderColor: poi.kind === "start" ? undefined : "hsl(var(--hairline))" }}>
                      {i + 1}
                    </span>
                    {i < route.pois.length - 1 && <span className="mt-1 w-px flex-1 bg-hairline" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{kindLabel[poi.kind]}</div>
                    <div className="mt-0.5 truncate text-sm font-medium">{poi.name}</div>
                    {poi.elevation && <div className="data-num text-[11px] text-muted-foreground">{poi.elevation} m n.p.m.</div>}
                    {poi.note && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{poi.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </AppShell>
  );
};

function Stat({ icon, value, unit, label }: { icon: React.ReactNode; value: number | string; unit: string; label: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[11px] uppercase tracking-[0.14em]">{label}</span></div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="data-num font-display text-3xl font-medium tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default RouteDetail;
