import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RouteCard } from "@/components/RouteCard";
import { routesApi } from "@/lib/api";

const PAGE_SIZE = 12;

const Explore = () => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["recent-routes"],
    queryFn: ({ pageParam }) => routesApi.recent(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });

  const routes = data?.pages.flat() ?? [];

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <AppShell>
      <div className="container max-w-7xl py-8 md:py-12">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Społeczność</div>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Odkrywaj trasy</h1>

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

        {hasNextPage && (
          <div ref={sentinelRef} className="py-10 text-center text-sm text-muted-foreground">
            {isFetchingNextPage ? "Ładowanie kolejnych tras..." : ""}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Explore;
