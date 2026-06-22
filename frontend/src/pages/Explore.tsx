import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RouteCard } from "@/components/RouteCard";
import { routesApi } from "@/lib/api";

const Explore = () => {
  const { data: routes = [], isLoading, isError } = useQuery({
    queryKey: ["recent-routes"],
    queryFn: routesApi.recent,
  });

  return (
    <AppShell>
      <div className="container max-w-7xl py-8 md:py-12">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Społeczność</div>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Odkrywaj trasy</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Najnowsze publiczne trasy udostępnione przez innych podróżników. Skopiuj do siebie i dostosuj.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              Ładowanie tras...
            </div>
          )}
          {isError && (
            <div className="col-span-full rounded-xl border border-dashed py-16 text-center text-sm text-destructive">
              Błąd podczas pobierania tras.
            </div>
          )}
          {!isLoading && routes.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
          {!isLoading && !isError && routes.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              Brak publicznych tras. Bądź pierwszy i udostępnij swoją!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Explore;
