import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Save, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRoute, type POI, type Route } from "@/data/mockRoutes";

const emptyRoute: Route = {
  id: "new",
  slug: "new",
  title: "Nowa trasa",
  region: "",
  country: "Polska",
  difficulty: "moderate",
  distanceKm: 0,
  ascentM: 0,
  durationH: 0,
  description: "",
  author: { name: "Natalia B.", initials: "NB" },
  isPublic: false,
  updatedAt: new Date().toISOString().slice(0, 10),
  path: [],
  pois: [],
  tags: [],
};

// Haversine — projekt zaliczeniowy ma to obliczać
function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

const RouteEditor = () => {
  const { slug } = useParams();
  const initial = slug && slug !== "new" ? getRoute(slug) ?? emptyRoute : emptyRoute;
  const [route, setRoute] = useState<Route>({ ...initial, pois: [...initial.pois], path: [...initial.path] });

  const distance = useMemo(() => {
    if (route.path.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < route.path.length; i++) d += haversineKm(route.path[i - 1], route.path[i]);
    return Math.round(d * 10) / 10;
  }, [route.path]);

  const handleMapClick = (latlng: [number, number]) => {
    const newPoi: POI = {
      id: `p${Date.now()}`,
      name: `Punkt ${route.pois.length + 1}`,
      kind: route.pois.length === 0 ? "start" : "waypoint",
      coords: latlng,
    };
    setRoute((r) => ({ ...r, pois: [...r.pois, newPoi], path: [...r.path, latlng] }));
  };

  const removePoi = (id: string) => {
    setRoute((r) => {
      const idx = r.pois.findIndex((p) => p.id === id);
      if (idx === -1) return r;
      const pois = r.pois.filter((p) => p.id !== id);
      const path = r.path.filter((_, i) => i !== idx);
      return { ...r, pois, path };
    });
  };

  return (
    <AppShell>
      <div className="border-b bg-gradient-soft" style={{ borderColor: "hsl(var(--hairline))" }}>
        <div className="container max-w-7xl py-6">
          <Link to="/app" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Wróć
          </Link>
          <div className="mt-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                value={route.title}
                onChange={(e) => setRoute({ ...route, title: e.target.value })}
                className="border-0 bg-transparent p-0 font-display !text-3xl !font-medium tracking-tight focus-visible:ring-0 md:!text-4xl"
              />
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>Klikaj na mapie, żeby dodać punkty trasy</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Anuluj</Button>
              <Button variant="default" size="sm"><Save className="h-4 w-4" /> Zapisz trasę</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map (largest) */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border shadow-soft" style={{ borderColor: "hsl(var(--hairline))" }}>
              <div className="h-[600px]">
                <RouteMap
                  route={route.path.length === 0 ? { ...route, path: [], pois: [] } : route}
                  onMapClick={handleMapClick}
                  height="100%"
                />
              </div>
            </div>

            {/* Live stats */}
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-hairline" style={{ borderColor: "hsl(var(--hairline))" }}>
              <LiveStat value={distance} unit="km" label="Dystans (Haversine)" />
              <LiveStat value={route.pois.length} unit="" label="Punkty POI" />
              <LiveStat value={Math.round(distance * 0.4 * 10) / 10} unit="h" label="Szac. czas" />
            </div>
          </div>

          {/* Side panel */}
          <aside className="space-y-6">
            <div className="rounded-xl border p-5" style={{ borderColor: "hsl(var(--hairline))" }}>
              <h3 className="font-display text-base font-medium">Szczegóły</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs">Region</Label>
                  <Input value={route.region} onChange={(e) => setRoute({ ...route, region: e.target.value })} placeholder="np. Tatry Wysokie" />
                </div>
                <div>
                  <Label className="text-xs">Trudność</Label>
                  <Select value={route.difficulty} onValueChange={(v) => setRoute({ ...route, difficulty: v as Route["difficulty"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">łatwa</SelectItem>
                      <SelectItem value="moderate">średnia</SelectItem>
                      <SelectItem value="hard">trudna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Opis</Label>
                  <Textarea value={route.description} onChange={(e) => setRoute({ ...route, description: e.target.value })} rows={4} placeholder="Krótki opis trasy..." />
                </div>
              </div>
            </div>

            <div className="rounded-xl border" style={{ borderColor: "hsl(var(--hairline))" }}>
              <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "hsl(var(--hairline))" }}>
                <div>
                  <h3 className="font-display text-base font-medium">Punkty trasy</h3>
                  <p className="text-xs text-muted-foreground">{route.pois.length} dodanych</p>
                </div>
                {route.pois.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setRoute({ ...route, pois: [], path: [] })}>
                    <Trash2 className="h-3.5 w-3.5" /> Wyczyść
                  </Button>
                )}
              </div>
              {route.pois.length === 0 ? (
                <div className="px-5 py-12 text-center text-xs text-muted-foreground">
                  Kliknij mapę, aby dodać pierwszy punkt.
                </div>
              ) : (
                <ol className="max-h-96 overflow-y-auto">
                  {route.pois.map((poi, i) => (
                    <li key={poi.id} className="group flex items-center gap-3 px-5 py-3 hairline last:border-b-0">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium ${i === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
                        {i + 1}
                      </span>
                      <Input
                        value={poi.name}
                        onChange={(e) =>
                          setRoute({
                            ...route,
                            pois: route.pois.map((p) => (p.id === poi.id ? { ...p, name: e.target.value } : p)),
                          })
                        }
                        className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                      />
                      <button
                        onClick={() => removePoi(poi.id)}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
};

function LiveStat({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="data-num font-display text-2xl font-medium tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default RouteEditor;
