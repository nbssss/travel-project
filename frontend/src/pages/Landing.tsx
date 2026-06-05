import { Link } from "react-router-dom";
import { ArrowRight, Compass, Download, Map as MapIcon, Mountain, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RouteMap } from "@/components/RouteMap";
import { mockRoutes } from "@/data/mockRoutes";

const Landing = () => {
  const featured = mockRoutes[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur" style={{ borderColor: "hsl(var(--hairline))" }}>
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Funkcje</a>
            <a href="#how" className="hover:text-foreground">Jak to działa</a>
            <Link to="/app/explore" className="hover:text-foreground">Odkrywaj</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild><Link to="/login">Zaloguj</Link></Button>
            <Button variant="hero" size="sm" asChild><Link to="/register">Załóż konto</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="container grid gap-12 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-6">
            <div className="chip mb-6"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> projekt zaliczeniowy PAI · UJ 2025/2026</div>
            <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              Trasy, które<br/>
              <span className="italic text-primary">warto zapamiętać</span>.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              Planuj wycieczki na mapie, zaznaczaj punkty zainteresowania, eksportuj do GPX i dziel się trasami z innymi podróżnikami.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="hero" asChild>
                <Link to="/register">Zacznij za darmo <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/app/explore">Zobacz przykłady</Link>
              </Button>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-6 border-t pt-6" style={{ borderColor: "hsl(var(--hairline))" }}>
              <Stat n="3" label="zasoby API" />
              <Stat n="7+" label="elementów dodatkowych" />
              <Stat n="∞" label="możliwych tras" />
            </dl>
          </div>

          <div className="md:col-span-6">
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-primary/5 blur-2xl" />
              <div className="relative overflow-hidden rounded-xl border bg-card shadow-lift" style={{ borderColor: "hsl(var(--hairline))" }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "hsl(var(--hairline))" }}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span>{featured.title}</span>
                  </div>
                  <div className="flex gap-3 text-[11px] text-muted-foreground data-num">
                    <span>{featured.distanceKm} km</span>
                    <span>↑ {featured.ascentM} m</span>
                    <span>{featured.durationH} h</span>
                  </div>
                </div>
                <div className="h-[420px]">
                  <RouteMap route={featured} interactive height="100%" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20 md:py-28">
        <div className="grid gap-2 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Funkcje</div>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
              Wszystko, czego potrzebujesz w jednym miejscu.
            </h2>
          </div>
          <p className="md:col-span-6 md:col-start-7 text-muted-foreground self-end">
            Stack: ASP.NET Core 8 + PostgreSQL + React + Leaflet.js. Świadomie dobrane technologie, świadomie zaprojektowany interfejs.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-hairline md:grid-cols-3" style={{ borderColor: "hsl(var(--hairline))" }}>
          {features.map((f) => (
            <div key={f.title} className="bg-card p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gradient-soft" style={{ borderColor: "hsl(var(--hairline))" }}>
        <div className="container flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">Gotowy na pierwszą trasę?</h2>
            <p className="mt-2 text-muted-foreground">Załóż konto i zaplanuj weekend w Tatrach w 2 minuty.</p>
          </div>
          <Button size="xl" variant="hero" asChild>
            <Link to="/register">Załóż konto <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: "hsl(var(--hairline))" }}>
        <div className="container flex flex-col items-start justify-between gap-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-3"><Logo /><span>· UJ FAIS · PAI 2025/2026</span></div>
          <div>© Natalia Borsuk · Projekt zaliczeniowy</div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  { icon: MapIcon, title: "Edytor na mapie", desc: "Klikasz mapę, dodajesz punkty zainteresowania, układasz trasę. Leaflet.js pod maską." },
  { icon: Mountain, title: "Auto-statystyki", desc: "Dystans liczony wzorem Haversine'a, suma podejść z wysokości POI." },
  { icon: Download, title: "Eksport GPX", desc: "Pobierz trasę i wgraj do zegarka lub Garmina przed wyjściem w teren." },
  { icon: Share2, title: "Udostępnianie", desc: "Publiczny link do trasy lub tylko dla wybranych znajomych." },
  { icon: Compass, title: "Odkrywaj", desc: "Przeglądaj trasy społeczności, filtruj po regionie i trudności." },
  { icon: MapIcon, title: "Bez rejestracji = przegląd", desc: "Zobacz publiczne trasy bez konta. Konto potrzebne dopiero do tworzenia." },
];

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-medium tracking-tight">{n}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default Landing;
