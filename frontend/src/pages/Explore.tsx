import { AppShell } from "@/components/AppShell";
import { RouteCard } from "@/components/RouteCard";
import { mockRoutes } from "@/data/mockRoutes";

const Explore = () => {
  return (
    <AppShell>
      <div className="container max-w-7xl py-8 md:py-12">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Społeczność</div>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Odkrywaj trasy</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Publiczne trasy udostępnione przez innych podróżników. Skopiuj do siebie i dostosuj.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mockRoutes.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Explore;
