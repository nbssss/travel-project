import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RouteCard } from "@/components/RouteCard";
import { routesApi, usersApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5134";

const Profile = () => {
  const { userName } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"routes" | "liked">("routes");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: routes = [] } = useQuery({
    queryKey: ["my-routes"],
    queryFn: routesApi.mine,
  });

  const { data: likedRoutes = [] } = useQuery({
    queryKey: ["liked-routes"],
    queryFn: routesApi.liked,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: usersApi.profile,
  });

  const initials = userName ? userName.slice(0, 2).toUpperCase() : "??";
  const avatarSrc = profile?.avatarUrl ? `${API_URL}${profile.avatarUrl}` : null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await usersApi.uploadAvatar(file);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Awatar zaktualizowany!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nie udało się wgrać zdjęcia.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const totalKm = routes.reduce((s, r) => s + r.distanceKm, 0);
  const totalAscent = routes.reduce((s, r) => s + r.ascentM, 0);

  return (
    <AppShell>
      <div className="container mx-auto max-w-4xl py-8 md:py-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          {/* Avatar z przyciskiem uploadu */}
          <button
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Zmień zdjęcie profilowe"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Awatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-hero font-display text-3xl font-medium text-primary-foreground">
                {initials}
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {uploading
                ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Camera className="h-5 w-5 text-white" />
              }
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleAvatarChange}
          />

          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Profil</div>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">{userName ?? "—"}</h1>
            <p className="mt-1 text-xs text-muted-foreground">Kliknij zdjęcie, aby je zmienić</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-hairline" style={{ borderColor: "hsl(var(--hairline))" }}>
          <Big n={routes.length} label="trasy" />
          <Big n={totalKm.toFixed(1)} unit="km" label="łącznie" />
          <Big n={totalAscent.toLocaleString("pl-PL")} unit="m ↑" label="podejścia" />
        </div>

        {/* Tabs */}
        <div className="mt-10 flex gap-0 border-b" style={{ borderColor: "hsl(var(--hairline))" }}>
          <TabBtn active={tab === "routes"} onClick={() => setTab("routes")}>
            Moje trasy
          </TabBtn>
          <TabBtn active={tab === "liked"} onClick={() => setTab("liked")}>
            Ulubione
            {likedRoutes.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {likedRoutes.length}
              </span>
            )}
          </TabBtn>
        </div>

        {tab === "routes" && (
          <div className="mt-6">
            {routes.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground" style={{ borderColor: "hsl(var(--hairline))" }}>
                Nie masz jeszcze żadnych tras.{" "}
                <Link to="/app/route/new" className="text-primary hover:underline">Dodaj pierwszą!</Link>
              </div>
            ) : (
              <ul className="divide-y rounded-xl border" style={{ borderColor: "hsl(var(--hairline))" }}>
                {routes.map((r) => (
                  <li key={r.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                    <Link to={`/app/route/${r.slug}`} className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.region ?? "—"} · {new Date(r.updatedAt).toLocaleDateString("pl-PL")}
                      </div>
                    </Link>
                    <div className="data-num text-xs text-muted-foreground">{r.distanceKm} km · ↑ {r.ascentM} m</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "liked" && (
          <div className="mt-6">
            {likedRoutes.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground" style={{ borderColor: "hsl(var(--hairline))" }}>
                Nie masz jeszcze ulubionych tras. Polub jakąś trasę w sekcji{" "}
                <Link to="/app/explore" className="text-primary hover:underline">Odkrywaj</Link>!
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {likedRoutes.map((r) => (
                  <RouteCard key={r.id} route={r} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Big({ n, unit, label }: { n: number | string; unit?: string; label: string }) {
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

export default Profile;
