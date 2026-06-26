import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Heart, Mountain, Route as RouteIcon, Timer } from "lucide-react";
import type { RouteDto } from "@/lib/api";
import { routesApi } from "@/lib/api";
import type { POI } from "@/data/mockRoutes";
import { DifficultyBadge } from "./DifficultyBadge";
import { RouteMap } from "./RouteMap";

export function RouteCard({ route }: { route: RouteDto }) {
    const [liked, setLiked] = useState(route.isLikedByMe ?? false);
    const [count, setCount] = useState(route.likesCount ?? 0);

    // Mini podgląd trasy w miniaturce — dociągamy punkty trasy (ten sam klucz cache co strona szczegółów).
    const { data: detail } = useQuery({
        queryKey: ["route", route.slug],
        queryFn: () => routesApi.bySlug(route.slug),
    });

    const preview = useMemo(() => {
        const pts = detail?.points ?? [];
        return {
            path: pts.map((p): [number, number] => [p.lat, p.lng]),
            pois: pts.map((p) => ({
                kind: p.kind as POI["kind"],
                coords: [p.lat, p.lng] as [number, number],
                name: p.name ?? "",
                elevation: p.elevation,
                note: p.note,
            })),
        };
    }, [detail]);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newLiked = !liked;
        setLiked(newLiked);
        setCount((c) => c + (newLiked ? 1 : -1));
        try {
            const res = newLiked
                ? await routesApi.like(route.id)
                : await routesApi.unlike(route.id);
            setCount(res.likesCount);
        } catch {
            setLiked(!newLiked);
            setCount((c) => c + (newLiked ? -1 : 1));
        }
    };

    return (
        <Link
            to={`/app/route/${route.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
            <div className="relative h-44 overflow-hidden border-b" style={{ borderColor: "hsl(var(--hairline))" }}>
                <RouteMap route={preview} interactive={false} height="100%" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/80 to-transparent" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{route.region}</div>
                        <h3 className="mt-1 truncate font-display text-lg font-medium leading-tight">{route.title}</h3>
                    </div>
                    <DifficultyBadge difficulty={route.difficulty} />
                </div>
                <div className="grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: "hsl(var(--hairline))" }}>
                    <Stat icon={<RouteIcon className="h-3.5 w-3.5" />} value={`${route.distanceKm}`} unit="km" />
                    <Stat icon={<Mountain className="h-3.5 w-3.5" />} value={`${route.ascentM}`} unit="m ↑" />
                    <Stat icon={<Timer className="h-3.5 w-3.5" />} value={`${route.durationH}`} unit="h" />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{route.ownerUserName ?? ""}</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1 transition-colors ${liked ? "text-primary" : "hover:text-primary"}`}
                        >
                            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                            <span className="data-num">{count}</span>
                        </button>
                        <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 text-primary" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

function Stat({ icon, value, unit }: { icon: React.ReactNode; value: string; unit: string }) {
    return (
        <div className="flex flex-col items-start gap-1">
            <span className="text-muted-foreground">{icon}</span>
            <div className="flex items-baseline gap-1">
                <span className="data-num text-sm font-medium">{value}</span>
                <span className="text-[10px] text-muted-foreground">{unit}</span>
            </div>
        </div>
    );
}
