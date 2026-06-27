import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RouteCard } from "@/components/RouteCard";
import { Button } from "@/components/ui/button";
import { routesApi, usersApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const Profile = () => {
  const { userName, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"routes" | "liked">("routes");

  // ── Change username ──────────────────────────────────────────────────────────
  const [newUserName, setNewUserName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // ── Delete account ───────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);

  const { data: routes = [] } = useQuery({
    queryKey: ["my-routes"],
    queryFn: routesApi.mine,
  });

  const { data: likedRoutes = [] } = useQuery({
    queryKey: ["liked-routes"],
    queryFn: routesApi.liked,
  });

  const initials = userName ? userName.slice(0, 2).toUpperCase() : "??";

  const totalKm = routes.reduce((s, r) => s + r.distanceKm, 0);
  const totalAscent = routes.reduce((s, r) => s + r.ascentM, 0);

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUserName.trim();
    if (trimmed.length < 3) {
      toast.error("Nazwa musi mieć co najmniej 3 znaki.");
      return;
    }
    setSavingName(true);
    try {
      await usersApi.changeUsername(trimmed);
      login(token!, trimmed);
      setNewUserName("");
      toast.success("Nazwa użytkownika została zmieniona.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nie udało się zmienić nazwy.");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Czy na pewno chcesz usunąć konto? Wszystkie Twoje trasy zostaną usunięte. Tej operacji nie można cofnąć.")) return;
    setDeleting(true);
    try {
      await usersApi.deleteAccount();
      logout();
      navigate("/");
      toast.success("Konto zostało usunięte.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nie udało się usunąć konta.");
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto max-w-4xl py-8 md:py-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-hero font-display text-3xl font-medium text-primary-foreground shadow-lift"
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Profil</div>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">{userName ?? "—"}</h1>
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

        {/* Account settings */}
        <div className="mt-12 space-y-4">
          <h2 className="font-display text-lg font-medium">Ustawienia konta</h2>

          {/* Change username */}
          <div className="rounded-xl border p-5" style={{ borderColor: "hsl(var(--hairline))" }}>
            <div className="text-sm font-medium">Zmień nazwę użytkownika</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Aktualna nazwa: <span className="font-medium text-foreground">{userName}</span></div>
            <form onSubmit={handleChangeUsername} className="mt-4 flex gap-2">
              <input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nowa nazwa użytkownika"
                minLength={3}
                maxLength={50}
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary"
                style={{ borderColor: "hsl(var(--hairline))" }}
              />
              <Button type="submit" size="sm" disabled={savingName || !newUserName.trim()}>
                {savingName ? "Zapisuję…" : "Zapisz"}
              </Button>
            </form>
          </div>

          {/* Delete account */}
          <div className="rounded-xl border border-destructive/30 p-5">
            <div className="text-sm font-medium text-destructive">Usuń konto</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Trwale usuwa konto oraz wszystkie Twoje trasy. Tej operacji nie można cofnąć.
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="mt-4"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? "Usuwam…" : "Usuń konto"}
            </Button>
          </div>
        </div>
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
