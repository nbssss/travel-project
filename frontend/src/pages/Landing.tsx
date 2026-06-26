import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, LogOut, Map as MapIcon, Mountain, Share2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RouteMap } from "@/components/RouteMap";
import { Fireworks } from "@/components/Fireworks";
import { routeOfTheDay } from "@/data/mockRoutes";
import { useAuth } from "@/lib/auth";

const hairline = { borderColor: "hsl(var(--hairline))" };

const Landing = () => {
  const featured = routeOfTheDay;
  const navigate = useNavigate();
  const { isAuthenticated, userName, logout } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // flaga mounted zapobiega miganiu motywu (fajerwerki) na pierwszym renderze
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const isPride = mounted && theme === "pride";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {isPride && <Fireworks key="pride-fireworks" />}
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur" style={hairline}>
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {isAuthenticated && <Link to="/app" className="hover:text-foreground">Moje trasy</Link>}
            <Link to="/app/explore" className="hover:text-foreground">Odkrywaj</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/app/profile")}
                  aria-label="Profil"
                  title={userName ?? "Profil"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {userName ? userName[0].toUpperCase() : "?"}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Wyloguj</span>
                </button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">Zaloguj</Link></Button>
                <Button size="sm" asChild><Link to="/register">Załóż konto</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
            Planuj (nie tylko) trasy górskie na mapie.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Zaznacz punkty na mapie, a aplikacja policzy dystans i przewyższenie.
            Eksportuj trasę do GPX i udostępniaj ją innym.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild><Link to="/register">Załóż konto</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/app/explore">Zobacz przykłady</Link></Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card" style={hairline}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={hairline}>
            <span className="text-xs text-muted-foreground">{featured.title}</span>
            <div className="flex gap-3 text-[11px] text-muted-foreground data-num">
              <span>{featured.distanceKm} km</span>
              <span>↑ {featured.ascentM} m</span>
              <span>{featured.durationH} h</span>
            </div>
          </div>
          <div className="h-[380px]">
            <RouteMap route={featured} interactive height="100%" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t" style={hairline}>
        <div className="container py-16 md:py-20">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Funkcje</h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title}>
                <f.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — tylko dla niezalogowanych */}
      {!isAuthenticated && (
        <section className="border-t" style={hairline}>
          <div className="container flex flex-col items-start justify-between gap-4 py-12 md:flex-row md:items-center">
            <p className="text-lg">Gotowy, żeby zaplanować pierwszą trasę?</p>
            <Button asChild><Link to="/register">Załóż konto</Link></Button>
          </div>
        </section>
      )}

      <footer className="border-t" style={hairline}>
        <div className="container flex items-center justify-between py-8 text-xs text-muted-foreground">
          <Logo />
          <Link to="/app/explore" className="transition-colors hover:text-foreground">Odkrywaj trasy</Link>
        </div>
      </footer>
    </div>
  );
};

const features = [
  { icon: MapIcon, title: "Edytor na mapie", desc: "Klikasz mapę, dodajesz punkty, układasz trasę." },
  { icon: Mountain, title: "Auto-statystyki", desc: "Dystans i suma podejść liczone automatycznie." },
  { icon: Download, title: "Eksport GPX", desc: "Pobierz trasę do zegarka lub nawigacji." },
  { icon: Share2, title: "Udostępnianie", desc: "Publiczny link albo trasa tylko dla znajomych." },
];

export default Landing;
