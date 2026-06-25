import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, Heart, ImagePlus, Mountain, Route as RouteIcon, Timer, MapPin, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { routesApi, ApiError, type RoutePhotoDto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { poiKindLabel } from "@/data/mockRoutes";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5134";

const RouteDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { userName } = useAuth();
  const queryClient = useQueryClient();

  const { data: route, isLoading, isError } = useQuery({
    queryKey: ["route", slug],
    queryFn: () => routesApi.bySlug(slug!),
    enabled: !!slug,
  });

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [photos, setPhotos] = useState<RoutePhotoDto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (route) {
      setLiked(route.isLikedByMe ?? false);
      setLikesCount(route.likesCount ?? 0);
      setPhotos(route.photos ?? []);
    }
  }, [route]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !route) return;
    setUploadingPhoto(true);
    try {
      const photo = await routesApi.uploadPhoto(route.id, file);
      setPhotos((prev) => [...prev, photo]);
      queryClient.invalidateQueries({ queryKey: ["route", slug] });
      toast.success("Zdjęcie dodane!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nie udało się wgrać zdjęcia.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    if (!route) return;
    try {
      await routesApi.deletePhoto(route.id, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Zdjęcie usunięte.");
    } catch {
      toast.error("Nie udało się usunąć zdjęcia.");
    }
  };

  const handleLike = async () => {
    if (!route) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => c + (newLiked ? 1 : -1));
    try {
      const res = newLiked
        ? await routesApi.like(route.id)
        : await routesApi.unlike(route.id);
      setLikesCount(res.likesCount);
    } catch {
      setLiked(!newLiked);
      setLikesCount((c) => c + (newLiked ? -1 : 1));
    }
  };

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
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  liked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-hairline text-muted-foreground hover:border-primary hover:text-primary"
                }`}
                style={liked ? undefined : { borderColor: "hsl(var(--hairline))" }}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                <span className="data-num">{likesCount}</span>
              </button>
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
                <RouteMap route={mapRoute} height="100%" snap />
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

          {/* Galeria zdjęć */}
          {(photos.length > 0 || isOwner) && (
            <div className="lg:col-span-2">
              <div className="rounded-xl border p-6" style={{ borderColor: "hsl(var(--hairline))" }}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-xl font-medium">Zdjęcia</h2>
                  {isOwner && photos.length < 3 && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto
                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        : <ImagePlus className="h-4 w-4" />}
                      Dodaj zdjęcie
                    </Button>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handlePhotoUpload}
                />

                {photos.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Brak zdjęć. Kliknij „Dodaj zdjęcie", aby dodać pierwsze.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border" style={{ borderColor: "hsl(var(--hairline))" }}>
                        <img
                          src={`${API_URL}${photo.url}`}
                          alt=""
                          className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setLightbox(`${API_URL}${photo.url}`)}
                        />
                        {isOwner && (
                          <button
                            onClick={() => handlePhotoDelete(photo.id)}
                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                            aria-label="Usuń zdjęcie"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
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
