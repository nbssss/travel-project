import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, MousePointerClick, Mountain, Pencil, Save, Search, TrendingDown, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { NewRouteButton } from "@/components/NewRouteButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RouteMap } from "@/components/RouteMap";
import { ElevationProfile } from "@/components/ElevationProfile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { poiKindLabel, type POI, type Route } from "@/data/mockRoutes";
import { routesApi, ApiError, type RouteDetailDto } from "@/lib/api";
import { snapToTrails, elevationForPoi, type RouteMetrics } from "@/lib/routing";
import { z } from "zod";
import type { LucideIcon } from "lucide-react";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Tytuł jest wymagany.")
  .max(200, "Tytuł może mieć max. 200 znaków.");

// ── Transport modes ──────────────────────────────────────────────────────────
const TRANSPORT_MODES = [
  { id: "hiking"  as const, label: "Pieszo",   emoji: "🦶🏼", profile: "hiking-mountain" },
  { id: "cycling" as const, label: "Rower",    emoji: "🛞", profile: "fastbike"        },
] as const;
type TransportMode = (typeof TRANSPORT_MODES)[number]["id"];

// ── Difficulty — wybierana ręcznie przez użytkownika (kafelki) ───────────────
const DIFFICULTIES = [
  { id: "easy"     as const, label: "Łatwa"   },
  { id: "moderate" as const, label: "Średnia" },
  { id: "hard"     as const, label: "Trudna"  },
] as const;

// ── Naismith's rule for average hiker: 3.5 km/h base + 300 m ascent per hour ─
function naismiithH(distanceKm: number, ascentM: number): number {
  return distanceKm / 3.5 + ascentM / 300;
}

// ── Haversine fallback (straight-line distance while BRouter loads) ───────────
function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

function punktLabel(n: number) {
  if (n === 1) return "punkt";
  const t = n % 10, h = n % 100;
  return t >= 2 && t <= 4 && (h < 10 || h >= 20) ? "punkty" : "punktów";
}

const emptyRoute: Route = {
  id: "new", slug: "new", title: "", region: "", country: "Polska",
  difficulty: "moderate", distanceKm: 0, ascentM: 0, durationH: 0,
  description: "", author: { name: "", initials: "" }, isPublic: true,
  updatedAt: new Date().toISOString().slice(0, 10), path: [], pois: [], tags: [],
};

// Mapuje trasę z API na model edytora (punkty → równoległe tablice pois/path)
function dtoToEditorRoute(d: RouteDetailDto): Route {
  const pts = [...d.points].sort((a, b) => a.order - b.order);
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    region: d.region ?? "",
    country: d.country ?? "Polska",
    difficulty: d.difficulty as Route["difficulty"],
    distanceKm: d.distanceKm,
    ascentM: d.ascentM,
    durationH: d.durationH,
    description: d.description ?? "",
    author: { name: d.ownerUserName ?? "", initials: "" },
    isPublic: d.isPublic,
    updatedAt: d.updatedAt,
    path: pts.map((p) => [p.lat, p.lng] as [number, number]),
    pois: pts.map((p, i) => ({
      id: `loaded-${i}`,
      name: p.name ?? `Punkt ${i + 1}`,
      kind: p.kind as POI["kind"],
      coords: [p.lat, p.lng] as [number, number],
      elevation: p.elevation,
      note: p.note,
    })),
    tags: d.tags ?? [],
  };
}

// ── Geocoding (Nominatim) ─────────────────────────────────────────────────────
type GeoSuggestion = { name: string; lat: number; lng: number };
// Prosty cache w pamięci, by ograniczyć zapytania do Nominatim (limit 1 req/s).
const geoCache = new Map<string, GeoSuggestion[]>();

// ── Component ────────────────────────────────────────────────────────────────
const RouteEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!slug && slug !== "new";

  const { data: existing, isLoading, isError } = useQuery({
    queryKey: ["route", slug],
    queryFn: () => routesApi.bySlug(slug!),
    enabled: isEditing,
  });

  const [route, setRoute] = useState<Route>({ ...emptyRoute, pois: [], path: [] });
  const [syncedExisting, setSyncedExisting] = useState<typeof existing>(undefined);

  // Wypełnij formularz danymi z API przy wejściu w tryb edycji — wzorzec "set-during-render"
  if (existing && existing !== syncedExisting) {
    setSyncedExisting(existing);
    setRoute(dtoToEditorRoute(existing));
  }
  const [transport, setTransport] = useState<TransportMode>("hiking");
  const [routedMetrics, setRoutedMetrics] = useState<RouteMetrics | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | undefined>();
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Autocomplete: debounce + cache zapytań do Nominatim ────────────────────
  useEffect(() => {
    const q = searchQ.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.length < 3) { setSuggestions([]); return; }
    const cached = geoCache.get(q);
    if (cached) { setSuggestions(cached); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6`,
          { headers: { "Accept-Language": "pl" }, signal: controller.signal },
        );
        const data: { display_name: string; lat: string; lon: string }[] = await res.json();
        const items = data.map((d) => ({ name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }));
        geoCache.set(q, items);
        setSuggestions(items);
      } catch { /* abort / sieć */ }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQ]);

  const selectSuggestion = (s: GeoSuggestion) => {
    setFlyTo([s.lat, s.lng]);
    setSearchQ(s.name.split(",")[0]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ── Routing: call BRouter when POIs or transport mode changes ──────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (route.pois.length < 2) { setRoutedMetrics(null); return; }
    const mode = TRANSPORT_MODES.find((m) => m.id === transport)!;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      snapToTrails(route.pois.map((p) => p.coords), mode.profile, controller.signal)
        .then((metrics) => setRoutedMetrics(metrics));
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [route.pois, transport]);

  // ── Metrics: BRouter values when available, Haversine fallback ─────────────
  const fallbackKm = useMemo(() => {
    if (route.path.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < route.path.length; i++) d += haversineKm(route.path[i - 1], route.path[i]);
    return Math.round(d * 10) / 10;
  }, [route.path]);

  const displayKm      = routedMetrics?.distanceKm ?? fallbackKm;
  const displayAscent  = routedMetrics?.ascentM    ?? 0;
  const displayDescent = routedMetrics?.descentM   ?? 0;
  // Naismith dla przeciętnego piechura; gdy BRouter zwróci dane, używamy jego dystansu + przewyższenia
  const displayDurH   = Math.round(naismiithH(displayKm, displayAscent) * 10) / 10;

  // ── POI z wysokością: dla każdego POI bez elevation bierzemy wysokość
  //    najbliższego wierzchołka geometrii BRoutera (źródło: routedMetrics). ──
  const poisWithEle = useMemo<POI[]>(() => {
    if (!routedMetrics) return route.pois;
    return route.pois.map((p) =>
      p.elevation != null
        ? p
        : { ...p, elevation: elevationForPoi(p.coords, routedMetrics.path, routedMetrics.profile) },
    );
  }, [route.pois, routedMetrics]);

  // ── Map: use BRouter path when available, straight-line fallback ───────────
  const mapRoute = useMemo(() => ({
    path: routedMetrics?.path ?? route.path,
    pois: poisWithEle,
  }), [routedMetrics, route.path, poisWithEle]);

  // ── Geocoding search ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ)}&format=json&limit=1`,
        { headers: { "Accept-Language": "pl" } },
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

  // ── POI management ──────────────────────────────────────────────────────────
  // Współrzędne mogą być już przyciągnięte przez RouteMap do szczytu/szlaku (meta).
  const handleMapClick = (latlng: [number, number], meta?: { kind?: POI["kind"]; name?: string; elevation?: number }) => {
    const newPoi: POI = {
      id: `p${Date.now()}`,
      name: meta?.name ?? `Punkt ${route.pois.length + 1}`,
      kind: meta?.kind ?? (route.pois.length === 0 ? "start" : "waypoint"),
      coords: latlng,
      elevation: meta?.elevation,
    };
    setRoute((r) => ({ ...r, pois: [...r.pois, newPoi], path: [...r.path, latlng] }));
  };

  const removePoi = (id: string) => {
    setRoute((r) => {
      const idx = r.pois.findIndex((p) => p.id === id);
      if (idx === -1) return r;
      return { ...r, pois: r.pois.filter((p) => p.id !== id), path: r.path.filter((_, i) => i !== idx) };
    });
  };

  const renamePoi = (id: string, name: string) =>
    setRoute((r) => ({ ...r, pois: r.pois.map((p) => (p.id === id ? { ...p, name } : p)) }));

  const handlePoiMove = useCallback((index: number, latlng: [number, number]) => {
    setRoute((r) => ({
      ...r,
      pois: r.pois.map((p, i) => i === index ? { ...p, coords: latlng } : p),
      path: r.path.map((pt, i) => i === index ? latlng : pt),
    }));
  }, []);

  const isEmpty = route.pois.length === 0;

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const titleResult = titleSchema.safeParse(route.title);
    if (!titleResult.success) {
      const msg = titleResult.error.issues[0].message;
      setTitleError(msg);
      toast.error(msg);
      return;
    }
    setTitleError(null);

    setSaving(true);
    try {
      const body = {
        title: route.title.trim(),
        description: route.description,
        region: route.region,
        country: route.country,
        difficulty: route.difficulty,
        isPublic: route.isPublic,
        tags: route.tags,
      };
      const points = poisWithEle.map((poi, i) => ({
        order: i, lat: poi.coords[0], lng: poi.coords[1],
        elevation: poi.elevation, kind: poi.kind, name: poi.name, note: poi.note,
      }));
      // Metryki z BRoutera jako autorytatywne (Opcja B: backend ich nie nadpisuje).
      const metrics = routedMetrics
        ? { distanceKm: displayKm, ascentM: displayAscent, descentM: displayDescent, durationH: displayDurH }
        : undefined;

      if (isEditing) {
        await routesApi.update(route.id, body);
        await routesApi.upsertPoints(route.id, points, metrics);
        await queryClient.invalidateQueries({ queryKey: ["route", route.slug] });
        await queryClient.invalidateQueries({ queryKey: ["my-routes"] });
        await queryClient.invalidateQueries({ queryKey: ["recent-routes"] });
        toast.success("Trasa zaktualizowana!");
        navigate(`/app/route/${route.slug}`);
      } else {
        const created = await routesApi.create(body);
        if (points.length > 0) {
          await routesApi.upsertPoints(created.id, points, metrics);
        }
        toast.success("Trasa zapisana!");
        navigate("/app");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać trasy.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (isEditing && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Ładowanie trasy...
      </div>
    );
  }

  if (isEditing && isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-muted-foreground">Nie udało się wczytać trasy do edycji.</p>
        <Button variant="outline" size="sm" asChild><Link to="/app">Wróć</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6" style={{ borderColor: "hsl(var(--hairline))" }}>
        <Logo to="/app" />
        <div className="flex items-center gap-2">
          <NewRouteButton />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {/* Map */}
        <div className="absolute inset-0">
          <RouteMap
            route={isEmpty ? { path: [], pois: [] } : mapRoute}
            onMapClick={handleMapClick}
            onPoiMove={handlePoiMove}
            zoomControl={false}
            height="100%"
            flyTo={flyTo}
            transport={transport}
          />
        </div>

        {/* Hint banner */}
        <div className="pointer-events-none absolute left-1/2 top-6 z-[500] inline-flex -translate-x-1/2 items-center gap-2.5 rounded-full border bg-card/90 px-5 py-2.5 shadow-lift backdrop-blur" style={{ borderColor: "hsl(var(--hairline))" }}>
          <MousePointerClick className="pulse-dot h-4 w-4 text-primary" />
          <span className="text-[13px] font-medium tracking-tight">
            Kliknij mapę, aby dodać kolejny punkt trasy
          </span>
        </div>

        {/* Left panel — metadata */}
        <div className="absolute left-4 top-6 z-[500] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-card/90 shadow-lift backdrop-blur md:left-6" style={{ borderColor: "hsl(var(--hairline))" }}>
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-5">
          <Link to="/app" className="mb-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Anuluj i wróć
          </Link>

          {/* Place search */}
          <div className="relative mb-4">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Wyszukaj miejsce na mapie</span>
            <div className="flex gap-1.5">
              <input
                value={searchQ}
                onChange={(e) => { setSearchQ(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { if (suggestions.length) selectSuggestion(suggestions[0]); else { setShowSuggestions(false); handleSearch(); } }
                  if (e.key === "Escape") setShowSuggestions(false);
                }}
                placeholder="Np. Rysy, Tatry..."
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary"
                style={{ borderColor: "hsl(var(--hairline))" }}
              />
              <Button size="sm" variant="outline" onClick={() => { setShowSuggestions(false); handleSearch(); }} disabled={searching} aria-label="Szukaj">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-[600] mt-1 max-h-60 overflow-y-auto rounded-md border bg-card shadow-lift" style={{ borderColor: "hsl(var(--hairline))" }}>
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-secondary"
                    >
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span className="line-clamp-2">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Route name */}
          <label className="block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Nazwa trasy</span>
            <input
              value={route.title}
              onChange={(e) => { setRoute({ ...route, title: e.target.value }); if (titleError) setTitleError(null); }}
              placeholder="Np. Pętla przez Giewont"
              className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary ${titleError ? "border-destructive" : ""}`}
              style={titleError ? undefined : { borderColor: "hsl(var(--hairline))" }}
            />
            {titleError && <span className="mt-1 block text-xs text-destructive">{titleError}</span>}
          </label>

          {/* Description */}
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Krótki opis</span>
            <Textarea
              value={route.description}
              onChange={(e) => setRoute({ ...route, description: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </label>

          {/* Transport mode */}
          <div className="mt-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Środek transportu</div>
            <div className="inline-flex w-full rounded-md border bg-secondary p-1" style={{ borderColor: "hsl(var(--hairline))" }}>
              {TRANSPORT_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setTransport(m.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    transport === m.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty — wybór ręczny */}
          <div className="mt-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trudność</div>
            <div className="inline-flex w-full rounded-md border bg-secondary p-1" style={{ borderColor: "hsl(var(--hairline))" }}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setRoute((r) => ({ ...r, difficulty: d.id }))}
                  className={`flex flex-1 items-center justify-center rounded px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    route.difficulty === d.id
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
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric icon={MapPin}       value={displayKm.toFixed(1)}    unit="km" label="Dystans" />
            <Metric
              icon={Clock}
              value={displayDurH < 1 ? String(Math.round(displayDurH * 60)) : displayDurH.toFixed(1)}
              unit={displayDurH < 1 ? "min" : "h"}
              label="Czas"
            />
            <Metric icon={Mountain}     value={String(displayAscent)}   unit="m ↑" label="Podejście" />
            <Metric icon={TrendingDown} value={String(displayDescent)}  unit="m ↓" label="Zejście" />
          </div>

          {/* Elevation profile */}
          {routedMetrics && routedMetrics.profile.length > 1 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Profil wysokościowy</div>
              <ElevationProfile data={routedMetrics.profile} height={120} />
            </div>
          )}

          {/* Public toggle */}
          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5" style={{ borderColor: "hsl(var(--hairline))" }}>
            <div>
              <div className="text-sm font-medium">Publiczna trasa</div>
              <div className="text-[11px] text-muted-foreground">Widoczna dla wszystkich w sekcji Odkrywaj</div>
            </div>
            <button
              role="switch"
              aria-checked={route.isPublic}
              onClick={() => setRoute((r) => ({ ...r, isPublic: !r.isPublic }))}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${route.isPublic ? "bg-primary" : "bg-secondary"}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lift transition-transform ${route.isPublic ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </label>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app"><X className="h-4 w-4" /> Anuluj</Link>
            </Button>
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving || isEmpty}>
              <Save className="h-4 w-4" /> {saving ? "Zapisuję…" : isEditing ? "Zapisz zmiany" : "Zapisz trasę"}
            </Button>
          </div>
          </div>{/* /scroll */}
        </div>

        {/* Right panel — POI list */}
        <aside className="absolute bottom-6 right-4 z-[500] flex max-h-[55vh] w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border bg-card/90 shadow-lift backdrop-blur md:right-6" style={{ borderColor: "hsl(var(--hairline))" }}>
          <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "hsl(var(--hairline))" }}>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Punkty trasy</div>
              <div className="font-display text-base font-medium tracking-tight">
                {route.pois.length} {punktLabel(route.pois.length)} na trasie
              </div>
            </div>
            {route.pois.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => { setRoute({ ...route, pois: [], path: [] }); setRoutedMetrics(null); }}>
                <Trash2 className="h-3.5 w-3.5" /> Wyczyść
              </Button>
            )}
          </div>

          <ol className="flex-1 overflow-y-auto p-2">
            {poisWithEle.map((poi, i) => (
              <li key={poi.id} className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-secondary/60">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "border bg-card text-foreground"}`}
                  style={i === 0 ? undefined : { borderColor: "hsl(var(--hairline))" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {editingId === poi.id ? (
                    <input
                      autoFocus
                      defaultValue={poi.name}
                      onBlur={(e) => { renamePoi(poi.id, e.target.value); setEditingId(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingId(null); }}
                      className="w-full border-b border-primary bg-transparent text-sm font-medium outline-none"
                    />
                  ) : (
                    <div className="truncate text-sm font-medium">{poi.name}</div>
                  )}
                  <div className="truncate text-xs text-muted-foreground">
                    {poiKindLabel[poi.kind]}
                    {poi.elevation != null ? ` · ${Math.round(poi.elevation)} m n.p.m.` : ""}
                    {poi.note ? ` · ${poi.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setEditingId(poi.id)} aria-label="Edytuj punkt" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removePoi(poi.id)} aria-label="Usuń punkt" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive">
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
