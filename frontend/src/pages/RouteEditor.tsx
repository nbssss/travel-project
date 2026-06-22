import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, MousePointerClick, Mountain, Pencil, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { NewRouteButton } from "@/components/NewRouteButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getRoute, poiKindLabel, type POI, type Route } from "@/data/mockRoutes";
import { routesApi, ApiError } from "@/lib/api";
import type { LucideIcon } from "lucide-react";

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

const difficulties: { value: Route["difficulty"]; label: string }[] = [
  { value: "easy", label: "łatwa" },
  { value: "moderate", label: "średnia" },
  { value: "hard", label: "trudna" },
];

// Haversine — projekt zaliczeniowy ma to obliczać
function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

// Polish plural for "punkt" (1 punkt, 2–4 punkty, 5+ punktów)
function punktLabel(n: number) {
  if (n === 1) return "punkt";
  const t = n % 10;
  const h = n % 100;
  return t >= 2 && t <= 4 && (h < 10 || h >= 20) ? "punkty" : "punktów";
}

const RouteEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const initial = slug && slug !== "new" ? getRoute(slug) ?? emptyRoute : emptyRoute;
  const [route, setRoute] = useState<Route>({ ...initial, pois: [...initial.pois], path: [...initial.path] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | undefined>();

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ)}&format=json&limit=1`,
        { headers: { "Accept-Language": "pl" } }
      );
      const data: { lat: string; lon: string }[] = await res.json();
      if (data.length > 0) {
        setFlyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        toast.error("Nie znaleziono miejsca.");
      }
    } catch {
      toast.error("Błąd wyszukiwania.");
    } finally {
      setSearching(false);
    }
  };

  const distance = useMemo(() => {
    if (route.path.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < route.path.length; i++) d += haversineKm(route.path[i - 1], route.path[i]);
    return Math.round(d * 10) / 10;
  }, [route.path]);

  const durationH = Math.round(distance * 0.4 * 10) / 10;

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

  const renamePoi = (id: string, name: string) =>
    setRoute((r) => ({ ...r, pois: r.pois.map((p) => (p.id === id ? { ...p, name } : p)) }));

  const isEmpty = route.path.length === 0 && route.pois.length === 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const created = await routesApi.create({
        title: route.title,
        description: route.description,
        region: route.region,
        country: route.country,
        difficulty: route.difficulty,
        isPublic: route.isPublic,
        tags: route.tags,
      });
      if (route.pois.length > 0) {
        await routesApi.upsertPoints(
          created.id,
          route.pois.map((poi, i) => ({
            order: i,
            lat: poi.coords[0],
            lng: poi.coords[1],
            elevation: poi.elevation,
            kind: poi.kind,
            name: poi.name,
            note: poi.note,
          }))
        );
      }
      toast.success("Trasa zapisana!");
      navigate("/app");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać trasy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Slim editor header */}
      <header
        className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6"
        style={{ borderColor: "hsl(var(--hairline))" }}
      >
        <Logo to="/app" />
        <div className="flex items-center gap-2">
          <NewRouteButton />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {/* Map base */}
        <div className="absolute inset-0">
          <RouteMap
            route={isEmpty ? { path: [], pois: [] } : route}
            onMapClick={handleMapClick}
            zoomControl={false}
            height="100%"
            flyTo={flyTo}
          />
        </div>

        {/* Hint banner */}
        <div
          className="pointer-events-none absolute left-1/2 top-6 z-[500] inline-flex -translate-x-1/2 items-center gap-2.5 rounded-full border bg-card/90 px-5 py-2.5 shadow-lift backdrop-blur"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          <MousePointerClick className="pulse-dot h-4 w-4 text-primary" />
          <span className="text-[13px] font-medium tracking-tight">Kliknij mapę, aby dodać kolejny punkt trasy</span>
        </div>

        {/* Top-left — metadata */}
        <div
          className="absolute left-4 top-6 z-[500] w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border bg-card/90 p-5 shadow-lift backdrop-blur md:left-6"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          <Link
            to="/app"
            className="mb-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Anuluj i wróć
          </Link>

          {/* Geocoding search */}
          <div className="mb-4">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Wyszukaj miejsce na mapie</span>
            <div className="flex gap-1.5">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Np. Rysy, Tatry..."
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary"
                style={{ borderColor: "hsl(var(--hairline))" }}
              />
              <Button size="sm" variant="outline" onClick={handleSearch} disabled={searching} aria-label="Szukaj">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Nazwa trasy</span>
            <input
              value={route.title}
              onChange={(e) => setRoute({ ...route, title: e.target.value })}
              placeholder="Nazwa trasy"
              className="w-full border-b bg-transparent py-1.5 font-display text-xl font-medium tracking-tight outline-none transition-colors focus:border-primary"
              style={{ borderColor: "hsl(var(--hairline))" }}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Krótki opis</span>
            <Textarea
              value={route.description}
              onChange={(e) => setRoute({ ...route, description: e.target.value })}
              placeholder="Np. Jesienna pętla przez las bukowy..."
              rows={2}
              className="resize-none"
            />
          </label>

          <div className="mt-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trudność</div>
            <div
              className="inline-flex w-full rounded-md border bg-secondary p-1"
              style={{ borderColor: "hsl(var(--hairline))" }}
            >
              {difficulties.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setRoute({ ...route, difficulty: d.value })}
                  className={`flex-1 rounded px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                    route.difficulty === d.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live metrics */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Metric icon={MapPin} value={distance.toFixed(1)} unit="km" label="Dystans" />
            <Metric icon={Clock} value={durationH.toFixed(1)} unit="h" label="Czas" />
            <Metric icon={Mountain} value={String(route.pois.length)} unit="" label="POI" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app">
                <X className="h-4 w-4" /> Anuluj
              </Link>
            </Button>
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving || isEmpty}>
              <Save className="h-4 w-4" /> {saving ? "Zapisuję…" : "Zapisz trasę"}
            </Button>
          </div>
        </div>

        {/* Bottom-right — POI list */}
        <aside
          className="absolute bottom-6 right-4 z-[500] flex max-h-[55vh] w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border bg-card/90 shadow-lift backdrop-blur md:right-6"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          <div
            className="flex items-center justify-between border-b p-4"
            style={{ borderColor: "hsl(var(--hairline))" }}
          >
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Punkty trasy</div>
              <div className="font-display text-base font-medium tracking-tight">
                {route.pois.length} {punktLabel(route.pois.length)} na trasie
              </div>
            </div>
            {route.pois.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setRoute({ ...route, pois: [], path: [] })}>
                <Trash2 className="h-3.5 w-3.5" /> Wyczyść
              </Button>
            )}
          </div>

          <ol className="flex-1 overflow-y-auto p-2">
            {route.pois.map((poi, i) => (
              <li
                key={poi.id}
                className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-secondary/60"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                    i === 0 ? "bg-primary text-primary-foreground" : "border bg-card text-foreground"
                  }`}
                  style={i === 0 ? undefined : { borderColor: "hsl(var(--hairline))" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {editingId === poi.id ? (
                    <input
                      autoFocus
                      defaultValue={poi.name}
                      onBlur={(e) => {
                        renamePoi(poi.id, e.target.value);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full border-b border-primary bg-transparent text-sm font-medium outline-none"
                    />
                  ) : (
                    <div className="truncate text-sm font-medium">{poi.name}</div>
                  )}
                  <div className="truncate text-xs text-muted-foreground">
                    {poiKindLabel[poi.kind]}
                    {poi.note ? ` · ${poi.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setEditingId(poi.id)}
                    aria-label="Edytuj punkt"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removePoi(poi.id)}
                    aria-label="Usuń punkt"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {route.pois.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Brak punktów. Kliknij mapę, aby dodać pierwszy.
              </div>
            )}
          </ol>
        </aside>
      </div>
    </div>
  );
};

function Metric({ icon: Icon, value, unit, label }: { icon: LucideIcon; value: string; unit: string; label: string }) {
  return (
    <div className="rounded-md border bg-secondary/50 p-2.5" style={{ borderColor: "hsl(var(--hairline))" }}>
      <Icon className="h-3.5 w-3.5 text-primary" />
      <div className="mt-1.5 flex items-baseline gap-0.5">
        <span className="data-num font-display text-lg font-medium leading-none tracking-tight">{value}</span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  );
}

export default RouteEditor;
